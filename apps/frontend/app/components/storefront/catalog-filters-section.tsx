import { Filter } from "lucide-react"
import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"

type CatalogFiltersSectionProps = {
  hasActiveFilters: boolean
  onResetFilters: () => void
  searchTerm: string
  onSearchTermChange: (value: string) => void
  selectedCategory: string
  onSelectedCategoryChange: (value: string) => void
  availableCategories: string[]
  minPriceInput: string
  onMinPriceInputChange: (value: string) => void
  maxPriceInput: string
  onMaxPriceInputChange: (value: string) => void
  includeOutOfStock: boolean
  onIncludeOutOfStockChange: (value: boolean) => void
}

export function CatalogFiltersSection({
  hasActiveFilters,
  onResetFilters,
  searchTerm,
  onSearchTermChange,
  selectedCategory,
  onSelectedCategoryChange,
  availableCategories,
  minPriceInput,
  onMinPriceInputChange,
  maxPriceInput,
  onMaxPriceInputChange,
  includeOutOfStock,
  onIncludeOutOfStockChange
}: CatalogFiltersSectionProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
          <Filter className="h-4 w-4" />
          Filtro en vivo
        </h2>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onResetFilters}>Limpiar filtros</Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Input
          placeholder="Buscar por nombre o descripcion"
          className="md:col-span-2"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
        />

        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
          value={selectedCategory}
          onChange={(event) => onSelectedCategoryChange(event.target.value)}
        >
          <option value="all">Todas las categorias</option>
          {availableCategories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <Input
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="Precio minimo"
          value={minPriceInput}
          onChange={(event) => onMinPriceInputChange(event.target.value)}
        />

        <Input
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="Precio maximo"
          value={maxPriceInput}
          onChange={(event) => onMaxPriceInputChange(event.target.value)}
        />
      </div>

      <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={includeOutOfStock}
          onChange={(event) => onIncludeOutOfStockChange(event.target.checked)}
        />
        Incluir productos agotados
      </label>
    </section>
  )
}
