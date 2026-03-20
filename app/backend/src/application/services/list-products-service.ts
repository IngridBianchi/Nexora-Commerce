import { Product } from "../../domain/product"
import { ProductReader } from "../ports/product-reader"

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export class ListProductsService {
  constructor(
    private readonly productReader: ProductReader,
    private readonly defaultLimit = 50
  ) {}

  async execute(limit?: number): Promise<Product[]> {
    const resolvedLimit = clamp(limit ?? this.defaultLimit, 1, 100)
    return this.productReader.listProducts(resolvedLimit)
  }
}
