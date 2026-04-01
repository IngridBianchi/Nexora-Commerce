import { APIGatewayProxyHandler } from "aws-lambda"
import Stripe from "stripe"
import { env } from "../config/env"
import { validateCreateCheckoutSessionInput } from "../application/validators/checkout-validator"
import { badRequest, created, internalServerError, parseJsonBody, unprocessableEntity } from "../shared/http"
import { emitMetric, logError, logInfo } from "../shared/observability"

interface CheckoutGatewayInput {
  orderId: string
  idempotencyKey: string
  successUrl: string
  cancelUrl: string
  email?: string
  items: Array<{
    name: string
    unitPrice: number
    quantity: number
  }>
}

interface CheckoutGateway {
  createSession(input: CheckoutGatewayInput): Promise<{ sessionId: string; sessionUrl: string }>
}

function readIdempotencyKey(headers: Record<string, string | undefined>): string | null {
  const rawValue = headers["idempotency-key"] ?? headers["Idempotency-Key"]
  if (!rawValue) {
    return null
  }

  const value = rawValue.trim()
  if (value.length < 8 || value.length > 255) {
    return null
  }

  return value
}

class StripeCheckoutGateway implements CheckoutGateway {
  private readonly client: Stripe

  constructor(secretKey: string) {
    this.client = new Stripe(secretKey)
  }

  async createSession(input: CheckoutGatewayInput): Promise<{ sessionId: string; sessionUrl: string }> {
    const session = await this.client.checkout.sessions.create({
      mode: "payment",
      customer_email: input.email,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        orderId: input.orderId
      },
      line_items: input.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(item.unitPrice * 100),
          product_data: {
            name: item.name
          }
        }
      }))
    }, {
      idempotencyKey: input.idempotencyKey
    })

    if (!session.url) {
      throw new Error("Stripe session did not return URL")
    }

    return {
      sessionId: session.id,
      sessionUrl: session.url
    }
  }
}

export function buildCreateCheckoutSessionHandler(dependencies?: {
  checkoutGateway?: CheckoutGateway
  allowedOrigin?: string
}): APIGatewayProxyHandler {
  const allowedOrigin = dependencies?.allowedOrigin ?? env.allowedOrigin

  return async (event) => {
    const idempotencyKey = readIdempotencyKey(event.headers as Record<string, string | undefined>)
    if (!idempotencyKey) {
      return badRequest("Missing or invalid Idempotency-Key header", allowedOrigin)
    }

    const bodyResult = parseJsonBody<unknown>(event.body)
    if (!bodyResult.success) {
      return badRequest(bodyResult.error, allowedOrigin)
    }

    const inputResult = validateCreateCheckoutSessionInput(bodyResult.data)
    if (!inputResult.success) {
      return unprocessableEntity(inputResult.error, allowedOrigin)
    }

    const checkoutGateway =
      dependencies?.checkoutGateway ??
      (() => {
        if (!env.stripeSecretKey) {
          return null
        }

        return new StripeCheckoutGateway(env.stripeSecretKey)
      })()

    if (!checkoutGateway) {
      emitMetric("CheckoutSessionsCreated", 1, {
        Function: "createCheckoutSession",
        Status: "Error"
      })
      emitMetric("BackendErrors", 1, {
        Function: "createCheckoutSession"
      })
      logError("createCheckoutSession missing Stripe configuration", {
        requestId: event.requestContext?.requestId
      })
      return internalServerError(allowedOrigin)
    }

    try {
      const session = await checkoutGateway.createSession({
        ...inputResult.value,
        idempotencyKey
      })
      emitMetric("CheckoutSessionsCreated", 1, {
        Function: "createCheckoutSession",
        Status: "Success"
      })
      logInfo("Stripe checkout session created", {
        requestId: event.requestContext?.requestId,
        orderId: inputResult.value.orderId,
        sessionId: session.sessionId,
        idempotencyKey
      })
      return created(
        {
          message: "Checkout session created successfully",
          orderId: inputResult.value.orderId,
          sessionId: session.sessionId,
          sessionUrl: session.sessionUrl
        },
        allowedOrigin
      )
    } catch (error) {
      emitMetric("CheckoutSessionsCreated", 1, {
        Function: "createCheckoutSession",
        Status: "Error"
      })
      emitMetric("BackendErrors", 1, {
        Function: "createCheckoutSession"
      })
      logError("createCheckoutSession failed", {
        requestId: event.requestContext?.requestId,
        message: error instanceof Error ? error.message : "Unknown error"
      })
      return internalServerError(allowedOrigin)
    }
  }
}

export const createCheckoutSessionHandler = buildCreateCheckoutSessionHandler()
