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

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: string
  ) {
    super(message)
    this.name = "ApiError"
  }
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
      const rawBody = await response.text()
      let errorMessage = `Request failed with status ${response.status}`

      if (rawBody) {
        try {
          const parsed = JSON.parse(rawBody) as { error?: string }
          if (typeof parsed.error === "string" && parsed.error.trim().length > 0) {
            errorMessage = parsed.error
          }
        } catch {
          // Keep generic status message when body is not JSON.
        }
      }

      throw new ApiError(response.status, errorMessage, rawBody)
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(408, "Request timeout")
    }

    throw new ApiError(0, "Network error")
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
