import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { CartItem, Product } from "@/lib/types"

interface CartState {
  items: CartItem[]
  hasHydrated: boolean
  setHasHydrated: (value: boolean) => void
  addItem: (product: Product) => void
  removeItem: (id: string) => void
  clearCart: () => void
  getTotal: () => number
  getItemsCount: () => number
}

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<CartItem>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.imageUrl === "string" &&
    typeof candidate.price === "number" &&
    Number.isFinite(candidate.price) &&
    typeof candidate.quantity === "number" &&
    Number.isInteger(candidate.quantity) &&
    candidate.quantity > 0
  )
}

function sanitizePersistedItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isValidCartItem)
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
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
    }),
    {
      name: "nexora-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      skipHydration: true,
      merge: (persistedState, currentState) => {
        const typedPersistedState = persistedState as Partial<{ items: unknown }>
        return {
          ...currentState,
          items: sanitizePersistedItems(typedPersistedState.items)
        }
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      }
    }
  )
)

export async function rehydrateCartStore(): Promise<void> {
  await useCartStore.persist.rehydrate()
}