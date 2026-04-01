"use client"

import Image from "next/image"
import Link from "next/link"
import { LogIn, LogOut, ShoppingBag, UserRound } from "lucide-react"
import { rehydrateCartStore, useCartStore } from "@/store/cart"
import { ChangeEvent, useEffect, useState } from "react"
import { CheckoutFormData } from "@/lib/types"
import { useProductsCatalog } from "@/app/hooks/use-products-catalog"
import { useStorefrontUser } from "@/app/hooks/use-storefront-user"
import { useCheckoutDraft } from "@/app/hooks/use-checkout-draft"
import { useCheckoutFlow } from "@/app/hooks/use-checkout-flow"
import { useCatalogFilters } from "@/app/hooks/use-catalog-filters"
import { CatalogFiltersSection } from "@/app/components/storefront/catalog-filters-section"
import { ProductGridSection } from "@/app/components/storefront/product-grid-section"
import { CartPanel } from "@/app/components/storefront/cart-panel"
import { CheckoutPanel } from "@/app/components/storefront/checkout-panel"

const initialFormData: CheckoutFormData = {
  name: "",
  email: "",
  address: ""
}

export default function Home() {
  const cartItems = useCartStore((state) => state.items)
  const addItem = useCartStore((state) => state.addItem)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clearCart)
  const getTotal = useCartStore((state) => state.getTotal)
  const getItemsCount = useCartStore((state) => state.getItemsCount)
  const hasHydratedCart = useCartStore((state) => state.hasHydrated)

  const total = getTotal()
  const itemsCount = getItemsCount()

  const { products, productsError, isLoadingProducts } = useProductsCatalog()
  const {
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
  } = useCatalogFilters(products)
  const [formData, setFormData] = useState<CheckoutFormData>(initialFormData)
  const {
    storefrontUser,
    isLoadingStorefrontUser,
    logoutStorefrontUser
  } = useStorefrontUser()
  const { draftRestoredNotice, setDraftRestoredNotice } = useCheckoutDraft(formData, setFormData)
  const {
    checkoutStatus,
    checkoutMessage,
    isSubmittingOrder,
    canRetryCheckout,
    handleCheckout,
    handleRetryCheckout,
    resetCheckoutFeedback
  } = useCheckoutFlow({
    formData,
    setFormData,
    cartItems,
    itemsCount,
    clearCart,
    initialFormData,
    storefrontUser
  })

  useEffect(() => {
    void rehydrateCartStore()
  }, [])

  useEffect(() => {
    if (!storefrontUser) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      name: prev.name.trim().length === 0 ? storefrontUser.name : prev.name,
      email: prev.email.trim().length === 0 ? storefrontUser.email : prev.email
    }))
  }, [storefrontUser])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setDraftRestoredNotice(null)
    resetCheckoutFeedback()
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <main className="min-h-screen p-6 lg:p-8">
      <div className="mb-8 flex items-center gap-4 rounded-2xl bg-slate-900 px-5 py-4 shadow-lg ring-1 ring-slate-800">
        <Image
          src="/logo.png"
          alt="Nexora"
          width={220}
          height={52}
          priority
          className="h-12 w-auto"
        />
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
            <ShoppingBag className="h-4 w-4 text-white" />
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white">
              Commerce
            </p>
          </div>

          {isLoadingStorefrontUser ? (
            <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200">
              Cargando sesion...
            </span>
          ) : storefrontUser ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-100">
                <UserRound className="h-4 w-4" />
                {storefrontUser.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  void logoutStorefrontUser()
                }}
                className="inline-flex items-center gap-2 rounded-full bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </button>
            </>
          ) : (
            <Link
              href="/login?from=/"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
            >
              <LogIn className="h-4 w-4" />
              Iniciar sesion
            </Link>
          )}
        </div>
      </div>

      {storefrontUser && !storefrontUser.emailVerified && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tu cuenta ya puede comprar, pero el email sigue pendiente de verificacion. {" "}
          <Link href={`/login?mode=verify&email=${encodeURIComponent(storefrontUser.email)}`} className="font-semibold underline underline-offset-2">
            Completar verificacion
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:items-start">

        {/* LEFT: catalog — filters + product grid */}
        <div className="flex flex-col gap-6">
          <CatalogFiltersSection
            hasActiveFilters={hasActiveFilters}
            onResetFilters={resetFilters}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onSelectedCategoryChange={setSelectedCategory}
            availableCategories={availableCategories}
            minPriceInput={minPriceInput}
            onMinPriceInputChange={setMinPriceInput}
            maxPriceInput={maxPriceInput}
            onMaxPriceInputChange={setMaxPriceInput}
            includeOutOfStock={includeOutOfStock}
            onIncludeOutOfStockChange={setIncludeOutOfStock}
          />

          <ProductGridSection
            productsError={productsError}
            isLoadingProducts={isLoadingProducts}
            filteredProducts={filteredProducts}
            cartItems={cartItems}
            onAddItem={addItem}
          />
        </div>

        {/* RIGHT: cart + checkout — sticky on desktop */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-8">
          <CartPanel
            hasHydratedCart={hasHydratedCart}
            itemsCount={itemsCount}
            total={total}
            cartItems={cartItems}
            onRemoveItem={removeItem}
            onClearCart={clearCart}
          />

          <CheckoutPanel
            cartItemsCount={cartItems.length}
            storefrontUser={storefrontUser}
            draftRestoredNotice={draftRestoredNotice}
            checkoutStatus={checkoutStatus}
            checkoutMessage={checkoutMessage}
            canRetryCheckout={canRetryCheckout}
            isSubmittingOrder={isSubmittingOrder}
            formData={formData}
            onFormChange={handleChange}
            onRetryCheckout={() => {
              void handleRetryCheckout()
            }}
            onCheckout={() => {
              void handleCheckout()
            }}
          />
        </div>

      </div>
    </main>
  )
}