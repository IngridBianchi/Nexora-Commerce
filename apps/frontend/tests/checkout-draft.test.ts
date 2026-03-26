import { beforeEach, describe, expect, it } from "vitest"
import {
  CHECKOUT_DRAFT_STORAGE_KEY,
  CHECKOUT_DRAFT_TTL_MS,
  clearCheckoutDraft,
  isCheckoutDraftEmpty,
  loadCheckoutDraft,
  saveCheckoutDraft
} from "../lib/checkout-draft"

describe("checkout draft persistence", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("persists and restores a valid draft", () => {
    const now = Date.now()
    const data = {
      name: "Ada Lovelace",
      email: "ada@example.com",
      address: "Calle 123"
    }

    saveCheckoutDraft(data, now)
    const restored = loadCheckoutDraft(now + 1000)

    expect(restored).toEqual(data)
  })

  it("expires drafts older than ttl", () => {
    const now = Date.now()
    saveCheckoutDraft(
      {
        name: "Ada",
        email: "ada@example.com",
        address: "Calle 123"
      },
      now
    )

    const restored = loadCheckoutDraft(now + CHECKOUT_DRAFT_TTL_MS + 1)
    expect(restored).toBeNull()
    expect(window.localStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY)).toBeNull()
  })

  it("drops corrupted payloads safely", () => {
    window.localStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, "{ not-json")

    const restored = loadCheckoutDraft()
    expect(restored).toBeNull()
    expect(window.localStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY)).toBeNull()
  })

  it("clears draft explicitly", () => {
    saveCheckoutDraft({
      name: "Ada",
      email: "ada@example.com",
      address: "Calle 123"
    })

    clearCheckoutDraft()
    expect(loadCheckoutDraft()).toBeNull()
  })

  it("detects empty draft values", () => {
    expect(
      isCheckoutDraftEmpty({
        name: "  ",
        email: "",
        address: "\n"
      })
    ).toBe(true)
  })
})