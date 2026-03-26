import { CheckoutFormData } from "@/lib/types"

const CHECKOUT_DRAFT_STORAGE_KEY = "nexora-checkout-draft"
const CHECKOUT_DRAFT_TTL_MS = 30 * 60 * 1000

type CheckoutDraftPayload = {
  version: 1
  updatedAt: number
  data: CheckoutFormData
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage
}

function isValidCheckoutFormData(value: unknown): value is CheckoutFormData {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<CheckoutFormData>

  return (
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.address === "string"
  )
}

export function saveCheckoutDraft(data: CheckoutFormData, now = Date.now()): void {
  const storage = getStorage()
  if (!storage) {
    return
  }

  const payload: CheckoutDraftPayload = {
    version: 1,
    updatedAt: now,
    data
  }

  try {
    storage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore quota and private mode errors.
  }
}

export function loadCheckoutDraft(now = Date.now()): CheckoutFormData | null {
  const storage = getStorage()
  if (!storage) {
    return null
  }

  const raw = storage.getItem(CHECKOUT_DRAFT_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CheckoutDraftPayload>
    if (parsed.version !== 1 || typeof parsed.updatedAt !== "number") {
      storage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY)
      return null
    }

    if (now - parsed.updatedAt > CHECKOUT_DRAFT_TTL_MS) {
      storage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY)
      return null
    }

    if (!isValidCheckoutFormData(parsed.data)) {
      storage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY)
      return null
    }

    return parsed.data
  } catch {
    storage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY)
    return null
  }
}

export function clearCheckoutDraft(): void {
  const storage = getStorage()
  if (!storage) {
    return
  }

  storage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY)
}

export function isCheckoutDraftEmpty(data: CheckoutFormData): boolean {
  return !data.name.trim() && !data.email.trim() && !data.address.trim()
}

export { CHECKOUT_DRAFT_STORAGE_KEY, CHECKOUT_DRAFT_TTL_MS }