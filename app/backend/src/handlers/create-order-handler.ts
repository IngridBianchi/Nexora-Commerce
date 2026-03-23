import { APIGatewayProxyHandler } from "aws-lambda"
import { env } from "../config/env"
import { BusinessRuleError, CreateOrderService } from "../application/services/create-order-service"
import { validateCreateOrderInput } from "../application/validators/order-validator"
import { DynamoDbOrderRepository } from "../infra/repositories/dynamodb-order-repository"
import { DynamoDbProductRepository } from "../infra/repositories/dynamodb-product-repository"
import {
  badRequest,
  conflict,
  created,
  internalServerError,
  parseJsonBody,
  unprocessableEntity
} from "../shared/http"
import { emitMetric, logError, logInfo } from "../shared/observability"

interface CreateOrderServicePort {
  execute(input: {
    name: string
    email: string
    address: string
    items: Array<{
      productId: string
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
    new CreateOrderService(
      new DynamoDbOrderRepository(env.ordersTable, env.productsTable),
      new DynamoDbProductRepository(env.productsTable)
    )
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
      emitMetric("OrdersCreated", 1, {
        Function: "createOrder",
        Status: "Success"
      })
      logInfo("Order created", {
        requestId: event.requestContext?.requestId,
        orderId: createdOrder.orderId,
        total: createdOrder.total
      })
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
      if (error instanceof BusinessRuleError) {
        emitMetric("OrdersCreated", 1, {
          Function: "createOrder",
          Status: "BusinessError"
        })
        logError("createOrder business rule failed", {
          requestId: event.requestContext?.requestId,
          message: error.message,
          statusCode: error.statusCode
        })
        if (error.statusCode === 409) {
          return conflict(error.message, allowedOrigin)
        }

        return unprocessableEntity(error.message, allowedOrigin)
      }

      if (error instanceof Error && error.name === "TransactionCanceledException") {
        emitMetric("OrdersCreated", 1, {
          Function: "createOrder",
          Status: "Conflict"
        })
        emitMetric("BackendErrors", 1, {
          Function: "createOrder"
        })
        logError("createOrder transaction conflict", {
          requestId: event.requestContext?.requestId,
          message: error.message
        })
        return conflict("Could not reserve stock for one or more products", allowedOrigin)
      }

      emitMetric("OrdersCreated", 1, {
        Function: "createOrder",
        Status: "Error"
      })
      emitMetric("BackendErrors", 1, {
        Function: "createOrder"
      })
      logError("createOrderHandler failed", {
        requestId: event.requestContext?.requestId,
        message: error instanceof Error ? error.message : "Unknown error"
      })
      return internalServerError(allowedOrigin)
    }
  }
}

export const createOrderHandler = buildCreateOrderHandler()
