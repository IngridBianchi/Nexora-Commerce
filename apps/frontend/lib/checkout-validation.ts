import { CheckoutFormData } from "./types"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizedLength(value: string): number {
  return value.trim().length
}

export function validateCheckoutData(
  formData: CheckoutFormData,
  totalItems: number
): string | null {
  if (totalItems === 0) {
    return "No puedes finalizar una compra con el carrito vacio"
  }

  if (normalizedLength(formData.name) < 2) {
    return "Ingresa un nombre valido"
  }

  if (!EMAIL_REGEX.test(formData.email.trim())) {
    return "Ingresa un correo electronico valido"
  }

  if (normalizedLength(formData.address) < 8) {
    return "Ingresa una direccion de envio valida"
  }

  return null
}
