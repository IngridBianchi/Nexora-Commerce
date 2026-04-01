import { NextRequest, NextResponse } from "next/server"
import { verifyStorefrontSessionToken } from "@/lib/storefront-auth"

export async function GET(request: NextRequest) {
  const token = request.cookies.get("storefront_session")?.value ?? ""
  const secret = process.env.STOREFRONT_AUTH_SECRET?.trim() ?? ""

  if (!token || secret.length < 16) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const user = verifyStorefrontSessionToken(token, secret)
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({ authenticated: true, user })
}
