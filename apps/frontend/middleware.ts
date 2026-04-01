import { NextRequest, NextResponse } from "next/server"
import { getConfiguredAdminToken, isAdminRequestAuthorized } from "@/lib/admin-auth"

/**
 * Protege las rutas /admin/* con autenticación básica por token.
 *
 * Upgrade path para producción: reemplazar este middleware con
 * NextAuth.js + Cognito, Auth0, o similar.
 *
 * Configuración: define ADMIN_TOKEN en .env.local
 * (mínimo 32 caracteres, generado con: openssl rand -hex 32)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next()
  }

  if (!getConfiguredAdminToken()) {
    // ADMIN_TOKEN no configurado — bloquear acceso
    return new NextResponse("Admin access not configured", { status: 503 })
  }

  if (!isAdminRequestAuthorized(request)) {
    // Redirigir al login
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/admin/login"
    if (pathname !== "/admin/login") {
      loginUrl.searchParams.set("from", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"]
}
