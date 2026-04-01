import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useCatalogFilters } from "@/app/hooks/use-catalog-filters"
import { Product } from "@/lib/types"

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

describe("useCatalogFilters", () => {
  it("returns categories and excludes out-of-stock by default", () => {
    const { result } = renderHook(() => useCatalogFilters(sampleProducts))

    expect(result.current.availableCategories).toEqual(["Audio", "Computacion", "General"])
    expect(result.current.filteredProducts.map((product) => product.id)).toEqual(["1", "3"])
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it("applies search and category filters", () => {
    const { result } = renderHook(() => useCatalogFilters(sampleProducts))

    act(() => {
      result.current.setIncludeOutOfStock(true)
      result.current.setSearchTerm("note")
      result.current.setSelectedCategory("Computacion")
    })

    expect(result.current.hasActiveFilters).toBe(true)
    expect(result.current.filteredProducts.map((product) => product.id)).toEqual(["2"])
  })

  it("resets filters back to default state", () => {
    const { result } = renderHook(() => useCatalogFilters(sampleProducts))

    act(() => {
      result.current.setSearchTerm("auri")
      result.current.setMinPriceInput("100")
      result.current.setMaxPriceInput("200")
      result.current.setIncludeOutOfStock(true)
    })

    act(() => {
      result.current.resetFilters()
    })

    expect(result.current.searchTerm).toBe("")
    expect(result.current.minPriceInput).toBe("")
    expect(result.current.maxPriceInput).toBe("")
    expect(result.current.includeOutOfStock).toBe(false)
    expect(result.current.selectedCategory).toBe("all")
    expect(result.current.hasActiveFilters).toBe(false)
  })
})
