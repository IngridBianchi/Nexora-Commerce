"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui/card"
import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"
import Image from "next/image"
import { rehydrateCartStore, useCartStore } from "@/store/cart"
import { ChangeEvent, useEffect, useMemo, useState } from "react"
import { productsCatalog } from "@/lib/products"
import { normalizeCheckoutFormData, validateCheckoutData } from "@/lib/checkout-validation"
import { CheckoutFormData, OrderRequest, Product } from "@/lib/types"
import { ApiError, createOrder, getProducts } from "@/lib/api-client"
import { filterProducts, getProductCategories, resolveProductCategory } from "@/lib/catalog-filters"
import {
  clearCheckoutDraft,
  isCheckoutDraftEmpty,
  loadCheckoutDraft,
  saveCheckoutDraft
} from "@/lib/checkout-draft"

const initialFormData: CheckoutFormData = {
  name: "",
  email: "",
  address: ""
}

type CheckoutStatus = "idle" | "loading" | "success" | "error"

export default function Home() {
  const cartItems = useCartStore((state) => state.items)
  const addItem = useCartStore((state) => state.addItem)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clearCart)
  const getTotal = useCartStore((state) => state.getTotal)
  const getItemsCount = useCartStore((state) => state.getItemsCount)
  const hasHydratedCart = useCartStore((state) => state.hasHydrated)

  const total = getTotal()
  const itemsCount = getItemsCount()

  const [products, setProducts] = useState<Product[]>(productsCatalog)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [minPriceInput, setMinPriceInput] = useState("")
  const [maxPriceInput, setMaxPriceInput] = useState("")
  const [includeOutOfStock, setIncludeOutOfStock] = useState(false)
  const [formData, setFormData] = useState<CheckoutFormData>(initialFormData)
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>("idle")
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const [draftRestoredNotice, setDraftRestoredNotice] = useState<string | null>(null)
  const [lastCheckoutPayload, setLastCheckoutPayload] = useState<OrderRequest | null>(null)

  const isSubmittingOrder = checkoutStatus === "loading"

  useEffect(() => {
    void rehydrateCartStore()

    const draft = loadCheckoutDraft()
    if (!draft) {
      return
    }

    setFormData(draft)
    setDraftRestoredNotice("Se restauro un borrador del checkout guardado en este navegador.")
  }, [])

  useEffect(() => {
    const normalized = normalizeCheckoutFormData(formData)
    if (isCheckoutDraftEmpty(normalized)) {
      clearCheckoutDraft()
      return
    }

    saveCheckoutDraft(normalized)
  }, [formData])

  useEffect(() => {
    let isMounted = true

    async function loadProducts() {
      try {
        const remoteProducts = await getProducts()
        if (!isMounted) {
          return
        }

        setProducts(remoteProducts)
        setProductsError(
          remoteProducts.length === 0
            ? "El catalogo remoto esta vacio"
            : null
        )
      } catch (error) {
        if (!isMounted) {
          return
        }

        setProducts(productsCatalog)

        if (error instanceof ApiError) {
          if (error.status === 408 || error.status === 0) {
            setProductsError("No se pudo conectar con el backend, se usa el catalogo local")
          } else {
            setProductsError(`Backend respondio error ${error.status}, se usa el catalogo local`)
          }
        } else {
          setProductsError("No se pudo cargar el catalogo remoto, se usa el catalogo local")
        }
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false)
        }
      }
    }

    void loadProducts()

    return () => {
      isMounted = false
    }
  }, [])

  const minPrice = useMemo(() => {
    if (!minPriceInput.trim()) {
      return null
    }

    const value = Number(minPriceInput)
    if (!Number.isFinite(value) || value < 0) {
      return null
    }

    return value
  }, [minPriceInput])

  const maxPrice = useMemo(() => {
    if (!maxPriceInput.trim()) {
      return null
    }

    const value = Number(maxPriceInput)
    if (!Number.isFinite(value) || value < 0) {
      return null
    }

    return value
  }, [maxPriceInput])

  const availableCategories = useMemo(() => getProductCategories(products), [products])

  const filteredProducts = useMemo(
    () =>
      filterProducts(products, {
        searchTerm,
        category: selectedCategory,
        minPrice,
        maxPrice,
        includeOutOfStock
      }),
    [products, searchTerm, selectedCategory, minPrice, maxPrice, includeOutOfStock]
  )

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    selectedCategory !== "all" ||
    minPriceInput.trim().length > 0 ||
    maxPriceInput.trim().length > 0 ||
    includeOutOfStock

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setDraftRestoredNotice(null)
    if (checkoutStatus !== "idle") {
      setCheckoutStatus("idle")
      setCheckoutMessage(null)
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const submitCheckout = async (
    payload: OrderRequest,
    options?: { isRetry?: boolean }
  ) => {
    setCheckoutStatus("loading")
    setCheckoutMessage(
      options?.isRetry
        ? "Reintentando crear la orden..."
        : "Procesando tu compra..."
    )

    try {
      const response = await createOrder(payload)

      setCheckoutStatus("success")
      setCheckoutMessage(`Orden ${response.orderId} creada con exito. Total: $${response.total.toFixed(2)}`)
      clearCart()
      clearCheckoutDraft()
      setLastCheckoutPayload(null)
      setFormData(initialFormData)
    } catch (error) {
      if (error instanceof ApiError) {
        const message =
          error.status > 0
            ? `No se pudo crear la orden (${error.status}): ${error.message}`
            : "No se pudo crear la orden por error de red"
        setCheckoutStatus("error")
        setCheckoutMessage(`${message}. Puedes reintentar.`)
      } else {
        setCheckoutStatus("error")
        setCheckoutMessage("No se pudo crear la orden. Intenta nuevamente en unos segundos.")
      }
    }
  }

  const handleCheckout = async () => {
    const normalizedFormData = normalizeCheckoutFormData(formData)
    const validationError = validateCheckoutData(normalizedFormData, itemsCount)
    if (validationError) {
      setCheckoutStatus("error")
      setCheckoutMessage(validationError)
      return
    }

    const payload: OrderRequest = {
      name: normalizedFormData.name,
      email: normalizedFormData.email,
      address: normalizedFormData.address,
      items: cartItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity
      }))
    }

    setLastCheckoutPayload(payload)
    await submitCheckout(payload)
  }

  const handleRetryCheckout = async () => {
    if (!lastCheckoutPayload || isSubmittingOrder) {
      return
    }

    await submitCheckout(lastCheckoutPayload, { isRetry: true })
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedCategory("all")
    setMinPriceInput("")
    setMaxPriceInput("")
    setIncludeOutOfStock(false)
  }

  return (
    <main className="min-h-screen p-6 lg:p-8">
      <h1 className="mb-8 text-4xl font-bold text-blue-600">
        Nexora Commerce
      </h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:items-start">

        {/* LEFT: catalog — filters + product grid */}
        <div className="flex flex-col gap-6">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Filtro en vivo</h2>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>Limpiar filtros</Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <Input
                placeholder="Buscar por nombre o descripcion"
                className="md:col-span-2"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                <option value="all">Todas las categorias</option>
                {availableCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="Precio minimo"
                value={minPriceInput}
                onChange={(event) => setMinPriceInput(event.target.value)}
              />

              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="Precio maximo"
                value={maxPriceInput}
                onChange={(event) => setMaxPriceInput(event.target.value)}
              />
            </div>

            <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includeOutOfStock}
                onChange={(event) => setIncludeOutOfStock(event.target.checked)}
              />
              Incluir productos agotados
            </label>
          </section>

          {productsError && (
            <p className="text-amber-700">{productsError}</p>
          )}

          {isLoadingProducts && (
            <p className="text-gray-600">Cargando productos desde backend...</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle>{product.name}</CardTitle>
                    {typeof product.stock === "number" && product.stock <= 0 ? (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        Agotado
                      </span>
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {resolveProductCategory(product)}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    width={300}
                    height={200}
                    className="w-full h-40 object-cover rounded mb-4"
                  />
                  <p className="text-gray-600">{product.description}</p>
                  <p className="text-blue-600 font-semibold mt-2">${product.price}</p>

                  {typeof product.stock === "number" && (
                    <p className="mt-1 text-xs text-slate-500">
                      {product.stock > 0 ? `Stock disponible: ${product.stock}` : "Sin stock disponible"}
                    </p>
                  )}

                  {(() => {
                    const itemInCart = cartItems.find((item) => item.id === product.id)
                    const inCartQuantity = itemInCart?.quantity ?? 0
                    const stock = typeof product.stock === "number" ? product.stock : null
                    const isOutOfStock = stock !== null && stock <= 0
                    const reachedStockLimit = stock !== null && stock > 0 && inCartQuantity >= stock
                    const disabled = isOutOfStock || reachedStockLimit
                    const buttonText = isOutOfStock
                      ? "Sin stock"
                      : reachedStockLimit
                        ? "Stock maximo en carrito"
                        : "Agregar al carrito"

                    return (
                      <Button
                        className="mt-4 w-full"
                        onClick={() => addItem(product)}
                        disabled={disabled}
                      >
                        {buttonText}
                      </Button>
                    )
                  })()}
                </CardContent>
              </Card>
            ))}

            {filteredProducts.length === 0 && !isLoadingProducts && (
              <p className="text-gray-600">No se encontraron productos</p>
            )}
          </div>
        </div>

        {/* RIGHT: cart + checkout — sticky on desktop */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-8">
          <section className="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Carrito</h2>
                <p className="text-sm text-slate-500">Resumen de tu seleccion</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  {hasHydratedCart ? itemsCount : 0} items
                </span>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  ${hasHydratedCart ? total.toFixed(2) : "0.00"}
                </span>
              </div>
            </div>

            {!hasHydratedCart ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                Restaurando carrito...
              </div>
            ) : cartItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm font-medium text-slate-700">Tu carrito esta vacio</p>
                <p className="mt-1 text-xs text-slate-500">Agrega productos para comenzar el checkout.</p>
              </div>
            ) : (
              <>
                <ul className="space-y-2">
                  {cartItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.quantity} x ${item.price.toFixed(2)}
                        </p>
                      </div>

                      <div className="ml-3 flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          Quitar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <p className="text-sm text-slate-600">Total estimado</p>
                  <p className="text-lg font-semibold text-slate-900">${total.toFixed(2)}</p>
                </div>

                <div className="mt-3 flex justify-end">
                  <Button variant="outline" onClick={clearCart}>
                    Limpiar carrito
                  </Button>
                </div>
              </>
            )}
          </section>

          {cartItems.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Finalizar compra</h2>

              {draftRestoredNotice && (
                <p className="mb-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {draftRestoredNotice}
                </p>
              )}

              {checkoutStatus !== "idle" && checkoutMessage && (
                <div
                  className={`mb-4 rounded border px-3 py-2 text-sm ${
                    checkoutStatus === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : checkoutStatus === "error"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-blue-200 bg-blue-50 text-blue-800"
                  }`}
                  role={checkoutStatus === "error" ? "alert" : "status"}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span>{checkoutMessage}</span>
                    {checkoutStatus === "loading" && (
                      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-blue-700">
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        Enviando
                      </span>
                    )}
                  </div>

                  {checkoutStatus === "error" && lastCheckoutPayload && (
                    <div className="mt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleRetryCheckout}
                        disabled={isSubmittingOrder}
                      >
                        Reintentar compra
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <Input
                  name="name"
                  placeholder="Nombre completo"
                  value={formData.name}
                  onChange={handleChange}
                  minLength={2}
                />
                <Input
                  name="email"
                  type="email"
                  placeholder="Correo electronico"
                  value={formData.email}
                  onChange={handleChange}
                />
                <Input
                  name="address"
                  placeholder="Direccion de envio"
                  value={formData.address}
                  onChange={handleChange}
                  minLength={8}
                />
                <Button className="w-full" onClick={handleCheckout} disabled={isSubmittingOrder}>
                  {isSubmittingOrder ? "Procesando compra..." : "Confirmar compra"}
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}