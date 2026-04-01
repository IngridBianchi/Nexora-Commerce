# Threat Model - Nexora Commerce

Estado: Version 1.0 (2026-03-31)

## 1. Alcance

Componentes incluidos:

1. Frontend Next.js (`apps/frontend`).
2. API Serverless (`app/backend`) en API Gateway + Lambda.
3. Persistencia DynamoDB.
4. Integracion Stripe Checkout + webhook.
5. CI/CD GitHub Actions.

## 2. Activos criticos

1. Estado de orden (`PENDING`, `PAID`, `CANCELLED`).
2. Integridad de stock y totales.
3. Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_TOKEN`, credenciales AWS).
4. Disponibilidad de endpoints de compra (`/v1/orders`, `/v1/checkout/session`, `/webhooks/stripe`).

## 3. Fronteras de confianza

1. Navegador publico -> API Gateway.
2. Stripe -> webhook backend.
3. Lambda -> DynamoDB.
4. GitHub Actions -> AWS deploy.
5. Next.js server runtime -> rutas admin y token.

## 4. Amenazas principales y mitigaciones

### T1 - Falsificacion de webhook de pago

- Riesgo: Alto.
- Vector: requests falsas a `/webhooks/stripe`.
- Mitigacion aplicada:
  1. Verificacion criptografica de `Stripe-Signature`.
  2. Rechazo de eventos sin firma valida (400).
  3. Validacion de `orderId` con regex estricta.

### T2 - Duplicacion de orden/sesion por reintentos

- Riesgo: Alto.
- Vector: retries de cliente/red o entrega duplicada de webhook.
- Mitigacion aplicada:
  1. `Idempotency-Key` obligatorio para checkout session.
  2. Idempotencia en reconciliacion (`UPDATED` vs `UNCHANGED`).
  3. Suite de tests de consistencia en CI.

### T3 - Exposicion de secretos

- Riesgo: Alto.
- Vector: commit accidental o configuracion insegura.
- Mitigacion aplicada:
  1. Secrets en SSM SecureString.
  2. gitleaks en CI.
  3. Validacion de secrets requeridos antes de deploy.

### T4 - Bypass de autenticacion admin

- Riesgo: Medio-Alto.
- Vector: acceso directo a rutas admin o API admin sin token.
- Mitigacion aplicada:
  1. Middleware de rutas `/admin/*`.
  2. Verificacion de token en rutas API admin.
  3. Cookie `httpOnly` para token admin.

### T5 - Entrada maliciosa/invalid payload

- Riesgo: Medio.
- Vector: body invalido, parametros corruptos, payloads incompletos.
- Mitigacion aplicada:
  1. `parseJsonBody` con manejo uniforme.
  2. Validadores de orden/checkout.
  3. Errores 400/422 sin fuga de stack.

### T6 - CORS y browser abuse

- Riesgo: Medio.
- Vector: llamadas cross-origin indebidas.
- Mitigacion aplicada:
  1. CORS configurable por entorno para endpoints browser-facing.
  2. CORS deshabilitado para webhook (no navegador).
  3. Headers defensivos (`nosniff`, `DENY`, `no-referrer`).

## 5. Riesgos residuales

1. No hay MFA en admin.
2. No hay WAF/rate limiting gestionado por IP/ruta.
3. Riesgo de disponibilidad frente a picos extremos (fuera del presupuesto actual).

## 6. Plan de mitigacion siguiente

1. Integrar AWS WAF para `/v1/orders` y `/v1/checkout/session`.
2. Endurecer admin auth con proveedor dedicado (Cognito/Auth0).
3. Definir politica formal de rotacion trimestral automatizada.
