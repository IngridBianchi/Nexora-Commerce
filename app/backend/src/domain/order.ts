export interface CreateOrderItemInput {
  productId: string
  quantity: number
}

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
  items: CreateOrderItemInput[]
}

export interface OrderRecord extends CreateOrderInput {
  orderId: string
  total: number
  status: "PENDING"
  createdAt: string
}
