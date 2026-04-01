# Evidencia Fase 2 - Consistencia de pagos (concurrencia/reconciliacion)

Esta evidencia deja trazabilidad explicita de las pruebas que garantizan consistencia de ordenes y comportamiento idempotente en pagos Stripe.

## Cobertura de consistencia

1. Idempotencia de sesion de checkout por `Idempotency-Key`:
   - `create-checkout-session-handler.integration.test.ts`
2. Reconciliacion de webhook firmado y mapeo de estado:
   - `stripe-webhook-handler.integration.test.ts`
3. Reintentos/duplicados de webhook (idempotencia de reconciliacion):
   - `payment-reconciliation-consistency.integration.test.ts`

## Suite dedicada

Comando local:

```bash
cd app/backend
npm run test:payments-consistency
```

Script definido en `app/backend/package.json`:

```json
"test:payments-consistency": "node --test --require ts-node/register/transpile-only tests/create-checkout-session-handler.integration.test.ts tests/stripe-webhook-handler.integration.test.ts tests/payment-reconciliation-consistency.integration.test.ts"
```

## Evidencia en CI

Workflow:

- `.github/workflows/ci.yml`

Step obligatorio en `quality` job:

- `Backend payment consistency suite`

Esto asegura que cada push/PR a `main|master` vuelve a validar:

1. Sesion de pago con idempotency key.
2. Reconciliacion `checkout.session.completed -> PAID`.
3. Reconciliacion `checkout.session.expired -> CANCELLED`.
4. Webhook duplicado sin doble mutacion de estado (`UPDATED` luego `UNCHANGED`).

## Criterio de aceptacion asociado (Roadmap Fase 2)

- Tasa de ordenes duplicadas = 0 en pruebas de concurrencia/reintentos.
- Reconciliacion de estado cubierta por pruebas de integracion ejecutadas en CI.
