import { NextRequest, NextResponse } from "next/server"
import { getConfiguredAdminToken } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  const adminToken = getConfiguredAdminToken()
  if (!adminToken) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
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
    typeof (body as Record<string, unknown>)["token"] !== "string"
  ) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  const provided = ((body as Record<string, unknown>)["token"] as string).trim()

  if (provided !== adminToken) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set("admin_token", adminToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8  // 8 horas
  })
  return response
}
