import Link from "next/link"
import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"
import { ChangeEvent } from "react"
import { CheckoutFormData } from "@/lib/types"
import { CheckoutStatus } from "@/app/hooks/use-checkout-flow"
import { StorefrontUser } from "@/app/hooks/use-storefront-user"

type CheckoutPanelProps = {
  cartItemsCount: number
  storefrontUser: StorefrontUser | null
  draftRestoredNotice: string | null
  checkoutStatus: CheckoutStatus
  checkoutMessage: string | null
  canRetryCheckout: boolean
  isSubmittingOrder: boolean
  formData: CheckoutFormData
  onFormChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRetryCheckout: () => void
  onCheckout: () => void
}

export function CheckoutPanel({
  cartItemsCount,
  storefrontUser,
  draftRestoredNotice,
  checkoutStatus,
  checkoutMessage,
  canRetryCheckout,
  isSubmittingOrder,
  formData,
  onFormChange,
  onRetryCheckout,
  onCheckout
}: CheckoutPanelProps) {
  if (cartItemsCount === 0) {
    return null
  }

  const unverifiedStorefrontUser = storefrontUser && !storefrontUser.emailVerified ? storefrontUser : null
  const requiresVerifiedEmail = Boolean(unverifiedStorefrontUser)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">Finalizar compra</h2>

      {storefrontUser ? (
        <p className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Sesion iniciada como <strong>{storefrontUser.email}</strong>. Nombre y correo se autocompletan.
        </p>
      ) : (
        <p className="mb-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Puedes comprar como invitado o <Link href="/login?from=/" className="font-medium text-indigo-700 underline">iniciar sesion</Link> para autocompletar tus datos.
        </p>
      )}

      {unverifiedStorefrontUser && (
        <p className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Tu cuenta tiene sesion activa, pero el email aun no fue verificado. {" "}
          <Link href={`/login?mode=verify&email=${encodeURIComponent(unverifiedStorefrontUser.email)}`} className="font-medium underline">
            Completar verificacion
          </Link>
        </p>
      )}

      {draftRestoredNotice && (
        <p className="mb-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {draftRestoredNotice}
        </p>
      )}

      {checkoutStatus !== "idle" && checkoutMessage && (
        <div
          className={`mb-4 rounded border px-3 py-2 text-sm ${
            checkoutStatus === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : checkoutStatus === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
          role={checkoutStatus === "error" ? "alert" : "status"}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{checkoutMessage}</span>
            {checkoutStatus === "loading" && (
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-blue-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                Enviando
              </span>
            )}
          </div>

          {checkoutStatus === "error" && canRetryCheckout && (
            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRetryCheckout}
                disabled={isSubmittingOrder}
              >
                Reintentar compra
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <Input
          name="name"
          placeholder="Nombre completo"
          value={formData.name}
          onChange={onFormChange}
          minLength={2}
        />
        <Input
          name="email"
          type="email"
          placeholder="Correo electronico"
          value={formData.email}
          onChange={onFormChange}
        />
        <Input
          name="address"
          placeholder="Direccion de envio"
          value={formData.address}
          onChange={onFormChange}
          minLength={8}
        />
        <Button className="w-full" onClick={onCheckout} disabled={isSubmittingOrder || requiresVerifiedEmail}>
          {isSubmittingOrder ? "Procesando compra..." : "Confirmar compra"}
        </Button>
      </div>
    </div>
  )
}
