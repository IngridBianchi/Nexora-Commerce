"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useCartStore } from "@/store/cart"
import { ChangeEvent, useEffect, useMemo, useState } from "react"
import { productsCatalog } from "@/lib/products"
import { validateCheckoutData } from "@/lib/checkout-validation"
import { CheckoutFormData, Product } from "@/lib/types"
import { createOrder, getProducts } from "@/lib/api-client"

const initialFormData: CheckoutFormData = {
  name: "",
  email: "",
  address: ""
}

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

  useEffect(() => {
    let isMounted = true

    async function loadProducts() {
      try {
        const remoteProducts = await getProducts()
        if (!isMounted) {
          return
        }

        if (remoteProducts.length > 0) {
          setProducts(remoteProducts)
          setProductsError(null)
        } else {
          setProductsError("El backend no devolvio productos, se usa el catalogo local")
        }
      } catch {
        if (!isMounted) {
          return
        }

        setProductsError("No se pudo conectar con el backend, se usa el catalogo local")
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
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckout = async () => {
    const validationError = validateCheckoutData(formData, itemsCount)
    if (validationError) {
      alert(validationError)
      return
    }

    setIsSubmittingOrder(true)
    try {
      const response = await createOrder({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        address: formData.address.trim(),
        items: cartItems.map((item) => ({
          productId: item.id,
          name: item.name,
          unitPrice: item.price,
          quantity: item.quantity
        }))
      })

      alert(
        `Orden ${response.orderId} creada para ${formData.name.trim()}.\nTotal: $${response.total.toFixed(
          2
        )}`
      )
      clearCart()
      setFormData(initialFormData)
    } catch {
      alert("No se pudo crear la orden. Intenta nuevamente en unos segundos.")
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