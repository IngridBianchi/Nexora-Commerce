import { NextRequest, NextResponse } from "next/server"
import { createStorefrontSessionToken, StorefrontSessionUser } from "@/lib/storefront-auth"
import { dispatchStorefrontVerificationEmail } from "@/lib/storefront-email"
import {
  createOpaqueStorefrontToken,
  createStorefrontUserRecord,
  findStorefrontUserByEmail,
  hashOpaqueStorefrontToken,
  normalizeStorefrontEmail,
  readStorefrontUsers,
  storefrontUsersLimits,
  writeStorefrontUsers
} from "@/lib/storefront-users"
import {
  createStorefrontUserInDb,
  resolveStorefrontUsersTableName,
  saveStorefrontUserInDb
} from "@/lib/storefront-users-service"

const MIN_PASSWORD_LENGTH = 8
const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(request: NextRequest) {
  const secret = process.env.STOREFRONT_AUTH_SECRET?.trim() ?? ""
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
    typeof (body as Record<string, unknown>)["name"] !== "string" ||
    typeof (body as Record<string, unknown>)["email"] !== "string" ||
    typeof (body as Record<string, unknown>)["password"] !== "string"
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const name = ((body as Record<string, unknown>)["name"] as string).trim()
  const email = normalizeStorefrontEmail((body as Record<string, unknown>)["email"] as string)
  const password = ((body as Record<string, unknown>)["password"] as string).trim()

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Name must be between 2 and 80 characters" }, { status: 400 })
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const createdUser = createStorefrontUserRecord(email, name, password)
  const verificationToken = createOpaqueStorefrontToken()
  const verificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString()

  createdUser.emailVerificationTokenHash = hashOpaqueStorefrontToken(verificationToken, secret)
  createdUser.emailVerificationExpiresAt = verificationExpiresAt

  const tableName = resolveStorefrontUsersTableName()
  let result: "CREATED" | "ALREADY_EXISTS"

  try {
    result = await createStorefrontUserInDb(tableName, createdUser)
  } catch {
    return NextResponse.json({ error: "Could not create account at the moment" }, { status: 500 })
  }

  if (result === "ALREADY_EXISTS") {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  }

  const users = readStorefrontUsers(request, secret)
  const updatedUsers = findStorefrontUserByEmail(users, email)
    ? users
    : [createdUser, ...users].slice(0, storefrontUsersLimits.maxUsers)

  const sessionUser: StorefrontSessionUser = {
    email: createdUser.email,
    name: createdUser.name,
    emailVerified: false
  }

  const token = createStorefrontSessionToken(sessionUser, secret)
  const verificationUrl = `${request.nextUrl.origin}/login?mode=verify&email=${encodeURIComponent(createdUser.email)}&token=${encodeURIComponent(verificationToken)}`
  const emailDispatch = await dispatchStorefrontVerificationEmail({
    email: createdUser.email,
    name: createdUser.name,
    verificationUrl,
    expiresAt: verificationExpiresAt
  })

  const response = NextResponse.json({
    ok: true,
    user: sessionUser,
    verificationUrl,
    verificationExpiresAt,
    delivery: emailDispatch.delivery,
    warning: emailDispatch.warning
  })

  response.cookies.set("storefront_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  })

  writeStorefrontUsers(response, updatedUsers, secret)

  try {
    await saveStorefrontUserInDb(tableName, createdUser)
  } catch {
    // Keep the account available even if the verification token cannot be refreshed after creation.
  }

  return response
}
