/// <reference types="node" />

import assert from "node:assert/strict"
import test from "node:test"
import { APIGatewayProxyEvent } from "aws-lambda"
import { buildStripeWebhookHandler } from "../src/handlers/stripe-webhook-handler"
import { OrderStatus } from "../src/domain/order"

function buildEvent(body: string | null, signature = "t=1,v1=fake"): APIGatewayProxyEvent {
  return {
    body,
    headers: {
      "stripe-signature": signature
    },
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/webhooks/stripe",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "/webhooks/stripe"
  }
}

test("stripe-webhook handler returns 400 when signature is invalid", async () => {
  const handler = buildStripeWebhookHandler({
    verifier: {
      parseEvent: () => {
        throw new Error("invalid signature")
      }
    },
    orderStatusUpdater: {
      updateStatusByOrderId: async () => "UPDATED"
    }
  })

  const response = await handler(buildEvent("{}"), {} as never, () => undefined)
  assert.equal(response?.statusCode, 400)
})

test("stripe-webhook handler updates order to PAID on checkout.session.completed", async () => {
  const calls: Array<{ orderId: string; status: OrderStatus }> = []

  const handler = buildStripeWebhookHandler({
    verifier: {
      parseEvent: () => ({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {
              orderId: "order-123"
            }
          }
        }
      })
    },
    orderStatusUpdater: {
      updateStatusByOrderId: async (orderId, status) => {
        calls.push({ orderId, status })
        return "UPDATED"
      }
    }
  })

  const response = await handler(buildEvent("{}"), {} as never, () => undefined)
  assert.equal(response?.statusCode, 200)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].orderId, "order-123")
  assert.equal(calls[0].status, "PAID")
})

test("stripe-webhook handler ignores unsupported events", async () => {
  let called = false

  const handler = buildStripeWebhookHandler({
    verifier: {
      parseEvent: () => ({
        type: "payment_intent.created",
        data: {
          object: {
            metadata: {
              orderId: "order-123"
            }
          }
        }
      })
    },
    orderStatusUpdater: {
      updateStatusByOrderId: async () => {
        called = true
        return "UPDATED"
      }
    }
  })

  const response = await handler(buildEvent("{}"), {} as never, () => undefined)
  assert.equal(response?.statusCode, 200)
  assert.equal(called, false)
})

test("stripe-webhook handler is idempotent when status already set", async () => {
  const handler = buildStripeWebhookHandler({
    verifier: {
      parseEvent: () => ({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {
              orderId: "order-123"
            }
          }
        }
      })
    },
    orderStatusUpdater: {
      updateStatusByOrderId: async () => "UNCHANGED"
    }
  })

  const response = await handler(buildEvent("{}"), {} as never, () => undefined)
  assert.equal(response?.statusCode, 200)

  const payload = JSON.parse(response?.body ?? "{}") as { result: string }
  assert.equal(payload.result, "UNCHANGED")
})
