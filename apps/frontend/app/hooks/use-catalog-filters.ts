import { useMemo, useState } from "react"
import { filterProducts, getProductCategories } from "@/lib/catalog-filters"
import { Product } from "@/lib/types"

export function useCatalogFilters(products: Product[]) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [minPriceInput, setMinPriceInput] = useState("")
  const [maxPriceInput, setMaxPriceInput] = useState("")
  const [includeOutOfStock, setIncludeOutOfStock] = useState(false)

  const minPrice = useMemo(() => {
    if (!minPriceInput.trim()) {
      return null
    }

    const value = Number(minPriceInput)
    if (!Number.isFinite(value) || value < 0) {
      return null
    }

    return value
  }, [minPriceInput])

  const maxPrice = useMemo(() => {
    if (!maxPriceInput.trim()) {
      return null
    }

    const value = Number(maxPriceInput)
    if (!Number.isFinite(value) || value < 0) {
      return null
    }

    return value
  }, [maxPriceInput])

  const availableCategories = useMemo(() => getProductCategories(products), [products])

  const filteredProducts = useMemo(
    () =>
      filterProducts(products, {
        searchTerm,
        category: selectedCategory,
        minPrice,
        maxPrice,
        includeOutOfStock
      }),
    [products, searchTerm, selectedCategory, minPrice, maxPrice, includeOutOfStock]
  )

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    selectedCategory !== "all" ||
    minPriceInput.trim().length > 0 ||
    maxPriceInput.trim().length > 0 ||
    includeOutOfStock

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedCategory("all")
    setMinPriceInput("")
    setMaxPriceInput("")
    setIncludeOutOfStock(false)
  }

  return {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    minPriceInput,
    setMinPriceInput,
    maxPriceInput,
    setMaxPriceInput,
    includeOutOfStock,
    setIncludeOutOfStock,
    availableCategories,
    filteredProducts,
    hasActiveFilters,
    resetFilters
  }
}
