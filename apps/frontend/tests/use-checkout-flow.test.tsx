import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useCheckoutFlow } from "@/app/hooks/use-checkout-flow"
import { ApiError, createCheckoutSession, createOrder } from "@/lib/api-client"
import { clearCheckoutDraft } from "@/lib/checkout-draft"
import { StorefrontUser } from "@/app/hooks/use-storefront-user"
import { CartItem, CheckoutFormData } from "@/lib/types"

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client")
  return {
    ...actual,
    createOrder: vi.fn(),
    createCheckoutSession: vi.fn()
  }
})

vi.mock("@/lib/checkout-draft", async () => {
  const actual = await vi.importActual<typeof import("@/lib/checkout-draft")>("@/lib/checkout-draft")
  return {
    ...actual,
    clearCheckoutDraft: vi.fn()
  }
})

const mockedCreateOrder = vi.mocked(createOrder)
const mockedCreateCheckoutSession = vi.mocked(createCheckoutSession)
const mockedClearCheckoutDraft = vi.mocked(clearCheckoutDraft)

const initialFormData: CheckoutFormData = {
  name: "",
  email: "",
  address: ""
}

const cartItems: CartItem[] = [
  {
    id: "001",
    name: "Remera Nexora",
    description: "Remera oficial",
    imageUrl: "/remera.png",
    price: 25,
    quantity: 1
  }
]

function renderCheckoutFlow(formData: CheckoutFormData, storefrontUser: StorefrontUser | null = null) {
  const clearCart = vi.fn()

  const hook = renderHook(() => {
    const [localFormData, setLocalFormData] = useState(formData)
    return useCheckoutFlow({
      formData: localFormData,
      setFormData: setLocalFormData,
      cartItems,
      itemsCount: cartItems.length,
      clearCart,
      initialFormData,
      storefrontUser
    })
  })

  return { ...hook, clearCart }
}

describe("useCheckoutFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, "", "/")
  })

  it("fails fast with client-side validation errors", async () => {
    const { result } = renderCheckoutFlow({
      name: "",
      email: "invalid",
      address: "short"
    })

    await act(async () => {
      await result.current.handleCheckout()
    })

    expect(result.current.checkoutStatus).toBe("error")
    expect(result.current.checkoutMessage).toBe("Ingresa un nombre valido")
    expect(mockedCreateOrder).not.toHaveBeenCalled()
    expect(mockedCreateCheckoutSession).not.toHaveBeenCalled()
  })

  it("creates order and checkout session successfully", async () => {
    mockedCreateOrder.mockResolvedValue({
      message: "Order created",
      orderId: "order-123",
      total: 25,
      status: "PENDING"
    })
    mockedCreateCheckoutSession.mockResolvedValue({
      message: "Checkout session created",
      orderId: "order-123",
      sessionId: "cs_test_123",
      // Hash-only navigation avoids jsdom navigation errors.
      sessionUrl: `${window.location.origin}/#stripe-checkout`
    })

    const { result } = renderCheckoutFlow({
      name: "Ada Lovelace",
      email: "ada@example.com",
      address: "Calle 1234"
    })

    await act(async () => {
      await result.current.handleCheckout()
    })

    expect(mockedCreateOrder).toHaveBeenCalledTimes(1)
    expect(mockedCreateCheckoutSession).toHaveBeenCalledTimes(1)
    expect(mockedClearCheckoutDraft).toHaveBeenCalledTimes(1)
    expect(result.current.checkoutStatus).toBe("success")
    expect(result.current.checkoutMessage).toContain("Sesion de pago creada")
  })

  it("keeps retry enabled when payment session fails", async () => {
    mockedCreateOrder.mockResolvedValue({
      message: "Order created",
      orderId: "order-456",
      total: 25,
      status: "PENDING"
    })
    mockedCreateCheckoutSession.mockRejectedValue(new ApiError(0, "Network error"))

    const { result } = renderCheckoutFlow({
      name: "Ada Lovelace",
      email: "ada@example.com",
      address: "Calle 1234"
    })

    await act(async () => {
      await result.current.handleCheckout()
    })

    expect(result.current.checkoutStatus).toBe("error")
    expect(result.current.canRetryCheckout).toBe(true)
    expect(result.current.checkoutMessage).toContain("No se pudo iniciar el pago")
  })

  it("blocks checkout for authenticated users without verified email", async () => {
    const { result } = renderCheckoutFlow(
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        address: "Calle 1234"
      },
      {
        email: "ada@example.com",
        name: "Ada Lovelace",
        emailVerified: false
      }
    )

    await act(async () => {
      await result.current.handleCheckout()
    })

    expect(result.current.checkoutStatus).toBe("error")
    expect(result.current.checkoutMessage).toContain("Debes verificar tu email")
    expect(mockedCreateOrder).not.toHaveBeenCalled()
  })
})
