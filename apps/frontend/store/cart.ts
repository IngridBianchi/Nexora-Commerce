import { create } from "zustand"
import { CartItem, Product } from "@/lib/types"

interface CartState {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (id: string) => void
  clearCart: () => void
  getTotal: () => number
  getItemsCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (product) =>
    set((state) => {
      const existingItem = state.items.find((item) => item.id === product.id)
      if (!existingItem) {
        return {
          items: [...state.items, { ...product, quantity: 1 }]
        }
      }

      return {
        items: state.items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
    }),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((p) => p.id !== id) })),
  clearCart: () => set({ items: [] }),
  getTotal: () =>
    get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  getItemsCount: () =>
    get().items.reduce((sum, item) => sum + item.quantity, 0)
}))