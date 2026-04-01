import { NextRequest, NextResponse } from "next/server"
import { createStorefrontSessionToken, StorefrontSessionUser } from "@/lib/storefront-auth"
import { hashOpaqueStorefrontToken, normalizeStorefrontEmail } from "@/lib/storefront-users"
import {
  findStorefrontUserByEmailInDb,
  resolveStorefrontUsersTableName,
  saveStorefrontUserInDb
} from "@/lib/storefront-users-service"

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
    typeof (body as Record<string, unknown>)["token"] !== "string"
  ) {
    return NextResponse.json({ error: "Missing verification payload" }, { status: 400 })
  }

  const email = normalizeStorefrontEmail((body as Record<string, unknown>)["email"] as string)
  const token = ((body as Record<string, unknown>)["token"] as string).trim()
  const tableName = resolveStorefrontUsersTableName()
  const user = await findStorefrontUserByEmailInDb(tableName, email)

  if (!user || !user.emailVerificationTokenHash || !user.emailVerificationExpiresAt) {
    return NextResponse.json({ error: "Verification token not found" }, { status: 400 })
  }

  if (new Date(user.emailVerificationExpiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "Verification token expired" }, { status: 400 })
  }

  if (hashOpaqueStorefrontToken(token, secret) !== user.emailVerificationTokenHash) {
    return NextResponse.json({ error: "Invalid verification token" }, { status: 400 })
  }

  user.emailVerifiedAt = new Date().toISOString()
  user.emailVerificationTokenHash = null
  user.emailVerificationExpiresAt = null
  await saveStorefrontUserInDb(tableName, user)

  const sessionUser: StorefrontSessionUser = {
    email: user.email,
    name: user.name,
    emailVerified: true
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
