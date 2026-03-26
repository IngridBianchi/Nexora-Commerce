import { describe, expect, it } from "vitest"
import { filterProducts, getProductCategories } from "../lib/catalog-filters"
import { Product } from "../lib/types"

const sampleProducts: Product[] = [
  {
    id: "1",
    name: "Auriculares Pro",
    description: "Audio premium",
    price: 120,
    imageUrl: "https://example.com/1.jpg",
    category: "Audio",
    stock: 5
  },
  {
    id: "2",
    name: "Notebook Air",
    description: "Computacion ligera",
    price: 900,
    imageUrl: "https://example.com/2.jpg",
    category: "Computacion",
    stock: 0
  },
  {
    id: "3",
    name: "Cable USB-C",
    description: "Accesorio universal",
    price: 15,
    imageUrl: "https://example.com/3.jpg",
    stock: 20
  }
]

describe("catalog filters", () => {
  it("returns sorted categories with fallback General", () => {
    expect(getProductCategories(sampleProducts)).toEqual([
      "Audio",
      "Computacion",
      "General"
    ])
  })

  it("filters by search text", () => {
    const result = filterProducts(sampleProducts, {
      searchTerm: "auri",
      category: "all",
      minPrice: null,
      maxPrice: null,
      includeOutOfStock: true
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("1")
  })

  it("filters by category and price range", () => {
    const result = filterProducts(sampleProducts, {
      searchTerm: "",
      category: "Audio",
      minPrice: 100,
      maxPrice: 150,
      includeOutOfStock: true
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("1")
  })

  it("excludes out of stock products when includeOutOfStock is false", () => {
    const result = filterProducts(sampleProducts, {
      searchTerm: "",
      category: "all",
      minPrice: null,
      maxPrice: null,
      includeOutOfStock: false
    })

    expect(result.map((product) => product.id)).toEqual(["1", "3"])
  })
})
