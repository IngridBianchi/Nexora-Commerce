import { describe, expect, it } from "vitest"
import {
  normalizeCheckoutFormData,
  validateCheckoutData
} from "../lib/checkout-validation"

describe("checkout validation", () => {
  it("normalizes and sanitizes user inputs", () => {
    const result = normalizeCheckoutFormData({
      name: "  Ada\u0000 Lovelace  ",
      email: " ADA@EXAMPLE.COM ",
      address: "  Calle 123\u0007 "
    })

    expect(result.name).toBe("Ada Lovelace")
    expect(result.email).toBe("ada@example.com")
    expect(result.address).toBe("Calle 123")
  })

  it("rejects empty carts", () => {
    const error = validateCheckoutData(
      {
        name: "Ada",
        email: "ada@example.com",
        address: "Calle 123"
      },
      0
    )

    expect(error).toMatch(/carrito vacio/i)
  })
})
