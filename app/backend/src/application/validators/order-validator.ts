import { CreateOrderInput, CreateOrderItemInput } from "../../domain/order"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readNonEmptyString(
  value: unknown,
  fieldName: string,
  minLength: number,
  maxLength: number
): ValidationResult<string> {
  if (typeof value !== "string") {
    return { success: false, error: `${fieldName} must be a string` }
  }

  const normalized = value.trim()
  if (normalized.length < minLength || normalized.length > maxLength) {
    return {
      success: false,
      error: `${fieldName} must be between ${minLength} and ${maxLength} characters`
    }
  }

  return { success: true, value: normalized }
}

function toOrderItem(rawItem: unknown, index: number): ValidationResult<CreateOrderItemInput> {
  if (!isRecord(rawItem)) {
    return { success: false, error: `items[${index}] must be an object` }
  }

  const productIdRaw = rawItem.productId ?? rawItem.id
  const quantityRaw = rawItem.quantity ?? 1

  const productId = readNonEmptyString(productIdRaw, `items[${index}].productId`, 1, 64)
  if (!productId.success) {
    return productId
  }

  if (
    typeof quantityRaw !== "number" ||
    !Number.isInteger(quantityRaw) ||
    quantityRaw <= 0 ||
    quantityRaw > 50
  ) {
    return { success: false, error: `items[${index}].quantity must be an integer between 1 and 50` }
  }

  return {
    success: true,
    value: {
      productId: productId.value,
      quantity: quantityRaw
    }
  }
}

export function validateCreateOrderInput(rawBody: unknown): ValidationResult<CreateOrderInput> {
  if (!isRecord(rawBody)) {
    return { success: false, error: "Body must be a JSON object" }
  }

  const name = readNonEmptyString(rawBody.name, "name", 2, 120)
  if (!name.success) {
    return name
  }

  const email = readNonEmptyString(rawBody.email, "email", 6, 254)
  if (!email.success) {
    return email
  }

  if (!EMAIL_REGEX.test(email.value)) {
    return { success: false, error: "email has invalid format" }
  }

  const address = readNonEmptyString(rawBody.address, "address", 8, 300)
  if (!address.success) {
    return address
  }

  if (!Array.isArray(rawBody.items)) {
    return { success: false, error: "items must be an array" }
  }

  if (rawBody.items.length === 0 || rawBody.items.length > 100) {
    return { success: false, error: "items length must be between 1 and 100" }
  }

  const normalizedItems: CreateOrderItemInput[] = []
  for (let index = 0; index < rawBody.items.length; index += 1) {
    const parsedItem = toOrderItem(rawBody.items[index], index)
    if (!parsedItem.success) {
      return parsedItem
    }

    normalizedItems.push(parsedItem.value)
  }

  return {
    success: true,
    value: {
      name: name.value,
      email: email.value.toLowerCase(),
      address: address.value,
      items: normalizedItems
    }
  }
}
