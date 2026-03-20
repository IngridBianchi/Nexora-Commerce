import { OrderRecord } from "../../domain/order"

export interface OrderWriter {
  create(order: OrderRecord): Promise<void>
}
