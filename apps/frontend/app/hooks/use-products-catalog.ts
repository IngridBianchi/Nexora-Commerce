import { useEffect, useState } from "react"
import { ApiError, getProducts } from "@/lib/api-client"
import { productsCatalog } from "@/lib/products"
import { Product } from "@/lib/types"

export function useProductsCatalog() {
  const [products, setProducts] = useState<Product[]>(productsCatalog)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadProducts() {
      try {
        const remoteProducts = await getProducts()
        if (!isMounted) {
          return
        }

        setProducts(remoteProducts)
        setProductsError(remoteProducts.length === 0 ? "El catalogo remoto esta vacio" : null)
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

  return {
    products,
    productsError,
    isLoadingProducts
  }
}
