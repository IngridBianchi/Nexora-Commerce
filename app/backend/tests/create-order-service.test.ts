/// <reference types="node" />

import assert from "node:assert/strict"
import test from "node:test"
import { CreateOrderService } from "../src/application/services/create-order-service"
import { OrderRecord } from "../src/domain/order"

class InMemoryOrderWriter {
  public createdOrders: OrderRecord[] = []

  async create(order: OrderRecord): Promise<void> {
    this.createdOrders.push(order)
  }
}

test("CreateOrderService stores order and returns summary", async () => {
  const writer = new InMemoryOrderWriter()
  const service = new CreateOrderService(writer, () => new Date("2026-01-01T10:00:00.000Z"))

  const result = await service.execute({
    name: "Ada",
    email: "ada@example.com",
    address: "123 Example Street",
    items: [
      {
        productId: "product-1",
        name: "Keyboard",
        unitPrice: 10.5,
        quantity: 2
      },
      {
        productId: "product-2",
        name: "Mouse",
        unitPrice: 5,
        quantity: 3
      }
    ]
  })

  assert.equal(result.status, "PENDING")
  assert.equal(result.total, 36)
  assert.ok(result.orderId.length > 0)

  assert.equal(writer.createdOrders.length, 1)
  assert.equal(writer.createdOrders[0].createdAt, "2026-01-01T10:00:00.000Z")
  assert.equal(writer.createdOrders[0].total, 36)
})
