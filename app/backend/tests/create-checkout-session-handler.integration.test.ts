/// <reference types="node" />

import assert from "node:assert/strict"
import test from "node:test"
import { APIGatewayProxyEvent } from "aws-lambda"
import { buildCreateCheckoutSessionHandler } from "../src/handlers/create-checkout-session-handler"

function buildEvent(body: string | null, headers?: Record<string, string>): APIGatewayProxyEvent {
  return {
    body,
    headers: headers ?? {},
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/checkout/session",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "/checkout/session"
  }
}

test("create-checkout-session handler returns 201 and session URL", async () => {
  let capturedIdempotencyKey = ""

  const handler = buildCreateCheckoutSessionHandler({
    checkoutGateway: {
      createSession: async (input) => {
        capturedIdempotencyKey = input.idempotencyKey
        return {
        sessionId: "cs_test_123",
        sessionUrl: "https://checkout.stripe.com/c/pay/cs_test_123"
        }
      }
    },
    allowedOrigin: "https://frontend.example.com"
  })

  const response = await handler(
    buildEvent(
      JSON.stringify({
        orderId: "order-1",
        email: "ada@example.com",
        successUrl: "https://frontend.example.com/order-success?orderId=order-1",
        cancelUrl: "https://frontend.example.com/order-cancelled",
        items: [
          {
            name: "Keyboard",
            unitPrice: 25,
            quantity: 2
          }
        ]
      }),
      {
        "idempotency-key": "idem-order-1"
      }
    ),
    {} as never,
    () => undefined
  )

  assert.equal(response?.statusCode, 201)
  assert.equal(response?.headers?.["Access-Control-Allow-Origin"], "https://frontend.example.com")

  const payload = JSON.parse(response?.body ?? "{}") as {
    message: string
    orderId: string
    sessionId: string
    sessionUrl: string
  }

  assert.equal(payload.message, "Checkout session created successfully")
  assert.equal(payload.orderId, "order-1")
  assert.equal(payload.sessionId, "cs_test_123")
  assert.equal(payload.sessionUrl, "https://checkout.stripe.com/c/pay/cs_test_123")
  assert.equal(capturedIdempotencyKey, "idem-order-1")
})

test("create-checkout-session handler returns 422 for invalid payload", async () => {
  const handler = buildCreateCheckoutSessionHandler({
    checkoutGateway: {
      createSession: async () => ({
        sessionId: "cs_test_123",
        sessionUrl: "https://checkout.stripe.com/c/pay/cs_test_123"
      })
    }
  })

  const response = await handler(
    buildEvent(
      JSON.stringify({
        orderId: "",
        successUrl: "invalid-url",
        cancelUrl: "https://frontend.example.com/order-cancelled",
        items: []
      }),
      {
        "idempotency-key": "idem-order-2"
      }
    ),
    {} as never,
    () => undefined
  )

  assert.equal(response?.statusCode, 422)
})

test("create-checkout-session handler returns 500 when gateway fails", async () => {
  const handler = buildCreateCheckoutSessionHandler({
    checkoutGateway: {
      createSession: async () => {
        throw new Error("stripe unavailable")
      }
    }
  })

  const response = await handler(
    buildEvent(
      JSON.stringify({
        orderId: "order-1",
        successUrl: "https://frontend.example.com/order-success?orderId=order-1",
        cancelUrl: "https://frontend.example.com/order-cancelled",
        items: [
          {
            name: "Keyboard",
            unitPrice: 25,
            quantity: 1
          }
        ]
      }),
      {
        "idempotency-key": "idem-order-3"
      }
    ),
    {} as never,
    () => undefined
  )

  assert.equal(response?.statusCode, 500)
})

test("create-checkout-session handler returns 400 when Idempotency-Key is missing", async () => {
  const handler = buildCreateCheckoutSessionHandler({
    checkoutGateway: {
      createSession: async () => ({
        sessionId: "cs_test_123",
        sessionUrl: "https://checkout.stripe.com/c/pay/cs_test_123"
      })
    }
  })

  const response = await handler(
    buildEvent(
      JSON.stringify({
        orderId: "order-1",
        successUrl: "https://frontend.example.com/order-success?orderId=order-1",
        cancelUrl: "https://frontend.example.com/order-cancelled",
        items: [
          {
            name: "Keyboard",
            unitPrice: 25,
            quantity: 1
          }
        ]
      })
    ),
    {} as never,
    () => undefined
  )

  assert.equal(response?.statusCode, 400)
})
