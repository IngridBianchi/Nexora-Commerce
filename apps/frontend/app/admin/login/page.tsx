"use client"

import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { useState, FormEvent, Suspense } from "react"
import { KeyRound, LockKeyhole, LogIn } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") ?? "/admin"
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    })

    if (res.ok) {
      router.push(from)
    } else {
      setError("Token incorrecto")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="mb-4 rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-800">
          <Image
            src="/logo.png"
            alt="Nexora"
            width={180}
            height={42}
            priority
            className="h-10 w-auto"
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Nexora Admin</h1>
        <p className="inline-flex items-center gap-2 text-sm text-gray-500 mb-6">
          <LockKeyhole className="h-4 w-4" />
          Acceso restringido
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="token" className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <KeyRound className="h-4 w-4" />
              Token de acceso
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="token"
                type="password"
                autoComplete="current-password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="inline-flex w-full items-center justify-center gap-2 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Verificando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
