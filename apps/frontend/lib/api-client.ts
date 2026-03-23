import { OrderRequest, Product } from "./types"

interface ProductsResponse {
  data?: Product[]
}

interface CreateOrderResponse {
  message: string
  orderId: string
  total: number
  status: string
}

const DEFAULT_API_BASE_URL = "http://localhost:3000/dev"

function getApiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (!value) {
    return DEFAULT_API_BASE_URL
  }

  return value.replace(/\/$/, "")
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      },
      signal: controller.signal,
      cache: "no-store"
    })

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getProducts(): Promise<Product[]> {
  const payload = await fetchJson<ProductsResponse>(`${getApiBaseUrl()}/products?limit=100`)

  if (!Array.isArray(payload.data)) {
    return []
  }

  return payload.data.filter((product): product is Product => {
    return (
      typeof product.id === "string" &&
      typeof product.name === "string" &&
      typeof product.description === "string" &&
      typeof product.price === "number" &&
      typeof product.imageUrl === "string"
    )
  })
}

export async function createOrder(payload: OrderRequest): Promise<CreateOrderResponse> {
  return fetchJson<CreateOrderResponse>(`${getApiBaseUrl()}/orders`, {
    method: "POST",
    body: JSON.stringify(payload)
  })
}
