# Checklist OWASP ASVS Adaptado - Nexora Commerce

Estado: Version 1.0 (2026-03-31)

Este checklist adapta controles de OWASP ASVS a la arquitectura actual (Next.js + AWS Lambda + API Gateway + DynamoDB + Stripe webhook).

## V1 - Arquitectura y modelado de amenazas

- [x] Existe threat model versionado por activos, fronteras de confianza y amenazas.
- [x] Se identifican superficies externas: API publica, webhook Stripe, frontend publico.
- [x] Se definen riesgos por severidad y mitigaciones implementadas.

## V2 - Autenticacion

- [x] Dashboard admin protegido por token y middleware de servidor.
- [x] Token admin no expuesto al cliente (`ADMIN_TOKEN` solo server-side).
- [ ] MFA para acceso admin (pendiente, fuera de alcance MVP).

## V3 - Gestion de sesiones

- [x] Cookie admin `httpOnly`, `sameSite=lax`, `secure` en prod.
- [x] Logout invalida cookie de sesion.
- [ ] Rotacion automatica de sesion por inactivity timeout (pendiente).

## V4 - Control de acceso

- [x] Endpoints admin validan token configurado y token provisto.
- [x] Lambda IAM aplica principio de privilegios minimos para DynamoDB/X-Ray.
- [x] Webhook Stripe no depende de CORS ni sesion de navegador.

## V5 - Validacion, sanitizacion y encoding

- [x] Todos los endpoints parsean JSON con manejo de error consistente.
- [x] Ordenes: validacion estructural y de reglas de negocio en backend.
- [x] Checkout session: validacion de payload e `Idempotency-Key`.
- [x] Webhook: validacion de firma y formato de `orderId`.
- [x] `limit` en productos validado como entero.

## V7 - Manejo de errores y logging

- [x] Respuestas de error estandarizadas (400/409/422/500).
- [x] Errores internos no exponen stack traces al cliente.
- [x] Logging estructurado con eventos de error e info.

## V8 - Proteccion de datos

- [x] Secrets de Stripe y Sentry gestionados via SSM SecureString.
- [x] Sin secretos hardcodeados en repositorio.
- [x] Cache-Control `no-store` en respuestas backend sensibles.

## V9 - Comunicaciones

- [x] Origen permitido configurable por entorno (`ALLOWED_ORIGIN`).
- [x] Webhook recibe eventos por HTTPS (infra AWS + Stripe).

## V10 - API y servicios backend

- [x] Contrato API versionado (`/v1`) para endpoints de negocio.
- [x] Idempotencia de pago en creacion de session Stripe.
- [x] Reconciliacion de estado por webhook idempotente (`UPDATED`/`UNCHANGED`).

## V12 - Configuracion segura

- [x] CI ejecuta SAST (CodeQL), `npm audit --audit-level=high` y gitleaks.
- [x] CI falla ante vulnerabilidades high/critical via audit.
- [x] Deploy valida presencia de secrets requeridos.

## Gap abierto para fases futuras

1. MFA y politicas RBAC avanzadas para admin.
2. Rate limiting/WAF por endpoint publico.
3. Politica automatizada de expiracion/rotacion de sesiones admin.
