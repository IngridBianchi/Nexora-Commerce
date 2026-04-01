import { NextRequest, NextResponse } from "next/server"
import { createStorefrontSessionToken, StorefrontSessionUser } from "@/lib/storefront-auth"
import {
  findStorefrontUserByEmail,
  normalizeStorefrontEmail,
  readStorefrontUsers,
  verifyStorefrontPassword
} from "@/lib/storefront-users"
import {
  findStorefrontUserByEmailInDb,
  resolveStorefrontUsersTableName
} from "@/lib/storefront-users-service"

function readConfig() {
  const email = process.env.STOREFRONT_DEMO_EMAIL?.trim().toLowerCase() ?? ""
  const password = process.env.STOREFRONT_DEMO_PASSWORD?.trim() ?? ""
  const secret = process.env.STOREFRONT_AUTH_SECRET?.trim() ?? ""

  return { email, password, secret }
}

function buildDisplayName(email: string): string {
  const [localPart] = email.split("@")
  if (!localPart) {
    return "Cliente Nexora"
  }
  return localPart.replace(/[._-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
}

export async function POST(request: NextRequest) {
  const { email: configuredEmail, password: configuredPassword, secret } = readConfig()

  if (secret.length < 16) {
    return NextResponse.json({ error: "Storefront auth not configured" }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>)["email"] !== "string" ||
    typeof (body as Record<string, unknown>)["password"] !== "string"
  ) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 })
  }

  const providedEmail = normalizeStorefrontEmail((body as Record<string, unknown>)["email"] as string)
  const providedPassword = ((body as Record<string, unknown>)["password"] as string).trim()

  let authenticatedUser: StorefrontSessionUser | null = null

  if (
    configuredEmail.length > 0 &&
    configuredPassword.length > 0 &&
    providedEmail === configuredEmail &&
    providedPassword === configuredPassword
  ) {
    authenticatedUser = {
      email: providedEmail,
      name: buildDisplayName(providedEmail),
      emailVerified: true
    }
  }

  if (!authenticatedUser) {
    const tableName = resolveStorefrontUsersTableName()
    try {
      const matchedUser = await findStorefrontUserByEmailInDb(tableName, providedEmail)

      if (matchedUser && verifyStorefrontPassword(providedPassword, matchedUser)) {
        authenticatedUser = {
          email: matchedUser.email,
          name: matchedUser.name,
          emailVerified: Boolean(matchedUser.emailVerifiedAt)
        }
      }
    } catch {
      // If DynamoDB is unavailable, keep fallback auth paths below.
    }
  }

  // Backward compatibility for users created before DynamoDB persistence.
  if (!authenticatedUser) {
    const users = readStorefrontUsers(request, secret)
    const matchedLegacyUser = findStorefrontUserByEmail(users, providedEmail)

    if (matchedLegacyUser && verifyStorefrontPassword(providedPassword, matchedLegacyUser)) {
      authenticatedUser = {
        email: matchedLegacyUser.email,
        name: matchedLegacyUser.name,
        emailVerified: Boolean(matchedLegacyUser.emailVerifiedAt)
      }
    }
  }

  if (!authenticatedUser) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }

  const token = createStorefrontSessionToken(authenticatedUser, secret)
  const response = NextResponse.json({ ok: true, user: authenticatedUser })
  response.cookies.set("storefront_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  })

  return response
}
