import Image from "next/image"
import { Button } from "@repo/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card"
import { resolveProductCategory } from "@/lib/catalog-filters"
import { CartItem, Product } from "@/lib/types"

type ProductGridSectionProps = {
  productsError: string | null
  isLoadingProducts: boolean
  filteredProducts: Product[]
  cartItems: CartItem[]
  onAddItem: (product: Product) => void
}

export function ProductGridSection({
  productsError,
  isLoadingProducts,
  filteredProducts,
  cartItems,
  onAddItem
}: ProductGridSectionProps) {
  return (
    <>
      {productsError && (
        <p className="text-amber-700">{productsError}</p>
      )}

      {isLoadingProducts && (
        <p className="text-gray-600">Cargando productos desde backend...</p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {filteredProducts.map((product) => {
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

          const isFirst = filteredProducts.indexOf(product) === 0

          return (
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
                <div className="relative mb-4 h-40 w-full">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    loading={isFirst ? "eager" : "lazy"}
                    className="rounded object-cover"
                  />
                </div>
                <p className="text-gray-600">{product.description}</p>
                <p className="mt-2 font-semibold text-blue-600">${product.price}</p>

                {typeof product.stock === "number" && (
                  <p className="mt-1 text-xs text-slate-500">
                    {product.stock > 0 ? `Stock disponible: ${product.stock}` : "Sin stock disponible"}
                  </p>
                )}

                <Button
                  className="mt-4 w-full"
                  onClick={() => onAddItem(product)}
                  disabled={disabled}
                >
                  {buttonText}
                </Button>
              </CardContent>
            </Card>
          )
        })}

        {filteredProducts.length === 0 && !isLoadingProducts && (
          <p className="text-gray-600">No se encontraron productos</p>
        )}
      </div>
    </>
  )
}
