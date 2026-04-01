import { NextRequest, NextResponse } from "next/server"
import { dispatchStorefrontPasswordResetEmail } from "@/lib/storefront-email"
import { createOpaqueStorefrontToken, hashOpaqueStorefrontToken, normalizeStorefrontEmail } from "@/lib/storefront-users"
import {
  findStorefrontUserByEmailInDb,
  resolveStorefrontUsersTableName,
  saveStorefrontUserInDb
} from "@/lib/storefront-users-service"

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30

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
    typeof (body as Record<string, unknown>)["email"] !== "string"
  ) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 })
  }

  const email = normalizeStorefrontEmail((body as Record<string, unknown>)["email"] as string)
  const tableName = resolveStorefrontUsersTableName()
  const user = await findStorefrontUserByEmailInDb(tableName, email)

  if (!user) {
    return NextResponse.json({ ok: true })
  }

  const token = createOpaqueStorefrontToken()
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString()

  user.passwordResetTokenHash = hashOpaqueStorefrontToken(token, secret)
  user.passwordResetExpiresAt = expiresAt

  await saveStorefrontUserInDb(tableName, user)

  const resetUrl = `${request.nextUrl.origin}/login?mode=reset&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
  const emailDispatch = await dispatchStorefrontPasswordResetEmail({
    email: user.email,
    name: user.name,
    resetUrl,
    expiresAt
  })

  return NextResponse.json({
    ok: true,
    resetUrl,
    expiresAt,
    delivery: emailDispatch.delivery,
    warning: emailDispatch.warning
  })
}
