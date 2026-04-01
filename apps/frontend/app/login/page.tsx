"use client"

import React from "react"
import { FormEvent, Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  KeyRound,
  LogIn,
  Mail,
  ShieldCheck,
  User,
  UserPlus
} from "lucide-react"

type AuthMode = "login" | "register" | "forgot" | "reset" | "verify"

type AuthSuccessResponse = {
  ok: boolean
  verificationUrl?: string
  resetUrl?: string
  alreadyVerified?: boolean
  delivery?: "email" | "demo-link"
  warning?: string
}

function getInitialMode(value: string | null): AuthMode {
  if (value === "register" || value === "forgot" || value === "reset" || value === "verify") {
    return value
  }

  return "login"
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") ?? "/"

  const [mode, setMode] = useState<AuthMode>(() => getInitialMode(searchParams.get("mode")))
  const [name, setName] = useState("")
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [token, setToken] = useState(() => searchParams.get("token") ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [actionUrl, setActionUrl] = useState("")

  useEffect(() => {
    setMode(getInitialMode(searchParams.get("mode")))
    setEmail(searchParams.get("email") ?? "")
    setToken(searchParams.get("token") ?? "")
  }, [searchParams])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")
    setActionUrl("")

    if ((mode === "register" || mode === "reset") && password !== confirmPassword) {
      setError("Las contrasenas no coinciden")
      setLoading(false)
      return
    }

    const endpointByMode: Record<AuthMode, string> = {
      login: "/api/storefront/auth/login",
      register: "/api/storefront/auth/register",
      forgot: "/api/storefront/auth/request-password-reset",
      reset: "/api/storefront/auth/reset-password",
      verify: "/api/storefront/auth/verify-email"
    }

    const bodyByMode: Record<AuthMode, Record<string, string>> = {
      login: { email, password },
      register: { name, email, password },
      forgot: { email },
      reset: { email, token, password },
      verify: { email, token }
    }

    const response = await fetch(endpointByMode[mode], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyByMode[mode])
    })

    const data = (await response.json().catch(() => null)) as ({ error?: string } & AuthSuccessResponse) | null

    if (response.ok) {
      if (mode === "login" || mode === "reset" || mode === "verify") {
        router.push(from)
        return
      }

      if (mode === "register") {
        setMode("verify")
        setMessage(
          data?.delivery === "email"
            ? "Cuenta creada. Te enviamos un email de verificacion para completar la activacion."
            : "Cuenta creada. Verifica tu email para completar la activacion."
        )
        setActionUrl(data?.delivery === "demo-link" ? data?.verificationUrl ?? "" : "")
        setToken("")
        setPassword("")
        setConfirmPassword("")
        if (data?.warning) {
          setError(data.warning)
        }
        setLoading(false)
        return
      }

      setMessage(
        data?.delivery === "email"
          ? "Si el email existe, enviamos un correo con instrucciones para restablecer la contrasena."
          : "Si el email existe, generamos un enlace temporal para restablecer la contrasena."
      )
      setActionUrl(data?.delivery === "demo-link" ? data?.resetUrl ?? "" : "")
      if (data?.warning) {
        setError(data.warning)
      }
      setLoading(false)
      return
    }

    setError(
      data?.error ??
        (mode === "login"
          ? "No se pudo iniciar sesion"
          : mode === "register"
            ? "No se pudo registrar la cuenta"
            : mode === "forgot"
              ? "No se pudo generar el enlace de recuperacion"
              : mode === "reset"
                ? "No se pudo restablecer la contrasena"
                : "No se pudo verificar el email")
    )
    setLoading(false)
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError("")
    setMessage("")
    setActionUrl("")
    setPassword("")
    setConfirmPassword("")
    setToken(searchParams.get("token") ?? "")
  }

  const isSubmitDisabled =
    loading ||
    !email ||
    ((mode === "login" || mode === "register" || mode === "reset") && !password) ||
    ((mode === "register" || mode === "reset") && !confirmPassword) ||
    (mode === "register" && !name) ||
    ((mode === "reset" || mode === "verify") && !token)

  const titleByMode: Record<AuthMode, string> = {
    login: "Iniciar sesion",
    register: "Crear cuenta",
    forgot: "Recuperar acceso",
    reset: "Definir nueva contrasena",
    verify: "Verificar email"
  }

  const descriptionByMode: Record<AuthMode, string> = {
    login: "Accede para autocompletar el checkout.",
    register: "Registrate para guardar tus datos y agilizar futuras compras.",
    forgot: "Solicita un enlace temporal para recuperar tu cuenta.",
    reset: "Ingresa el token recibido y define una nueva contrasena.",
    verify: "Confirma tu email con el token de verificacion."
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la tienda
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-800">
            <Image src="/logo.png" alt="Nexora" width={180} height={42} className="h-10 w-auto" priority />
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Iniciar sesion
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Registrarme
            </button>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">{titleByMode[mode]}</h1>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck className="h-4 w-4" />
            {descriptionByMode[mode]}
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === "register" && (
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                  Nombre
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {(mode === "login" || mode === "register" || mode === "reset") && (
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                  Contrasena
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                {(mode === "register" || mode === "reset") && (
                  <p className="mt-1 text-xs text-slate-500">Minimo 8 caracteres.</p>
                )}
              </div>
            )}

            {(mode === "register" || mode === "reset") && (
              <div>
                <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
                  Confirmar contrasena
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            )}

            {(mode === "reset" || mode === "verify") && (
              <div>
                <label htmlFor="token" className="mb-1 block text-sm font-medium text-slate-700">
                  Token
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="token"
                    type="text"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-emerald-700">{message}</p>}
            {actionUrl && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                En modo demo generamos el enlace directamente. Abre {" "}
                <Link href={actionUrl} className="font-semibold underline underline-offset-2">
                  este enlace seguro
                </Link>
                .
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {mode === "login" ? (
                <LogIn className="h-4 w-4" />
              ) : mode === "register" ? (
                <UserPlus className="h-4 w-4" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {loading
                ? "Procesando..."
                : mode === "login"
                  ? "Ingresar"
                  : mode === "register"
                    ? "Crear cuenta"
                    : mode === "forgot"
                      ? "Enviar enlace"
                      : mode === "reset"
                        ? "Guardar nueva contrasena"
                        : "Confirmar email"}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            {mode !== "login" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-medium text-slate-600 hover:text-slate-900"
              >
                Ya tengo cuenta
              </button>
            )}
            {mode !== "register" && (
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="font-medium text-slate-600 hover:text-slate-900"
              >
                Crear una cuenta
              </button>
            )}
            {mode !== "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="font-medium text-slate-600 hover:text-slate-900"
              >
                Olvide mi contrasena
              </button>
            )}
            {mode !== "verify" && email && (
              <button
                type="button"
                onClick={async () => {
                  setLoading(true)
                  setError("")
                  setMessage("")
                  setActionUrl("")

                  const response = await fetch("/api/storefront/auth/request-email-verification", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                  })

                  const data = (await response.json().catch(() => null)) as AuthSuccessResponse | { error?: string } | null

                  if (response.ok) {
                    setMode("verify")
                    setMessage(
                      data && "alreadyVerified" in data && data.alreadyVerified
                        ? "Ese email ya esta verificado."
                        : data && "delivery" in data && data.delivery === "email"
                          ? "Enviamos un nuevo email de verificacion."
                          : "Generamos un nuevo enlace de verificacion."
                    )
                    setActionUrl(
                      data && "delivery" in data && data.delivery === "demo-link" && "verificationUrl" in data
                        ? data.verificationUrl ?? ""
                        : ""
                    )
                    if (data && "warning" in data && data.warning) {
                      setError(data.warning)
                    }
                  } else {
                    setError((data && "error" in data && data.error) || "No se pudo generar el enlace de verificacion")
                  }

                  setLoading(false)
                }}
                className="font-medium text-slate-600 hover:text-slate-900"
              >
                Reenviar verificacion
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default function StorefrontLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
