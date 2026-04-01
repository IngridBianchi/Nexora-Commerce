import { APIGatewayProxyHandler } from "aws-lambda"
import Stripe from "stripe"
import { OrderStatus } from "../domain/order"
import { OrderStatusUpdater } from "../application/ports/order-status-updater"
import { env } from "../config/env"
import { DynamoDbOrderRepository } from "../infra/repositories/dynamodb-order-repository"
import { badRequest, internalServerError, ok } from "../shared/http"
import { emitMetric, logError, logInfo } from "../shared/observability"

interface StripeWebhookEvent {
  type: string
  data: {
    object: {
      metadata?: Record<string, string | undefined>
    }
  }
}

interface StripeWebhookVerifier {
  parseEvent(rawBody: string, signature: string): StripeWebhookEvent
}

class StripeSdkWebhookVerifier implements StripeWebhookVerifier {
  private readonly client: Stripe

  constructor(secretKey: string, private readonly webhookSecret: string) {
    this.client = new Stripe(secretKey)
  }

  parseEvent(rawBody: string, signature: string): StripeWebhookEvent {
    return this.client.webhooks.constructEvent(rawBody, signature, this.webhookSecret) as unknown as StripeWebhookEvent
  }
}

function readStripeSignature(headers: Record<string, string | undefined>): string | null {
  const signature = headers["stripe-signature"] ?? headers["Stripe-Signature"]
  if (!signature) {
    return null
  }

  const normalized = signature.trim()
  return normalized.length > 0 ? normalized : null
}

function decodeRawBody(eventBody: string, isBase64Encoded: boolean): string {
  if (!isBase64Encoded) {
    return eventBody
  }

  return Buffer.from(eventBody, "base64").toString("utf-8")
}

const ORDER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/

function isValidOrderId(orderId: string): boolean {
  return ORDER_ID_PATTERN.test(orderId)
}

function resolveTargetStatus(eventType: string): OrderStatus | null {
  if (eventType === "checkout.session.completed") {
    return "PAID"
  }

  if (eventType === "checkout.session.expired") {
    return "CANCELLED"
  }

  return null
}

export function buildStripeWebhookHandler(dependencies?: {
  verifier?: StripeWebhookVerifier
  orderStatusUpdater?: OrderStatusUpdater
  allowedOrigin?: string
}): APIGatewayProxyHandler {
  const allowedOrigin = dependencies?.allowedOrigin ?? env.allowedOrigin
  const orderStatusUpdater =
    dependencies?.orderStatusUpdater ??
    new DynamoDbOrderRepository(env.ordersTable, env.productsTable)

  return async (event) => {
    if (!event.body) {
      return badRequest("Request body is required", allowedOrigin)
    }

    const signature = readStripeSignature(event.headers as Record<string, string | undefined>)
    if (!signature) {
      return badRequest("Missing Stripe signature", allowedOrigin)
    }

    const verifier =
      dependencies?.verifier ??
      (() => {
        if (!env.stripeSecretKey || !env.stripeWebhookSecret) {
          return null
        }

        return new StripeSdkWebhookVerifier(env.stripeSecretKey, env.stripeWebhookSecret)
      })()

    if (!verifier) {
      emitMetric("StripeWebhooksHandled", 1, {
        Function: "stripeWebhook",
        Status: "Error"
      })
      emitMetric("BackendErrors", 1, {
        Function: "stripeWebhook"
      })
      logError("stripeWebhook missing Stripe configuration", {
        requestId: event.requestContext?.requestId
      })
      return internalServerError(allowedOrigin)
    }

    let stripeEvent: StripeWebhookEvent

    try {
      const rawBody = decodeRawBody(event.body, event.isBase64Encoded)
      stripeEvent = verifier.parseEvent(rawBody, signature)
    } catch (error) {
      emitMetric("StripeWebhooksHandled", 1, {
        Function: "stripeWebhook",
        Status: "InvalidSignature"
      })
      logError("stripeWebhook signature verification failed", {
        requestId: event.requestContext?.requestId,
        message: error instanceof Error ? error.message : "Unknown error"
      })
      return badRequest("Invalid Stripe signature", allowedOrigin)
    }

    const targetStatus = resolveTargetStatus(stripeEvent.type)
    if (!targetStatus) {
      emitMetric("StripeWebhooksHandled", 1, {
        Function: "stripeWebhook",
        Status: "Ignored"
      })
      return ok({ message: "Event ignored" }, allowedOrigin)
    }

    const orderId = stripeEvent.data.object.metadata?.orderId
    if (!orderId || !isValidOrderId(orderId)) {
      emitMetric("StripeWebhooksHandled", 1, {
        Function: "stripeWebhook",
        Status: "Ignored"
      })
      logInfo("stripeWebhook ignored event with missing or invalid orderId", {
        requestId: event.requestContext?.requestId,
        eventType: stripeEvent.type
      })
      return ok({ message: "Event ignored: missing or invalid orderId" }, allowedOrigin)
    }

    try {
      const result = await orderStatusUpdater.updateStatusByOrderId(orderId, targetStatus)

      emitMetric("StripeWebhooksHandled", 1, {
        Function: "stripeWebhook",
        Status: result === "UPDATED" ? "Success" : "Ignored"
      })
      logInfo("stripeWebhook processed", {
        requestId: event.requestContext?.requestId,
        eventType: stripeEvent.type,
        orderId,
        status: targetStatus,
        result
      })

      return ok(
        {
          message: "Webhook processed",
          orderId,
          status: targetStatus,
          result
        },
        allowedOrigin
      )
    } catch (error) {
      emitMetric("StripeWebhooksHandled", 1, {
        Function: "stripeWebhook",
        Status: "Error"
      })
      emitMetric("BackendErrors", 1, {
        Function: "stripeWebhook"
      })
      logError("stripeWebhook failed", {
        requestId: event.requestContext?.requestId,
        message: error instanceof Error ? error.message : "Unknown error"
      })
      return internalServerError(allowedOrigin)
    }
  }
}

export const stripeWebhookHandler = buildStripeWebhookHandler()
