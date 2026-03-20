import { APIGatewayProxyHandler } from "aws-lambda"
import { env } from "../config/env"
import { CreateOrderService } from "../application/services/create-order-service"
import { validateCreateOrderInput } from "../application/validators/order-validator"
import { DynamoDbOrderRepository } from "../infra/repositories/dynamodb-order-repository"
import {
  badRequest,
  created,
  internalServerError,
  parseJsonBody,
  unprocessableEntity
} from "../shared/http"

interface CreateOrderServicePort {
  execute(input: {
    name: string
    email: string
    address: string
    items: Array<{
      productId: string
      name: string
      unitPrice: number
      quantity: number
    }>
  }): Promise<{ orderId: string; total: number; status: "PENDING" }>
}

export function buildCreateOrderHandler(dependencies?: {
  createOrderService?: CreateOrderServicePort
  allowedOrigin?: string
}): APIGatewayProxyHandler {
  const createOrderService =
    dependencies?.createOrderService ??
    new CreateOrderService(new DynamoDbOrderRepository(env.ordersTable))
  const allowedOrigin = dependencies?.allowedOrigin ?? env.allowedOrigin

  return async (event) => {
    const bodyResult = parseJsonBody<unknown>(event.body)
    if (!bodyResult.success) {
      return badRequest(bodyResult.error, allowedOrigin)
    }

    const inputResult = validateCreateOrderInput(bodyResult.data)
    if (!inputResult.success) {
      return unprocessableEntity(inputResult.error, allowedOrigin)
    }

    try {
      const createdOrder = await createOrderService.execute(inputResult.value)
      return created(
        {
          message: "Order created successfully",
          orderId: createdOrder.orderId,
          total: createdOrder.total,
          status: createdOrder.status
        },
        allowedOrigin
      )
    } catch (error) {
      console.error("createOrderHandler failed", {
        message: error instanceof Error ? error.message : "Unknown error"
      })
      return internalServerError(allowedOrigin)
    }
  }
}

export const createOrderHandler = buildCreateOrderHandler()
