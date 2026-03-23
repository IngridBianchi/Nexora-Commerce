"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui/card"
import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"
import Image from "next/image"
import { useCartStore } from "@/store/cart"
import { ChangeEvent, useEffect, useMemo, useState } from "react"
import { productsCatalog } from "@/lib/products"
import { normalizeCheckoutFormData, validateCheckoutData } from "@/lib/checkout-validation"
import { CheckoutFormData, Product } from "@/lib/types"
import { ApiError, createOrder, getProducts } from "@/lib/api-client"

const initialFormData: CheckoutFormData = {
  name: "",
  email: "",
  address: ""
}

type CheckoutNotice = {
  type: "success" | "error" | "info"
  message: string
} | null

export default function Home() {
  const cartItems = useCartStore((state) => state.items)
  const addItem = useCartStore((state) => state.addItem)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clearCart)
  const getTotal = useCartStore((state) => state.getTotal)
  const getItemsCount = useCartStore((state) => state.getItemsCount)

  const total = getTotal()
  const itemsCount = getItemsCount()

  const [products, setProducts] = useState<Product[]>(productsCatalog)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState<CheckoutFormData>(initialFormData)
  const [checkoutNotice, setCheckoutNotice] = useState<CheckoutNotice>(null)

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

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) {
      return products
    }

    return products.filter((product) =>
      `${product.name} ${product.description}`.toLowerCase().includes(term)
    )
  }, [products, searchTerm])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    if (checkoutNotice) {
      setCheckoutNotice(null)
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckout = async () => {
    const normalizedFormData = normalizeCheckoutFormData(formData)
    const validationError = validateCheckoutData(normalizedFormData, itemsCount)
    if (validationError) {
      setCheckoutNotice({ type: "error", message: validationError })
      return
    }

    setCheckoutNotice(null)
    setIsSubmittingOrder(true)
    try {
      const response = await createOrder({
        name: normalizedFormData.name,
        email: normalizedFormData.email,
        address: normalizedFormData.address,
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity
        }))
      })

      setCheckoutNotice({
        type: "success",
        message: `Orden ${response.orderId} creada con exito. Total: $${response.total.toFixed(2)}`
      })
      clearCart()
      setFormData(initialFormData)
    } catch (error) {
      if (error instanceof ApiError) {
        const message =
          error.status > 0
            ? `No se pudo crear la orden (${error.status}): ${error.message}`
            : "No se pudo crear la orden por error de red"
        setCheckoutNotice({ type: "error", message })
      } else {
        setCheckoutNotice({
          type: "error",
          message: "No se pudo crear la orden. Intenta nuevamente en unos segundos."
        })
      }
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold text-blue-600 mb-6">
        Nexora Commerce
      </h1>

      <div className="mb-6 border p-4 rounded bg-gray-50">
        <h2 className="text-xl font-semibold mb-2">
          Carrito ({itemsCount} items)
        </h2>

        {cartItems.length === 0 ? (
          <p className="text-gray-600">Tu carrito esta vacio</p>
        ) : (
          <>
            <ul className="space-y-2">
              {cartItems.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <span>
                    {item.name} x{item.quantity} - ${
                      (item.price * item.quantity).toFixed(2)
                    }
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                  >
                    Quitar
                  </Button>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-bold text-blue-600">
              Total: ${total.toFixed(2)}
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={clearCart}>
                Limpiar carrito
              </Button>
            </div>
          </>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="mb-6 border p-4 rounded bg-white shadow">
          <h2 className="text-xl font-semibold mb-4">Finalizar compra</h2>

          {checkoutNotice && (
            <div
              className={`mb-4 rounded border px-3 py-2 text-sm ${
                checkoutNotice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : checkoutNotice.type === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
              role={checkoutNotice.type === "error" ? "alert" : "status"}
            >
              {checkoutNotice.message}
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
              {isSubmittingOrder ? "Procesando..." : "Confirmar compra"}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-6 flex gap-4">
        <Input
          placeholder="Buscar productos..."
          className="w-1/3"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <Button disabled>Filtro en vivo</Button>
      </div>

      {productsError && (
        <p className="mb-6 text-amber-700">{productsError}</p>
      )}

      {isLoadingProducts && (
        <p className="mb-6 text-gray-600">Cargando productos desde backend...</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
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
              <Button
                className="mt-4 w-full"
                onClick={() => addItem(product)}
              >
                Agregar al carrito
              </Button>
            </CardContent>
          </Card>
        ))}

        {filteredProducts.length === 0 && !isLoadingProducts && (
          <p className="text-gray-600">No se encontraron productos</p>
        )}
      </div>
    </main>
  )
}