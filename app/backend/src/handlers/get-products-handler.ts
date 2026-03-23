import { APIGatewayProxyHandler } from "aws-lambda"
import { env } from "../config/env"
import { ListProductsService } from "../application/services/list-products-service"
import { DynamoDbProductRepository } from "../infra/repositories/dynamodb-product-repository"
import { badRequest, internalServerError, ok } from "../shared/http"
import { emitMetric, logError, logInfo } from "../shared/observability"

interface ListProductsServicePort {
  execute(limit?: number): Promise<unknown[]>
}

export function buildGetProductsHandler(dependencies?: {
  listProductsService?: ListProductsServicePort
  allowedOrigin?: string
}): APIGatewayProxyHandler {
  const listProductsService =
    dependencies?.listProductsService ??
    new ListProductsService(new DynamoDbProductRepository(env.productsTable))
  const allowedOrigin = dependencies?.allowedOrigin ?? env.allowedOrigin

  return async (event) => {
    const limitRaw = event.queryStringParameters?.limit
    let limit: number | undefined

    if (typeof limitRaw === "string") {
      limit = Number.parseInt(limitRaw, 10)
      if (Number.isNaN(limit)) {
        return badRequest("Query param 'limit' must be an integer", allowedOrigin)
      }
    }

    try {
      const products = await listProductsService.execute(limit)
      emitMetric("ProductsListed", 1, {
        Function: "getProducts",
        Status: "Success"
      })
      logInfo("Products listed", {
        requestId: event.requestContext?.requestId,
        count: products.length,
        limit: limit ?? null
      })
      return ok({ data: products }, allowedOrigin)
    } catch (error) {
      emitMetric("ProductsListed", 1, {
        Function: "getProducts",
        Status: "Error"
      })
      emitMetric("BackendErrors", 1, {
        Function: "getProducts"
      })
      logError("getProductsHandler failed", {
        message: error instanceof Error ? error.message : "Unknown error"
      })
      return internalServerError(allowedOrigin)
    }
  }
}

export const getProductsHandler = buildGetProductsHandler()
