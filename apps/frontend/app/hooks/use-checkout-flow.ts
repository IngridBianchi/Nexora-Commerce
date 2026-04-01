import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react"
import { clearCheckoutDraft } from "@/lib/checkout-draft"
import { normalizeCheckoutFormData, validateCheckoutData } from "@/lib/checkout-validation"
import { ApiError, createCheckoutSession, createOrder } from "@/lib/api-client"
import { CartItem, CheckoutFormData, CheckoutSessionRequest, OrderRequest } from "@/lib/types"
import { StorefrontUser } from "@/app/hooks/use-storefront-user"

export type CheckoutStatus = "idle" | "loading" | "success" | "error"

type UseCheckoutFlowOptions = {
  formData: CheckoutFormData
  setFormData: Dispatch<SetStateAction<CheckoutFormData>>
  cartItems: CartItem[]
  itemsCount: number
  clearCart: () => void
  initialFormData: CheckoutFormData
  storefrontUser?: StorefrontUser | null
}

export function useCheckoutFlow({
  formData,
  setFormData,
  cartItems,
  itemsCount,
  clearCart,
  initialFormData,
  storefrontUser
}: UseCheckoutFlowOptions) {
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>("idle")
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const [lastCheckoutPayload, setLastCheckoutPayload] = useState<OrderRequest | null>(null)
  const [lastPaymentAttempt, setLastPaymentAttempt] = useState<{
    payload: CheckoutSessionRequest
    idempotencyKey: string
  } | null>(null)

  const isSubmittingOrder = checkoutStatus === "loading"

  useEffect(() => {
    const url = new URL(window.location.href)
    const checkoutResult = url.searchParams.get("checkout")
    const orderId = url.searchParams.get("orderId")

    if (checkoutResult === "success") {
      setCheckoutStatus("success")
      setCheckoutMessage(
        orderId
          ? `Pago confirmado para la orden ${orderId}. Gracias por tu compra.`
          : "Pago confirmado. Gracias por tu compra."
      )
      clearCheckoutDraft()
      clearCart()
      setFormData(initialFormData)
      setLastCheckoutPayload(null)
      setLastPaymentAttempt(null)
    }

    if (checkoutResult === "cancelled") {
      setCheckoutStatus("error")
      setCheckoutMessage(
        orderId
          ? `El pago de la orden ${orderId} fue cancelado. Puedes reintentar.`
          : "El pago fue cancelado. Puedes reintentar."
      )
    }

    if (checkoutResult === "success" || checkoutResult === "cancelled") {
      url.searchParams.delete("checkout")
      url.searchParams.delete("orderId")
      const nextUrl = `${url.pathname}${url.search}${url.hash}`
      window.history.replaceState({}, "", nextUrl)
    }
  }, [clearCart, initialFormData, setFormData])

  const startStripeCheckout = useCallback(
    async (
      payload: CheckoutSessionRequest,
      idempotencyKey: string,
      options?: { isRetry?: boolean }
    ) => {
      setCheckoutStatus("loading")
      setCheckoutMessage(
        options?.isRetry ? "Reintentando iniciar el pago..." : "Redirigiendo al checkout seguro..."
      )

      try {
        const response = await createCheckoutSession(payload, idempotencyKey)
        setCheckoutStatus("success")
        setCheckoutMessage("Sesion de pago creada. Redirigiendo a Stripe...")
        clearCheckoutDraft()
        window.location.href = response.sessionUrl
      } catch (error) {
        if (error instanceof ApiError) {
          const message =
            error.status > 0
              ? `No se pudo iniciar el pago (${error.status}): ${error.message}`
              : "No se pudo iniciar el pago por error de red"
          setCheckoutStatus("error")
          setCheckoutMessage(`${message}. Puedes reintentar.`)
        } else {
          setCheckoutStatus("error")
          setCheckoutMessage("No se pudo iniciar el pago. Intenta nuevamente en unos segundos.")
        }
      }
    },
    []
  )

  const submitCheckout = useCallback(
    async (payload: OrderRequest, options?: { isRetry?: boolean }) => {
      setCheckoutStatus("loading")
      setCheckoutMessage(options?.isRetry ? "Reintentando crear la orden..." : "Procesando tu compra...")

      try {
        const order = await createOrder(payload)
        const origin = window.location.origin
        const paymentPayload: CheckoutSessionRequest = {
          orderId: order.orderId,
          email: payload.email,
          successUrl: `${origin}/?checkout=success&orderId=${encodeURIComponent(order.orderId)}`,
          cancelUrl: `${origin}/?checkout=cancelled&orderId=${encodeURIComponent(order.orderId)}`,
          items: cartItems.map((item) => ({
            name: item.name,
            unitPrice: item.price,
            quantity: item.quantity
          }))
        }
        const idempotencyKey = `checkout-${order.orderId}`

        setLastCheckoutPayload(null)
        setLastPaymentAttempt({
          payload: paymentPayload,
          idempotencyKey
        })

        await startStripeCheckout(paymentPayload, idempotencyKey)
      } catch (error) {
        setLastPaymentAttempt(null)
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
    },
    [cartItems, startStripeCheckout]
  )

  const handleCheckout = useCallback(async () => {
    if (storefrontUser && !storefrontUser.emailVerified) {
      setCheckoutStatus("error")
      setCheckoutMessage("Debes verificar tu email antes de continuar con el checkout desde una cuenta autenticada.")
      return
    }

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
    setLastPaymentAttempt(null)
    await submitCheckout(payload)
  }, [formData, itemsCount, cartItems, storefrontUser, submitCheckout])

  const handleRetryCheckout = useCallback(async () => {
    if (isSubmittingOrder) {
      return
    }

    if (lastPaymentAttempt) {
      await startStripeCheckout(lastPaymentAttempt.payload, lastPaymentAttempt.idempotencyKey, {
        isRetry: true
      })
      return
    }

    if (!lastCheckoutPayload) {
      return
    }

    await submitCheckout(lastCheckoutPayload, { isRetry: true })
  }, [isSubmittingOrder, lastPaymentAttempt, lastCheckoutPayload, startStripeCheckout, submitCheckout])

  const resetCheckoutFeedback = useCallback(() => {
    if (checkoutStatus !== "idle") {
      setCheckoutStatus("idle")
      setCheckoutMessage(null)
    }
  }, [checkoutStatus])

  return {
    checkoutStatus,
    checkoutMessage,
    isSubmittingOrder,
    canRetryCheckout: !!lastCheckoutPayload || !!lastPaymentAttempt,
    handleCheckout,
    handleRetryCheckout,
    resetCheckoutFeedback
  }
}
