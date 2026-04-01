import { NextRequest } from "next/server"

const MIN_ADMIN_TOKEN_LENGTH = 16

export function getConfiguredAdminToken(): string | null {
  const token = process.env.ADMIN_TOKEN?.trim() ?? ""
  if (token.length < MIN_ADMIN_TOKEN_LENGTH) {
    return null
  }

  return token
}

export function readProvidedAdminToken(request: NextRequest): string {
  const authHeader = request.headers.get("authorization") ?? ""
  const fromHeader = authHeader.replace(/^Bearer\s+/i, "").trim()
  const fromCookie = request.cookies.get("admin_token")?.value?.trim() ?? ""
  return fromHeader || fromCookie
}

export function isAdminRequestAuthorized(request: NextRequest): boolean {
  const configuredToken = getConfiguredAdminToken()
  if (!configuredToken) {
    return false
  }

  const provided = readProvidedAdminToken(request)
  return provided.length > 0 && provided === configuredToken
}
