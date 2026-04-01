type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; error: string }

export interface CreateCheckoutSessionItemInput {
  name: string
  unitPrice: number
  quantity: number
}

export interface CreateCheckoutSessionInput {
  orderId: string
  successUrl: string
  cancelUrl: string
  email?: string
  items: CreateCheckoutSessionItemInput[]
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readString(
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

function readUrl(value: unknown, fieldName: string): ValidationResult<string> {
  const parsed = readString(value, fieldName, 10, 2048)
  if (!parsed.success) {
    return parsed
  }

  try {
    const url = new URL(parsed.value)
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { success: false, error: `${fieldName} must start with http:// or https://` }
    }

    return { success: true, value: url.toString() }
  } catch {
    return { success: false, error: `${fieldName} must be a valid URL` }
  }
}

function toItem(rawItem: unknown, index: number): ValidationResult<CreateCheckoutSessionItemInput> {
  if (!isRecord(rawItem)) {
    return { success: false, error: `items[${index}] must be an object` }
  }

  const name = readString(rawItem.name, `items[${index}].name`, 1, 200)
  if (!name.success) {
    return name
  }

  if (
    typeof rawItem.unitPrice !== "number" ||
    !Number.isFinite(rawItem.unitPrice) ||
    rawItem.unitPrice <= 0
  ) {
    return { success: false, error: `items[${index}].unitPrice must be a positive number` }
  }

  if (
    typeof rawItem.quantity !== "number" ||
    !Number.isInteger(rawItem.quantity) ||
    rawItem.quantity <= 0 ||
    rawItem.quantity > 50
  ) {
    return { success: false, error: `items[${index}].quantity must be an integer between 1 and 50` }
  }

  return {
    success: true,
    value: {
      name: name.value,
      unitPrice: Number(rawItem.unitPrice.toFixed(2)),
      quantity: rawItem.quantity
    }
  }
}

export function validateCreateCheckoutSessionInput(
  rawBody: unknown
): ValidationResult<CreateCheckoutSessionInput> {
  if (!isRecord(rawBody)) {
    return { success: false, error: "Body must be a JSON object" }
  }

  const orderId = readString(rawBody.orderId, "orderId", 1, 64)
  if (!orderId.success) {
    return orderId
  }

  const successUrl = readUrl(rawBody.successUrl, "successUrl")
  if (!successUrl.success) {
    return successUrl
  }

  const cancelUrl = readUrl(rawBody.cancelUrl, "cancelUrl")
  if (!cancelUrl.success) {
    return cancelUrl
  }

  let email: string | undefined
  if (typeof rawBody.email !== "undefined") {
    const parsedEmail = readString(rawBody.email, "email", 6, 254)
    if (!parsedEmail.success) {
      return parsedEmail
    }

    if (!EMAIL_REGEX.test(parsedEmail.value)) {
      return { success: false, error: "email has invalid format" }
    }

    email = parsedEmail.value.toLowerCase()
  }

  if (!Array.isArray(rawBody.items)) {
    return { success: false, error: "items must be an array" }
  }

  if (rawBody.items.length === 0 || rawBody.items.length > 100) {
    return { success: false, error: "items length must be between 1 and 100" }
  }

  const normalizedItems: CreateCheckoutSessionItemInput[] = []
  for (let index = 0; index < rawBody.items.length; index += 1) {
    const parsedItem = toItem(rawBody.items[index], index)
    if (!parsedItem.success) {
      return parsedItem
    }

    normalizedItems.push(parsedItem.value)
  }

  return {
    success: true,
    value: {
      orderId: orderId.value,
      successUrl: successUrl.value,
      cancelUrl: cancelUrl.value,
      email,
      items: normalizedItems
    }
  }
}
