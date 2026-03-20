/// <reference types="node" />

import assert from "node:assert/strict"
import test from "node:test"
import { APIGatewayProxyEvent } from "aws-lambda"
import { ListProductsService } from "../src/application/services/list-products-service"
import { buildGetProductsHandler } from "../src/handlers/get-products-handler"
import { Product } from "../src/domain/product"

class InMemoryProductReader {
  public lastLimit: number | null = null

  constructor(private readonly products: Product[]) {}

  async listProducts(limit: number): Promise<Product[]> {
    this.lastLimit = limit
    return this.products
  }
}

function buildEvent(limit?: string): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path: "/products",
    pathParameters: null,
    queryStringParameters: typeof limit === "string" ? { limit } : null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "/products"
  }
}

test("get-products handler returns products and clamps large limit", async () => {
  const reader = new InMemoryProductReader([
    {
      id: "keyboard",
      name: "Keyboard",
      description: "Mechanical keyboard",
      price: 50,
      imageUrl: "https://picsum.photos/300/200"
    }
  ])
  const service = new ListProductsService(reader)
  const handler = buildGetProductsHandler({
    listProductsService: service,
    allowedOrigin: "https://frontend.example.com"
  })

  const response = await handler(buildEvent("999"), {} as never, () => undefined)

  assert.equal(response?.statusCode, 200)
  assert.equal(response?.headers?.["Access-Control-Allow-Origin"], "https://frontend.example.com")
  assert.equal(reader.lastLimit, 100)

  const payload = JSON.parse(response?.body ?? "{}") as { data: Product[] }
  assert.equal(payload.data.length, 1)
  assert.equal(payload.data[0].id, "keyboard")
})

test("get-products handler returns 400 for non-integer limit", async () => {
  const handler = buildGetProductsHandler({
    listProductsService: {
      execute: async () => []
    }
  })

  const response = await handler(buildEvent("abc"), {} as never, () => undefined)
  assert.equal(response?.statusCode, 400)
})

test("get-products handler returns 500 when service fails", async () => {
  const handler = buildGetProductsHandler({
    listProductsService: {
      execute: async () => {
        throw new Error("boom")
      }
    }
  })

  const response = await handler(buildEvent("10"), {} as never, () => undefined)
  assert.equal(response?.statusCode, 500)
})
