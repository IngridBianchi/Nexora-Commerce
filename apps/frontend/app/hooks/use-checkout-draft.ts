import { useEffect, useState } from "react"
import {
  clearCheckoutDraft,
  isCheckoutDraftEmpty,
  loadCheckoutDraft,
  saveCheckoutDraft
} from "@/lib/checkout-draft"
import { normalizeCheckoutFormData } from "@/lib/checkout-validation"
import { CheckoutFormData } from "@/lib/types"

export function useCheckoutDraft(
  formData: CheckoutFormData,
  setFormData: (nextValue: CheckoutFormData | ((prev: CheckoutFormData) => CheckoutFormData)) => void
) {
  const [draftRestoredNotice, setDraftRestoredNotice] = useState<string | null>(null)

  useEffect(() => {
    const draft = loadCheckoutDraft()
    if (!draft) {
      return
    }

    setFormData(draft)
    setDraftRestoredNotice("Se restauro un borrador del checkout guardado en este navegador.")
  }, [setFormData])

  useEffect(() => {
    const normalized = normalizeCheckoutFormData(formData)
    if (isCheckoutDraftEmpty(normalized)) {
      clearCheckoutDraft()
      return
    }

    saveCheckoutDraft(normalized)
  }, [formData])

  return {
    draftRestoredNotice,
    setDraftRestoredNotice
  }
}
