import { wrapWithSentry } from "./shared/sentry"
import { buildCreateOrderHandler } from "./handlers/create-order-handler"

export const createOrder = wrapWithSentry(buildCreateOrderHandler())