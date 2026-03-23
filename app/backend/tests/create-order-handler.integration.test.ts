/// <reference types="node" />

import assert from "node:assert/strict"
import test from "node:test"
import { APIGatewayProxyEvent } from "aws-lambda"
import { buildCreateOrderHandler } from "../src/handlers/create-order-handler"
import { CreateOrderService } from "../src/application/services/create-order-service"
import { OrderRecord } from "../src/domain/order"
import { ProductCatalogReader, ProductForOrder } from "../src/application/ports/product-catalog-reader"

class InMemoryOrderWriter {
  public readonly createdOrders: OrderRecord[] = []

  async create(
    order: OrderRecord,
    _stockReservations: Array<{ productId: string; quantity: number }>
  ): Promise<void> {
    this.createdOrders.push(order)
  }
}

class InMemoryProductCatalogReader implements ProductCatalogReader {
  constructor(private readonly products: ProductForOrder[]) {}

  async getProductsByIds(ids: string[]): Promise<ProductForOrder[]> {
    const idSet = new Set(ids)
    return this.products.filter((product) => idSet.has(product.id))
  }
}

function buildEvent(body: string | null): APIGatewayProxyEvent {
  return {
    body,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/orders",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "/orders"
  }
}

test("create-order handler returns 201 and persists normalized order", async () => {
  const writer = new InMemoryOrderWriter()
  const catalog = new InMemoryProductCatalogReader([
    { id: "keyboard", name: "Keyboard", price: 25, stock: 10 }
  ])
  const service = new CreateOrderService(writer, catalog, () => new Date("2026-01-01T00:00:00.000Z"))
  const handler = buildCreateOrderHandler({
    createOrderService: service,
    allowedOrigin: "https://frontend.example.com"
  })

  const response = await handler(
    buildEvent(
      JSON.stringify({
        name: "  Ada  ",
        email: " ADA@EXAMPLE.COM ",
        address: "  123 Example Street  ",
        items: [
          {
            productId: "keyboard",
            quantity: 2
          }
        ]
      })
    ),
    {} as never,
    () => undefined
  )

  assert.equal(response?.statusCode, 201)
  assert.equal(response?.headers?.["Access-Control-Allow-Origin"], "https://frontend.example.com")

  const payload = JSON.parse(response?.body ?? "{}") as {
    message: string
    orderId: string
    total: number
    status: string
  }

  assert.equal(payload.message, "Order created successfully")
  assert.equal(payload.total, 50)
  assert.equal(payload.status, "PENDING")
  assert.ok(payload.orderId.length > 0)

  assert.equal(writer.createdOrders.length, 1)
  assert.equal(writer.createdOrders[0].email, "ada@example.com")
})

test("create-order handler returns 400 for invalid JSON", async () => {
  const handler = buildCreateOrderHandler({
    createOrderService: {
      execute: async () => ({ orderId: "id", total: 1, status: "PENDING" })
    }
  })

  const response = await handler(buildEvent("{invalid-json"), {} as never, () => undefined)
  assert.equal(response?.statusCode, 400)
})

test("create-order handler returns 422 for invalid payload", async () => {
  const handler = buildCreateOrderHandler({
    createOrderService: {
      execute: async () => ({ orderId: "id", total: 1, status: "PENDING" })
    }
  })

  const response = await handler(
    buildEvent(
      JSON.stringify({
        name: "A",
        email: "invalid",
        address: "short",
        items: []
      })
    ),
    {} as never,
    () => undefined
  )

  assert.equal(response?.statusCode, 422)
})

test("create-order handler returns 500 when service fails", async () => {
  const handler = buildCreateOrderHandler({
    createOrderService: {
      execute: async () => {
        throw new Error("boom")
      }
    }
  })

  const response = await handler(
    buildEvent(
      JSON.stringify({
        name: "Ada",
        email: "ada@example.com",
        address: "123 Example Street",
        items: [
          {
            productId: "keyboard",
            quantity: 1
          }
        ]
      })
    ),
    {} as never,
    () => undefined
  )

  assert.equal(response?.statusCode, 500)
})
