import { v4 as uuidv4 } from "uuid"
import { CreateOrderInput, OrderItem, OrderRecord } from "../../domain/order"
import { OrderWriter } from "../ports/order-writer"

function calculateTotal(items: OrderItem[]): number {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  return Number(total.toFixed(2))
}

export class CreateOrderService {
  constructor(
    private readonly orderWriter: OrderWriter,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(input: CreateOrderInput): Promise<{ orderId: string; total: number; status: "PENDING" }> {
    const order: OrderRecord = {
      ...input,
      orderId: uuidv4(),
      total: calculateTotal(input.items),
      status: "PENDING",
      createdAt: this.now().toISOString()
    }

    await this.orderWriter.create(order)

    return {
      orderId: order.orderId,
      total: order.total,
      status: order.status
    }
  }
}
