const DEFAULT_REGION = "us-east-1"
const DEFAULT_PRODUCTS_TABLE = "Products"
const DEFAULT_ORDERS_TABLE = "Orders"
const DEFAULT_ALLOWED_ORIGIN = "*"
const DEFAULT_PRODUCT_IMAGES_BASE_URL = ""

function readEnv(name: string, fallback: string): string {
  const rawValue = process.env[name]
  if (!rawValue) {
    return fallback
  }

  const value = rawValue.trim()
  return value.length > 0 ? value : fallback
}

export const env = {
  awsRegion: readEnv("AWS_REGION", DEFAULT_REGION),
  productsTable: readEnv("PRODUCTS_TABLE", DEFAULT_PRODUCTS_TABLE),
  ordersTable: readEnv("ORDERS_TABLE", DEFAULT_ORDERS_TABLE),
  allowedOrigin: readEnv("ALLOWED_ORIGIN", DEFAULT_ALLOWED_ORIGIN),
  productImagesBaseUrl: readEnv("PRODUCT_IMAGES_BASE_URL", DEFAULT_PRODUCT_IMAGES_BASE_URL),
  stripeSecretKey: readEnv("STRIPE_SECRET_KEY", ""),
  stripeWebhookSecret: readEnv("STRIPE_WEBHOOK_SECRET", ""),
  sentryDsn: readEnv("SENTRY_DSN", "")
}
