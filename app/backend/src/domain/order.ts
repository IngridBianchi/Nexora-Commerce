export interface OrderItem {
  productId: string
  name: string
  unitPrice: number
  quantity: number
}

export interface CreateOrderInput {
  name: string
  email: string
  address: string
  items: OrderItem[]
}

export interface OrderRecord extends CreateOrderInput {
  orderId: string
  total: number
  status: "PENDING"
  createdAt: string
}
