import { NextRequest, NextResponse } from "next/server"
import { createStorefrontSessionToken, StorefrontSessionUser } from "@/lib/storefront-auth"
import {
  createStorefrontUserRecord,
  hashOpaqueStorefrontToken,
  normalizeStorefrontEmail
} from "@/lib/storefront-users"
import {
  findStorefrontUserByEmailInDb,
  resolveStorefrontUsersTableName,
  saveStorefrontUserInDb
} from "@/lib/storefront-users-service"

const MIN_PASSWORD_LENGTH = 8

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
    typeof (body as Record<string, unknown>)["email"] !== "string" ||
    typeof (body as Record<string, unknown>)["token"] !== "string" ||
    typeof (body as Record<string, unknown>)["password"] !== "string"
  ) {
    return NextResponse.json({ error: "Missing reset payload" }, { status: 400 })
  }

  const email = normalizeStorefrontEmail((body as Record<string, unknown>)["email"] as string)
  const token = ((body as Record<string, unknown>)["token"] as string).trim()
  const password = ((body as Record<string, unknown>)["password"] as string).trim()

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const tableName = resolveStorefrontUsersTableName()
  const user = await findStorefrontUserByEmailInDb(tableName, email)

  if (!user || !user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
    return NextResponse.json({ error: "Reset token not found" }, { status: 400 })
  }

  if (new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "Reset token expired" }, { status: 400 })
  }

  if (hashOpaqueStorefrontToken(token, secret) !== user.passwordResetTokenHash) {
    return NextResponse.json({ error: "Invalid reset token" }, { status: 400 })
  }

  const updatedCredentials = createStorefrontUserRecord(user.email, user.name, password)
  user.passwordHash = updatedCredentials.passwordHash
  user.salt = updatedCredentials.salt
  user.passwordResetTokenHash = null
  user.passwordResetExpiresAt = null

  await saveStorefrontUserInDb(tableName, user)

  const sessionUser: StorefrontSessionUser = {
    email: user.email,
    name: user.name,
    emailVerified: Boolean(user.emailVerifiedAt)
  }

  const sessionToken = createStorefrontSessionToken(sessionUser, secret)
  const response = NextResponse.json({ ok: true, user: sessionUser })
  response.cookies.set("storefront_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  })

  return response
}
