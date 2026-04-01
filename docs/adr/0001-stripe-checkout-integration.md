# ADR-0001: Integracion de pagos con Stripe Checkout + Webhook firmado

- Estado: Aceptado
- Fecha: 2026-03-27
- Autores: Equipo Nexora Commerce

## Contexto

Nexora Commerce necesitaba completar la Fase 2 del roadmap con un flujo de pago real y consistente, manteniendo:

1. Seguridad en confirmacion de pago.
2. Idempotencia para evitar cobros o sesiones duplicadas por reintentos.
3. Trazabilidad del estado de orden en backend.
4. Compatibilidad con la arquitectura actual en capas y Serverless.

Antes de esta decision, el backend solo creaba ordenes en estado `PENDING` y no existia confirmacion de pago externa.

## Decision

Se adopta Stripe Checkout Session con confirmacion asincrona por webhook firmado.

### Flujo decidido

1. Frontend crea orden en backend (`POST /orders`) con estado inicial `PENDING`.
2. Frontend solicita sesion de pago (`POST /checkout/session`) enviando `Idempotency-Key`.
3. Backend crea `Checkout Session` en Stripe y responde `sessionUrl`.
4. Frontend redirige al usuario a Stripe.
5. Stripe notifica al backend via `POST /webhooks/stripe`.
6. Backend verifica firma del webhook y actualiza estado de orden:
   - `checkout.session.completed` -> `PAID`
   - `checkout.session.expired` -> `CANCELLED`

### Controles de seguridad y consistencia

1. Verificacion de firma webhook obligatoria (`Stripe-Signature`).
2. Secrets de Stripe solo por variables de entorno (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
3. Idempotencia en creacion de sesion de pago usando `Idempotency-Key` y propagacion a Stripe.
4. Webhook idempotente en update de estado:
   - `UPDATED`, `UNCHANGED`, `NOT_FOUND`.

## Alternativas consideradas

### A) Stripe Payment Intents directo en frontend

- Pros:
  - Control fino del estado de pago.
- Contras:
  - Mayor complejidad inicial en frontend.
  - Mayor superficie de errores para una fase orientada a entrega rapida.

Resultado: descartada para esta fase.

### B) Confirmar pago solo desde redirect de frontend

- Pros:
  - Implementacion rapida.
- Contras:
  - No es confiable ni segura para confirmar pagos.
  - Puede perder eventos o aceptar estados inconsistentes.

Resultado: descartada por riesgo operativo.

### C) Stripe Checkout + Webhook firmado (decision actual)

- Pros:
  - Menor complejidad de UI.
  - Confirmacion de pago confiable server-to-server.
  - Buen balance entre velocidad de entrega y robustez.
- Contras:
  - Requiere endpoint webhook y manejo asincrono de estados.

Resultado: aceptada.

## Consecuencias

### Positivas

1. Se habilita pasarela de pago real en sandbox.
2. Se logra trazabilidad de orden con estados de negocio (`PENDING`, `PAID`, `FAILED`, `CANCELLED`).
3. Se reduce riesgo de duplicados por reintentos de red/usuario.
4. Se deja base lista para reconciliacion y observabilidad avanzada.

### Trade-offs

1. El flujo de pago pasa a ser asincrono y requiere manejo de retorno por query params.
2. Se agrega dependencia operativa en configuracion de webhook y secretos en entornos.

## Implementacion aplicada

### Backend

- Endpoint de creacion de sesion:
  - `POST /checkout/session`
- Endpoint webhook:
  - `POST /webhooks/stripe`
- Handler webhook con verificacion de firma y mapeo de eventos a estados.
- Repositorio DynamoDB extendido con actualizacion de estado por `orderId`.

### Frontend

- Checkout redirige a Stripe usando `sessionUrl`.
- Se envia `Idempotency-Key` al backend para cada intento.
- Retorno desde Stripe manejado en home:
  - `?checkout=success|cancelled&orderId=...`

## Operacion y secretos

Las claves deben almacenarse fuera de codigo:

1. Local: `.env` no versionado.
2. CI/CD: GitHub Actions Secrets.
3. Produccion: Parameter Store o Secrets Manager.

Variables requeridas:

- `STRIPE_SECRET_KEY` (server-side)
- `STRIPE_WEBHOOK_SECRET` (server-side, valor `whsec_...`)

## Criterios de aceptacion cumplidos

1. Integracion Stripe sandbox implementada.
2. Webhook de confirmacion con firma verificada implementado.
3. Estados de orden de Fase 2 implementados en dominio y actualizacion.
4. Idempotencia en pago implementada via `Idempotency-Key`.
5. Tests backend y frontend en verde tras integracion.

## Proximos pasos

1. Endurecer politicas de validacion de origen y replay-protection en webhook.
2. Persistir `sessionId` de Stripe en la orden para trazabilidad completa.
3. Instrumentar dashboard operativo para tasa de conversion de `PENDING -> PAID`.
