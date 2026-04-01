import { BatchGetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb"
import { Product } from "../../domain/product"
import { ProductReader } from "../../application/ports/product-reader"
import { ProductCatalogReader, ProductForOrder } from "../../application/ports/product-catalog-reader"
import { env } from "../../config/env"
import { db } from "../db/client"

const PRODUCT_IMAGE_FILE_NAMES: Record<string, string> = {
  "001": "remera.png",
  "002": "taza.png",
  "003": "gorra.png"
}

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Number(value.toFixed(2))
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      return Number(parsed.toFixed(2))
    }
  }

  return null
}

function resolveImageUrl(id: string, rawImageUrl: unknown): string {
  if (typeof rawImageUrl === "string" && rawImageUrl.trim().length > 0) {
    return rawImageUrl
  }

  const imageFileName = PRODUCT_IMAGE_FILE_NAMES[id]
  const productImagesBaseUrl = env.productImagesBaseUrl.replace(/\/+$/, "")

  if (imageFileName && productImagesBaseUrl.length > 0) {
    return `${productImagesBaseUrl}/${imageFileName}`
  }

  const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)
  const seed = sanitized.length > 0 ? sanitized : "nexora-product"
  return `https://picsum.photos/seed/${seed}/300/200`
}

function toProduct(item: unknown): Product | null {
  if (typeof item !== "object" || item === null) {
    return null
  }

  const candidate = item as Record<string, unknown>
  const id =
    typeof candidate.id === "string" && candidate.id.trim().length > 0
      ? candidate.id.trim()
      : typeof candidate.PK === "string"
        ? candidate.PK.replace(/^PRODUCT#/i, "").trim()
        : null

  const name =
    typeof candidate.name === "string" && candidate.name.trim().length > 0
      ? candidate.name.trim()
      : null

  if (!id || !name) {
    return null
  }

  const price = toPositiveNumber(candidate.price)
  if (price === null) {
    return null
  }

  const description =
    typeof candidate.description === "string" && candidate.description.trim().length > 0
      ? candidate.description.trim()
      : "Producto Nexora"

  return {
    id,
    name,
    description,
    price,
    imageUrl: resolveImageUrl(id, candidate.imageUrl)
  }
}

export class DynamoDbProductRepository implements ProductReader, ProductCatalogReader {
  constructor(private readonly tableName: string) {}

  async getProductsByIds(ids: string[]): Promise<ProductForOrder[]> {
    const uniqueIds = Array.from(new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0)))
    if (uniqueIds.length === 0) {
      return []
    }

    const response = await db.send(
      new BatchGetCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: uniqueIds.map((id) => ({
              PK: `PRODUCT#${id}`,
              SK: "DETAILS"
            }))
          }
        }
      })
    )

    const rawItems = response.Responses?.[this.tableName]
    if (!rawItems || rawItems.length === 0) {
      return []
    }

    return rawItems
      .map((item): ProductForOrder | null => {
        const product = toProduct(item)
        if (!product) {
          return null
        }

        const stockRaw = (item as Record<string, unknown>).stock
        const stock =
          typeof stockRaw === "number"
            ? stockRaw
            : typeof stockRaw === "string"
              ? Number.parseInt(stockRaw, 10)
              : Number.NaN

        if (!Number.isInteger(stock) || stock < 0) {
          return null
        }

        return {
          id: product.id,
          name: product.name,
          price: product.price,
          stock
        }
      })
      .filter((product): product is ProductForOrder => product !== null)
  }

  async listProducts(limit: number): Promise<Product[]> {
    const result = await db.send(
      new ScanCommand({
        TableName: this.tableName,
        Limit: limit
      })
    )

    if (!result.Items || result.Items.length === 0) {
      return []
    }

    return result.Items.map(toProduct).filter((product): product is Product => product !== null)
  }
}
