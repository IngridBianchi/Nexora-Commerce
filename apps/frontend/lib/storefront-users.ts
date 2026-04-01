import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

const USERS_COOKIE_NAME = "storefront_users"
const USERS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
const MAX_STOREFRONT_USERS = 20

export type StoredStorefrontUser = {
  email: string
  name: string
  passwordHash: string
  salt: string
  createdAt: string
  emailVerifiedAt?: string | null
  emailVerificationTokenHash?: string | null
  emailVerificationExpiresAt?: string | null
  passwordResetTokenHash?: string | null
  passwordResetExpiresAt?: string | null
}

type UsersPayload = {
  users: StoredStorefrontUser[]
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8")
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

function encodeUsers(users: StoredStorefrontUser[], secret: string): string {
  const payload = toBase64Url(JSON.stringify({ users } satisfies UsersPayload))
  const signature = signPayload(payload, secret)
  return `${payload}.${signature}`
}

function decodeUsers(token: string, secret: string): StoredStorefrontUser[] {
  const [payload, signature] = token.split(".")
  if (!payload || !signature) {
    return []
  }

  const expectedSignature = signPayload(payload, secret)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (signatureBuffer.length !== expectedBuffer.length) {
    return []
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return []
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as Partial<UsersPayload>
    if (!Array.isArray(parsed.users)) {
      return []
    }

    return parsed.users
      .filter((user): user is StoredStorefrontUser => {
        return (
          typeof user === "object" &&
          user !== null &&
          typeof user.email === "string" &&
          typeof user.name === "string" &&
          typeof user.passwordHash === "string" &&
          typeof user.salt === "string" &&
          typeof user.createdAt === "string"
        )
      })
      .slice(0, MAX_STOREFRONT_USERS)
  } catch {
    return []
  }
}

export function normalizeStorefrontEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function hashStorefrontPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex")
}

export function createOpaqueStorefrontToken(): string {
  return randomBytes(24).toString("hex")
}

export function hashOpaqueStorefrontToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex")
}

export function verifyStorefrontPassword(password: string, user: StoredStorefrontUser): boolean {
  const expected = user.passwordHash
  const provided = hashStorefrontPassword(password, user.salt)
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, providedBuffer)
}

export function createStorefrontUserRecord(email: string, name: string, password: string): StoredStorefrontUser {
  const salt = randomBytes(16).toString("hex")

  return {
    email: normalizeStorefrontEmail(email),
    name: name.trim(),
    passwordHash: hashStorefrontPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
    emailVerifiedAt: null,
    emailVerificationTokenHash: null,
    emailVerificationExpiresAt: null,
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null
  }
}

export function readStorefrontUsers(request: NextRequest, secret: string): StoredStorefrontUser[] {
  const token = request.cookies.get(USERS_COOKIE_NAME)?.value ?? ""
  if (!token || secret.length < 16) {
    return []
  }

  return decodeUsers(token, secret)
}

export function writeStorefrontUsers(response: NextResponse, users: StoredStorefrontUser[], secret: string): void {
  const limitedUsers = users.slice(0, MAX_STOREFRONT_USERS)
  const token = encodeUsers(limitedUsers, secret)

  response.cookies.set(USERS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: USERS_COOKIE_MAX_AGE,
    path: "/"
  })
}

export function findStorefrontUserByEmail(
  users: StoredStorefrontUser[],
  email: string
): StoredStorefrontUser | null {
  const normalizedEmail = normalizeStorefrontEmail(email)
  return users.find((user) => user.email === normalizedEmail) ?? null
}

export const storefrontUsersLimits = {
  maxUsers: MAX_STOREFRONT_USERS
}
