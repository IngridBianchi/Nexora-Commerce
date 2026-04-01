export interface Product {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string
  category?: string
  stock?: number
}

export interface CartItem extends Product {
  quantity: number
}

export interface CheckoutFormData {
  name: string
  email: string
  address: string
}

export interface OrderRequest {
  name: string
  email: string
  address: string
  items: Array<{
    productId: string
    quantity: number
  }>
}

export interface CheckoutSessionRequest {
  orderId: string
  successUrl: string
  cancelUrl: string
  email?: string
  items: Array<{
    name: string
    unitPrice: number
    quantity: number
  }>
}
