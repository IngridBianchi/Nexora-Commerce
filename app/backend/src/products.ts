import { wrapWithSentry } from "./shared/sentry"
import { buildGetProductsHandler } from "./handlers/get-products-handler"

export const getProducts = wrapWithSentry(buildGetProductsHandler())