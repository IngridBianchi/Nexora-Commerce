import { ShoppingCart } from "lucide-react"
import { Button } from "@repo/ui/button"
import { CartItem } from "@/lib/types"

type CartPanelProps = {
  hasHydratedCart: boolean
  itemsCount: number
  total: number
  cartItems: CartItem[]
  onRemoveItem: (id: string) => void
  onClearCart: () => void
}

export function CartPanel({
  hasHydratedCart,
  itemsCount,
  total,
  cartItems,
  onRemoveItem,
  onClearCart
}: CartPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ShoppingCart className="h-5 w-5 text-slate-700" />
            Carrito
          </h2>
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
                    onClick={() => onRemoveItem(item.id)}
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
            <Button variant="outline" onClick={onClearCart}>
              Limpiar carrito
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
