/// <reference types="node" />

import assert from "node:assert/strict"
import test from "node:test"
import { validateCreateOrderInput } from "../src/application/validators/order-validator"

test("validateCreateOrderInput returns normalized value for valid payload", () => {
  const result = validateCreateOrderInput({
    name: "  Ada Lovelace  ",
    email: " ADA@EXAMPLE.COM ",
    address: "  123 Example Street  ",
    items: [
      {
        id: "product-1",
        quantity: 2
      }
    ]
  })

  assert.equal(result.success, true)
  if (!result.success) {
    return
  }

  assert.equal(result.value.name, "Ada Lovelace")
  assert.equal(result.value.email, "ada@example.com")
  assert.equal(result.value.items[0].productId, "product-1")
  assert.equal(result.value.items[0].quantity, 2)
})

test("validateCreateOrderInput rejects invalid email", () => {
  const result = validateCreateOrderInput({
    name: "Ada",
    email: "bad-email",
    address: "123 Example Street",
    items: [
      {
        productId: "product-1",
        quantity: 1
      }
    ]
  })

  assert.equal(result.success, false)
  if (result.success) {
    return
  }

  assert.match(result.error, /email/i)
})

test("validateCreateOrderInput rejects out-of-range quantities", () => {
  const result = validateCreateOrderInput({
    name: "Ada",
    email: "ada@example.com",
    address: "123 Example Street",
    items: [
      {
        productId: "product-1",
        quantity: 100
      }
    ]
  })

  assert.equal(result.success, false)
})
