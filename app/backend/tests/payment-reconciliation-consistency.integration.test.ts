/// <reference types="node" />

import assert from "node:assert/strict"
import test from "node:test"
import { APIGatewayProxyEvent } from "aws-lambda"
import { buildStripeWebhookHandler } from "../src/handlers/stripe-webhook-handler"
import { OrderStatus } from "../src/domain/order"

function buildEvent(body = "{}", signature = "t=1,v1=fake"): APIGatewayProxyEvent {
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

function createInMemoryOrderStatusUpdater() {
  const statusByOrderId = new Map<string, OrderStatus>()

  return {
    statusByOrderId,
    async updateStatusByOrderId(orderId: string, status: OrderStatus) {
      const current = statusByOrderId.get(orderId)
      if (current === status) {
        return "UNCHANGED" as const
      }

      statusByOrderId.set(orderId, status)
      return "UPDATED" as const
    }
  }
}

test("stripe webhook reconciliation is idempotent for duplicate checkout.session.completed events", async () => {
  const updater = createInMemoryOrderStatusUpdater()

  const handler = buildStripeWebhookHandler({
    verifier: {
      parseEvent: () => ({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {
              orderId: "order-100"
            }
          }
        }
      })
    },
    orderStatusUpdater: updater
  })

  const firstResponse = await handler(buildEvent(), {} as never, () => undefined)
  const secondResponse = await handler(buildEvent(), {} as never, () => undefined)

  assert.equal(firstResponse?.statusCode, 200)
  assert.equal(secondResponse?.statusCode, 200)

  const firstPayload = JSON.parse(firstResponse?.body ?? "{}") as { result: string }
  const secondPayload = JSON.parse(secondResponse?.body ?? "{}") as { result: string }

  assert.equal(firstPayload.result, "UPDATED")
  assert.equal(secondPayload.result, "UNCHANGED")
  assert.equal(updater.statusByOrderId.get("order-100"), "PAID")
})

test("stripe webhook reconciliation maps checkout.session.expired to CANCELLED", async () => {
  const updater = createInMemoryOrderStatusUpdater()

  const handler = buildStripeWebhookHandler({
    verifier: {
      parseEvent: () => ({
        type: "checkout.session.expired",
        data: {
          object: {
            metadata: {
              orderId: "order-200"
            }
          }
        }
      })
    },
    orderStatusUpdater: updater
  })

  const response = await handler(buildEvent(), {} as never, () => undefined)
  const payload = JSON.parse(response?.body ?? "{}") as {
    result: string
    status: OrderStatus
  }

  assert.equal(response?.statusCode, 200)
  assert.equal(payload.result, "UPDATED")
  assert.equal(payload.status, "CANCELLED")
  assert.equal(updater.statusByOrderId.get("order-200"), "CANCELLED")
})
