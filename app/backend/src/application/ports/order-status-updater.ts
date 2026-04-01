import { OrderStatus } from "../../domain/order"

export interface OrderStatusUpdater {
  updateStatusByOrderId(orderId: string, status: OrderStatus): Promise<"UPDATED" | "UNCHANGED" | "NOT_FOUND">
}
