import { createHmac, timingSafeEqual } from "node:crypto"

export interface StorefrontSessionUser {
  email: string
  name: string
  emailVerified: boolean
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

export function createStorefrontSessionToken(user: StorefrontSessionUser, secret: string): string {
  const payload = toBase64Url(JSON.stringify(user))
  const signature = createHmac("sha256", secret).update(payload).digest("hex")
  return `${payload}.${signature}`
}

export function verifyStorefrontSessionToken(
  token: string,
  secret: string
): StorefrontSessionUser | null {
  const [payload, signature] = token.split(".")
  if (!payload || !signature) {
    return null
  }

  const expectedSignature = createHmac("sha256", secret).update(payload).digest("hex")

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as Partial<StorefrontSessionUser>
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.emailVerified !== "boolean"
    ) {
      return null
    }

    return {
      email: parsed.email,
      name: parsed.name,
      emailVerified: parsed.emailVerified
    }
  } catch {
    return null
  }
}
