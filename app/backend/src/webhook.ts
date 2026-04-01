import { wrapWithSentry } from "./shared/sentry"
import { buildStripeWebhookHandler } from "./handlers/stripe-webhook-handler"

export const stripeWebhook = wrapWithSentry(buildStripeWebhookHandler())
