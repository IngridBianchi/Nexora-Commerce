export interface Product {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string
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
    name: string
    unitPrice: number
    quantity: number
  }>
}
