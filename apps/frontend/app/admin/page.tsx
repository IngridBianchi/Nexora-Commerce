"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { LayoutDashboard, LogOut, Receipt, RefreshCw, Timer, Wallet } from "lucide-react"

interface Order {
  orderId: string
  email: string
  name: string
  status: string
  total: number
  createdAt: string | null
  itemCount: number
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CANCELLED: "bg-gray-100 text-gray-700",
  FAILED: "bg-red-100 text-red-800",
  UNKNOWN: "bg-gray-100 text-gray-500"
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? STATUS_COLORS["UNKNOWN"]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents)
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(iso))
}

export default function AdminDashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<string>("ALL")

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/orders")
      if (res.status === 401) {
        router.push("/admin/login")
        return
      }
      if (!res.ok) throw new Error("Error al cargar ordenes")
      const data = await res.json() as { orders: Order[] }
      setOrders(data.orders)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { void fetchOrders() }, [fetchOrders])

  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.status === filter)

  const stats = {
    total: orders.length,
    paid: orders.filter((o) => o.status === "PAID").length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    revenue: orders.filter((o) => o.status === "PAID").reduce((sum, o) => sum + o.total, 0)
  }

  function handleLogout() {
    document.cookie = "admin_token=; Max-Age=0; path=/"
    router.push("/admin/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Nexora"
            width={160}
            height={38}
            priority
            className="h-9 w-auto"
          />
          <div>
          <h1 className="inline-flex items-center gap-2 text-xl font-bold text-white">
            <LayoutDashboard className="h-5 w-5" />
            Nexora Admin
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">Dashboard de órdenes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { void fetchOrders() }}
            className="inline-flex items-center gap-2 rounded-full bg-slate-800/90 px-3 py-1.5 text-sm text-white hover:bg-slate-700 font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2.4} />
            Actualizar
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full bg-rose-900/60 px-3 py-1.5 text-sm text-rose-100 hover:bg-rose-800 transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.4} />
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total órdenes",
              value: stats.total,
              color: "text-gray-900",
              icon: Receipt,
              iconBg: "bg-slate-900",
              iconColor: "text-white"
            },
            {
              label: "Pagadas",
              value: stats.paid,
              color: "text-green-700",
              icon: Wallet,
              iconBg: "bg-emerald-100",
              iconColor: "text-emerald-700"
            },
            {
              label: "Pendientes",
              value: stats.pending,
              color: "text-yellow-700",
              icon: Timer,
              iconBg: "bg-amber-100",
              iconColor: "text-amber-700"
            },
            {
              label: "Revenue (PAID)",
              value: formatCurrency(stats.revenue),
              color: "text-indigo-700",
              icon: Wallet,
              iconBg: "bg-indigo-100",
              iconColor: "text-indigo-700"
            }
          ].map(({ label, value, color, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} strokeWidth={2.5} />
                </span>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
              </div>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {["ALL", "PAID", "PENDING", "CANCELLED", "FAILED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === s
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s === "ALL" ? "Todas" : s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Cargando órdenes...</div>
          ) : error ? (
            <div className="p-12 text-center text-red-600 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No hay órdenes para mostrar</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Orden ID", "Cliente", "Email", "Estado", "Total", "Items", "Fecha"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((order) => (
                  <tr key={order.orderId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 max-w-[120px] truncate">
                      {order.orderId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{order.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{order.email}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(order.total)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{order.itemCount}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
