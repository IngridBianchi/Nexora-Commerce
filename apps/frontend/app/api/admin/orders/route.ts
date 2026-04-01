import { NextRequest, NextResponse } from "next/server"
import { getConfiguredAdminToken, readProvidedAdminToken } from "@/lib/admin-auth"
import { listAdminOrders } from "@/lib/admin-orders-service"

export async function GET(request: NextRequest) {
  const adminToken = getConfiguredAdminToken()
  const provided = readProvidedAdminToken(request)

  if (!adminToken || provided !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tableName = process.env.ORDERS_TABLE ?? "Products"

  try {
    const orders = await listAdminOrders(tableName)

    return NextResponse.json({ orders, total: orders.length })
  } catch (error) {
    console.error("Admin orders fetch failed:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}
