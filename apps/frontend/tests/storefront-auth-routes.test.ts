import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST as registerRoute } from "@/app/api/storefront/auth/register/route"
import { POST as verifyEmailRoute } from "@/app/api/storefront/auth/verify-email/route"
import { POST as requestPasswordResetRoute } from "@/app/api/storefront/auth/request-password-reset/route"
import { POST as resetPasswordRoute } from "@/app/api/storefront/auth/reset-password/route"
import { createStorefrontUserRecord, hashOpaqueStorefrontToken } from "@/lib/storefront-users"

const storefrontUsersServiceMocks = vi.hoisted(() => ({
  createStorefrontUserInDb: vi.fn(),
  findStorefrontUserByEmailInDb: vi.fn(),
  resolveStorefrontUsersTableName: vi.fn(() => "Products"),
  saveStorefrontUserInDb: vi.fn()
}))

vi.mock("@/lib/storefront-users-service", () => ({
  createStorefrontUserInDb: storefrontUsersServiceMocks.createStorefrontUserInDb,
  findStorefrontUserByEmailInDb: storefrontUsersServiceMocks.findStorefrontUserByEmailInDb,
  resolveStorefrontUsersTableName: storefrontUsersServiceMocks.resolveStorefrontUsersTableName,
  saveStorefrontUserInDb: storefrontUsersServiceMocks.saveStorefrontUserInDb
}))

describe("storefront auth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STOREFRONT_AUTH_SECRET = "super-secret-storefront-key"
  })

  it("register returns verification url and unverified session user", async () => {
    storefrontUsersServiceMocks.createStorefrontUserInDb.mockResolvedValue("CREATED")

    const request = new NextRequest("http://localhost/api/storefront/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "secret123"
      }),
      headers: { "Content-Type": "application/json" }
    })

    const response = await registerRoute(request)
    const payload = (await response.json()) as {
      ok: boolean
      verificationUrl?: string
      user: { email: string; name: string; emailVerified: boolean }
    }

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.user).toEqual({
      email: "ada@example.com",
      name: "Ada Lovelace",
      emailVerified: false
    })
    expect(payload.verificationUrl).toContain("/login?mode=verify")
    expect(storefrontUsersServiceMocks.createStorefrontUserInDb).toHaveBeenCalledTimes(1)
    expect(storefrontUsersServiceMocks.saveStorefrontUserInDb).toHaveBeenCalledTimes(1)
  })

  it("verify-email marks the user as verified and refreshes the session", async () => {
    const token = "verify-token"
    const user = createStorefrontUserRecord("ada@example.com", "Ada Lovelace", "secret123")
    user.emailVerificationTokenHash = hashOpaqueStorefrontToken(token, process.env.STOREFRONT_AUTH_SECRET as string)
    user.emailVerificationExpiresAt = new Date(Date.now() + 60_000).toISOString()

    storefrontUsersServiceMocks.findStorefrontUserByEmailInDb.mockResolvedValue(user)

    const request = new NextRequest("http://localhost/api/storefront/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email: user.email, token }),
      headers: { "Content-Type": "application/json" }
    })

    const response = await verifyEmailRoute(request)
    const payload = (await response.json()) as {
      ok: boolean
      user: { email: string; name: string; emailVerified: boolean }
    }

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.user.emailVerified).toBe(true)
    expect(storefrontUsersServiceMocks.saveStorefrontUserInDb).toHaveBeenCalledWith(
      "Products",
      expect.objectContaining({
        emailVerifiedAt: expect.any(String),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null
      })
    )
    expect(response.cookies.get("storefront_session")?.value).toBeTruthy()
  })

  it("request-password-reset returns demo reset url when the account exists", async () => {
    const user = createStorefrontUserRecord("ada@example.com", "Ada Lovelace", "secret123")
    storefrontUsersServiceMocks.findStorefrontUserByEmailInDb.mockResolvedValue(user)

    const request = new NextRequest("http://localhost/api/storefront/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify({ email: user.email }),
      headers: { "Content-Type": "application/json" }
    })

    const response = await requestPasswordResetRoute(request)
    const payload = (await response.json()) as {
      ok: boolean
      resetUrl?: string
      delivery?: string
    }

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.delivery).toBe("demo-link")
    expect(payload.resetUrl).toContain("/login?mode=reset")
    expect(storefrontUsersServiceMocks.saveStorefrontUserInDb).toHaveBeenCalledWith(
      "Products",
      expect.objectContaining({
        passwordResetTokenHash: expect.any(String),
        passwordResetExpiresAt: expect.any(String)
      })
    )
  })

  it("reset-password updates credentials and keeps emailVerified in the session", async () => {
    const token = "reset-token"
    const user = createStorefrontUserRecord("ada@example.com", "Ada Lovelace", "secret123")
    user.emailVerifiedAt = new Date().toISOString()
    user.passwordResetTokenHash = hashOpaqueStorefrontToken(token, process.env.STOREFRONT_AUTH_SECRET as string)
    user.passwordResetExpiresAt = new Date(Date.now() + 60_000).toISOString()

    storefrontUsersServiceMocks.findStorefrontUserByEmailInDb.mockResolvedValue(user)

    const request = new NextRequest("http://localhost/api/storefront/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        token,
        password: "new-secret-123"
      }),
      headers: { "Content-Type": "application/json" }
    })

    const response = await resetPasswordRoute(request)
    const payload = (await response.json()) as {
      ok: boolean
      user: { email: string; name: string; emailVerified: boolean }
    }

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.user).toEqual({
      email: "ada@example.com",
      name: "Ada Lovelace",
      emailVerified: true
    })
    expect(storefrontUsersServiceMocks.saveStorefrontUserInDb).toHaveBeenCalledWith(
      "Products",
      expect.objectContaining({
        passwordHash: expect.any(String),
        salt: expect.any(String),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null
      })
    )
    expect(response.cookies.get("storefront_session")?.value).toBeTruthy()
  })
})