import { OrderRecord } from "../../domain/order"

export interface OrderWriter {
  create(
    order: OrderRecord,
    stockReservations: Array<{ productId: string; quantity: number }>
  ): Promise<void>
}
