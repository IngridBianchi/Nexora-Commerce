import { APIGatewayProxyResult } from "aws-lambda"

function buildHeaders(origin: string) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store"
  }
}

export function jsonResponse(
  statusCode: number,
  body: unknown,
  origin: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: buildHeaders(origin),
    body: JSON.stringify(body)
  }
}

export function ok(body: unknown, origin: string): APIGatewayProxyResult {
  return jsonResponse(200, body, origin)
}

export function created(body: unknown, origin: string): APIGatewayProxyResult {
  return jsonResponse(201, body, origin)
}

export function badRequest(message: string, origin: string): APIGatewayProxyResult {
  return jsonResponse(400, { error: message }, origin)
}

export function unprocessableEntity(message: string, origin: string): APIGatewayProxyResult {
  return jsonResponse(422, { error: message }, origin)
}

export function conflict(message: string, origin: string): APIGatewayProxyResult {
  return jsonResponse(409, { error: message }, origin)
}

export function internalServerError(origin: string): APIGatewayProxyResult {
  return jsonResponse(500, { error: "Internal Server Error" }, origin)
}

export function parseJsonBody<T>(rawBody: string | null):
  | { success: true; data: T }
  | { success: false; error: string } {
  if (!rawBody) {
    return { success: false, error: "Request body is required" }
  }

  try {
    return { success: true, data: JSON.parse(rawBody) as T }
  } catch {
    return { success: false, error: "Invalid JSON body" }
  }
}
