export interface ProductForOrder {
  id: string
  name: string
  price: number
  stock: number
}

export interface ProductCatalogReader {
  getProductsByIds(ids: string[]): Promise<ProductForOrder[]>
}
