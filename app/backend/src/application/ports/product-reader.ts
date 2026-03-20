import { Product } from "../../domain/product"

export interface ProductReader {
  listProducts(limit: number): Promise<Product[]>
}
