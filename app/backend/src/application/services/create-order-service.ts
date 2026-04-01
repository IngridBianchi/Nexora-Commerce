import { v4 as uuidv4 } from "uuid"
import { CreateOrderInput, OrderItem, OrderRecord } from "../../domain/order"
import { OrderWriter } from "../ports/order-writer"
import { ProductCatalogReader } from "../ports/product-catalog-reader"

function calculateTotal(items: OrderItem[]): number {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  return Number(total.toFixed(2))
}

function aggregateQuantities(
  items: Array<{ productId: string; quantity: number }>
): Array<{ productId: string; quantity: number }> {
  const map = new Map<string, number>()

  for (const item of items) {
    const current = map.get(item.productId) ?? 0
    map.set(item.productId, current + item.quantity)
  }

  return Array.from(map.entries()).map(([productId, quantity]) => ({ productId, quantity }))
}

export class BusinessRuleError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 409 | 422 = 422
  ) {
    super(message)
    this.name = "BusinessRuleError"
  }
}

export class CreateOrderService {
  constructor(
    private readonly orderWriter: OrderWriter,
    private readonly productCatalogReader: ProductCatalogReader,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(input: CreateOrderInput): Promise<{ orderId: string; total: number; status: "PENDING" }> {
    const reservations = aggregateQuantities(input.items)
    const catalog = await this.productCatalogReader.getProductsByIds(
      reservations.map((reservation) => reservation.productId)
    )

    const catalogById = new Map(catalog.map((product) => [product.id, product]))

    for (const reservation of reservations) {
      const product = catalogById.get(reservation.productId)
      if (!product) {
        throw new BusinessRuleError(
          `Product '${reservation.productId}' does not exist`,
          422
        )
      }

      if (product.stock < reservation.quantity) {
        throw new BusinessRuleError(
          `Insufficient stock for product '${reservation.productId}'`,
          409
        )
      }
    }

    const normalizedItems: OrderItem[] = input.items.map((item) => {
      const product = catalogById.get(item.productId)
      if (!product) {
        throw new BusinessRuleError(
          `Product '${item.productId}' does not exist`,
          422
        )
      }

      return {
        productId: item.productId,
        name: product.name,
        unitPrice: Number(product.price.toFixed(2)),
        quantity: item.quantity
      }
    })

    const order: OrderRecord = {
      ...input,
      items: normalizedItems,
      orderId: uuidv4(),
      total: calculateTotal(normalizedItems),
      status: "PENDING",
      createdAt: this.now().toISOString()
    }

    await this.orderWriter.create(order, reservations)

    return {
      orderId: order.orderId,
      total: order.total,
      status: "PENDING"
    }
  }
}
