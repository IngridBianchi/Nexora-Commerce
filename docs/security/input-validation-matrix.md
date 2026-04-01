# Matriz de validacion de entradas - Backend

Estado: Version 1.0 (2026-03-31)

## Cobertura

| Endpoint | Validaciones aplicadas | Respuesta de error |
|---|---|---|
| `GET /v1/products` | `limit` parseado como entero (`Number.parseInt` + `isNaN`) | `400` |
| `POST /v1/orders` | JSON valido + esquema y reglas de negocio (`validateCreateOrderInput`) | `400` / `422` / `409` |
| `POST /v1/checkout/session` | Header `Idempotency-Key` (8..255), JSON valido, payload de checkout (`validateCreateCheckoutSessionInput`) | `400` / `422` |
| `POST /webhooks/stripe` | Body requerido, header `Stripe-Signature`, firma valida, `orderId` con regex | `400` |
| `GET /api/admin/orders` | Token admin configurado y token provisto valido | `401` |
| `POST /api/admin/auth` | JSON valido y token string presente | `400` / `401` / `503` |

## Resultado

Todos los endpoints expuestos en backend tienen validacion de entrada previa al procesamiento de negocio.

Esto cubre el criterio de Fase 3 de validacion de entradas en endpoints expuestos.
