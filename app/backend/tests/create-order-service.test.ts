/// <reference types="node" />

import assert from "node:assert/strict"
import test from "node:test"
import { CreateOrderService } from "../src/application/services/create-order-service"
import { OrderRecord } from "../src/domain/order"
import { ProductCatalogReader, ProductForOrder } from "../src/application/ports/product-catalog-reader"

class InMemoryOrderWriter {
  public createdOrders: OrderRecord[] = []
  public reservations: Array<{ productId: string; quantity: number }> = []

  async create(
    order: OrderRecord,
    stockReservations: Array<{ productId: string; quantity: number }>
  ): Promise<void> {
    this.createdOrders.push(order)
    this.reservations = stockReservations
  }
}

class InMemoryProductCatalogReader implements ProductCatalogReader {
  constructor(private readonly products: ProductForOrder[]) {}

  async getProductsByIds(ids: string[]): Promise<ProductForOrder[]> {
    const idSet = new Set(ids)
    return this.products.filter((product) => idSet.has(product.id))
  }
}

test("CreateOrderService stores order and returns summary", async () => {
  const writer = new InMemoryOrderWriter()
  const catalog = new InMemoryProductCatalogReader([
    { id: "product-1", name: "Keyboard", price: 12, stock: 10 },
    { id: "product-2", name: "Mouse", price: 6, stock: 10 }
  ])
  const service = new CreateOrderService(writer, catalog, () => new Date("2026-01-01T10:00:00.000Z"))

  const result = await service.execute({
    name: "Ada",
    email: "ada@example.com",
    address: "123 Example Street",
    items: [
      {
        productId: "product-1",
        quantity: 2
      },
      {
        productId: "product-2",
        quantity: 3
      }
    ]
  })

  assert.equal(result.status, "PENDING")
  assert.equal(result.total, 42)
  assert.ok(result.orderId.length > 0)

  assert.equal(writer.createdOrders.length, 1)
  assert.equal(writer.createdOrders[0].createdAt, "2026-01-01T10:00:00.000Z")
  assert.equal(writer.createdOrders[0].total, 42)
  assert.equal(writer.createdOrders[0].items[0].unitPrice, 12)
  assert.equal(writer.reservations.length, 2)
})
