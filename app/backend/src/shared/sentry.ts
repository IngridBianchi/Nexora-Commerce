import * as Sentry from "@sentry/aws-serverless"
import { APIGatewayProxyHandler } from "aws-lambda"
import { env } from "../config/env"

let initialized = false

/**
 * Initialises Sentry once per cold start.
 * Safe no-op when SENTRY_DSN is not configured — allows local and test runs
 * to work without any Sentry account.
 */
function initSentry(): void {
  if (initialized || !env.sentryDsn) {
    return
  }

  Sentry.init({
    dsn: env.sentryDsn,
    tracesSampleRate: 0.1,
    environment: process.env["STAGE"] ?? "dev",
    release: process.env["RELEASE"] ?? "local"
  })

  initialized = true
}

/**
 * Wraps a Lambda handler with Sentry error capture.
 * When SENTRY_DSN is not set, returns the handler unchanged (no-op).
 */
export function wrapWithSentry(handler: APIGatewayProxyHandler): APIGatewayProxyHandler {
  initSentry()

  if (!env.sentryDsn) {
    return handler
  }

  return Sentry.wrapHandler(handler) as APIGatewayProxyHandler
}
