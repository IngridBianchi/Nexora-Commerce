import { Product } from "@/lib/types"

export type ProductFilters = {
  searchTerm: string
  category: string
  minPrice: number | null
  maxPrice: number | null
  includeOutOfStock: boolean
}

export function resolveProductCategory(product: Product): string {
  const value = product.category?.trim()
  if (!value) {
    return "General"
  }

  return value
}

export function getProductCategories(products: Product[]): string[] {
  return Array.from(new Set(products.map(resolveProductCategory))).sort((a, b) =>
    a.localeCompare(b, "es")
  )
}

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  const term = filters.searchTerm.trim().toLowerCase()

  return products.filter((product) => {
    const productCategory = resolveProductCategory(product)

    const matchesSearch =
      term.length === 0 ||
      `${product.name} ${product.description}`.toLowerCase().includes(term)

    const matchesCategory =
      filters.category === "all" || productCategory === filters.category

    const matchesMinPrice =
      filters.minPrice === null || product.price >= filters.minPrice

    const matchesMaxPrice =
      filters.maxPrice === null || product.price <= filters.maxPrice

    const hasStock = typeof product.stock !== "number" || product.stock > 0
    const matchesStock = filters.includeOutOfStock ? true : hasStock

    return (
      matchesSearch &&
      matchesCategory &&
      matchesMinPrice &&
      matchesMaxPrice &&
      matchesStock
    )
  })
}
