# Nexora Commerce

Monorepo de e-commerce con frontend en Next.js, backend serverless en AWS y paquetes compartidos para UI y configuracion de desarrollo.

## Contenido

- [Portfolio / Demo rápida](#portfolio--demo-rápida)
- Vision general
- Arquitectura del monorepo
- Stack tecnologico
- Requisitos
- Instalacion
- Configuracion de entorno
- Ejecucion local
- Backend: calidad, despliegue y verificacion
- API
- Scripts utiles
- Seguridad y calidad
- Observabilidad operativa
- Plataforma y escalabilidad
- Decisiones de arquitectura (ADRs)
- Costo estimado AWS
- Troubleshooting

## Portfolio / Demo rápida

Enlace único de acceso al proyecto para revisores técnicos y reclutadores:

| Recurso | Acceso |
|---------|--------|
| Repositorio completo | Este repositorio (monorepo) |
| API sandbox (dev, en vivo) | [`GET /v1/products`](https://bhyrxu22xc.execute-api.us-east-1.amazonaws.com/dev/v1/products) |
| Frontend (local, < 2 min) | `npm install && cd apps/frontend && npm run dev` → http://localhost:3000 |
| OpenAPI spec | [app/backend/openapi.yaml](app/backend/openapi.yaml) |
| Recruiter one-pager | [docs/portfolio/recruiter-one-pager.md](docs/portfolio/recruiter-one-pager.md) |
| Arquitectura (ADR) | [docs/adr/0002-backend-architecture.md](docs/adr/0002-backend-architecture.md) |
| Observabilidad (ADR) | [docs/adr/0003-observability-strategy.md](docs/adr/0003-observability-strategy.md) |
| Costo mensual estimado | ~$3/mes en dev/demo — [docs/platform/aws-cost-estimate.md](docs/platform/aws-cost-estimate.md) |
| Evidencia Fase 6 | [docs/evidence/phase-6-portfolio.md](docs/evidence/phase-6-portfolio.md) |

> **Onboarding técnico estimado: < 15 min** siguiendo la sección [Instalacion](#instalacion) y [Configuracion de entorno](#configuracion-de-entorno).

---

## Vision general

Nexora Commerce implementa un flujo end-to-end de compra:

- Catalogo de productos consumido desde API.
- Autenticacion storefront con registro, login, verificacion de email y recuperacion de contrasena.
- Filtro en vivo de catalogo por texto, categoria y rango de precio.
- Manejo visual de stock agotado y bloqueo de compra sin stock.
- Carrito con estado global y persistencia local en frontend.
- Checkout con validacion de datos y estados UX claros (loading/success/error/retry).
- Borrador de checkout persistido en navegador con expiracion segura.
- Creacion de ordenes en backend.
- Integracion Stripe Checkout: redireccion a pagina de pago, manejo de retorno (exito/cancelacion).
- Webhook de confirmacion de pago con firma criptografica verificada.
- Estados de orden: PENDING, PAID, CANCELLED.
- Idempotencia en creacion de sesion de pago (Idempotency-Key).

El repositorio esta organizado como monorepo con Turborepo para tareas de build, lint y type-check en apps y paquetes compartidos.

## Arquitectura del monorepo

### Aplicaciones

- [apps/frontend](apps/frontend): storefront principal (catalogo, carrito, checkout).

### Backend

- [app/backend](app/backend): API serverless en AWS Lambda + API Gateway.
	- Endpoints: GET /products, POST /orders, POST /checkout/session, POST /webhooks/stripe.
	- Contrato OpenAPI: [app/backend/openapi.yaml](app/backend/openapi.yaml).
	- Capas de codigo: [app/backend/src](app/backend/src) con domain, application, infra y handlers.
	- Secrets (Stripe) gestionados en AWS SSM Parameter Store como SecureString.

### Paquetes compartidos

- [packages/ui](packages/ui): componentes React compartidos.
- [packages/eslint-config](packages/eslint-config): configuraciones de lint.
- [packages/typescript-config](packages/typescript-config): bases de TypeScript.

## Stack tecnologico

- Node.js + npm workspaces + Turborepo.
- Frontend: Next.js 16, React 19, TypeScript, Zustand, UI components.
- Backend: TypeScript, AWS Lambda, API Gateway, DynamoDB, AWS SDK v3, Stripe.
- Calidad: ESLint, TypeScript, pruebas con Node test runner, Playwright E2E.
- Seguridad: CodeQL SAST, `npm audit`, gitleaks, validaciones de entrada, CORS configurado por endpoint.

## Requisitos

- Node.js >= 18.
- npm (el proyecto declara npm 11.6.2).
- AWS CLI configurado con credenciales validas.
- Serverless Framework v4 (local en backend, o global opcional).

## Instalacion

1. Instalar dependencias del monorepo (apps y packages):

```bash
npm install
```

2. Instalar dependencias del backend serverless (fuera de workspaces):

```bash
cd app/backend
npm install
cd ../..
```

## Configuracion de entorno

### Frontend

Crear [apps/frontend/.env.local](apps/frontend/.env.local) con:

```env
# URL base del API Gateway (sin la version — el cliente agrega /v1/)
NEXT_PUBLIC_API_BASE_URL=https://TU_API_ID.execute-api.us-east-1.amazonaws.com/dev

# Admin dashboard (solo entorno servidor Next.js — NO exponer con NEXT_PUBLIC_)
ADMIN_TOKEN=<minimo-16-chars-secreto>     # genera con: openssl rand -hex 32
AWS_REGION=us-east-1
ORDERS_TABLE=Products
STOREFRONT_AUTH_SECRET=<minimo-16-chars-secreto>
STOREFRONT_USERS_TABLE=Products
STOREFRONT_EMAIL_FROM=no-reply@nexora.dev
STOREFRONT_EMAIL_REPLY_TO=soporte@nexora.dev
STOREFRONT_EMAIL_REGION=us-east-1
# Credenciales demo opcionales para login rapido
STOREFRONT_DEMO_EMAIL=demo@nexora.local
STOREFRONT_DEMO_PASSWORD=demo12345
# AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY si no usas IAM role de instancia
```

Notas del flujo storefront:

- El login real vive en `apps/frontend/app/api/storefront/auth/*`.
- Los usuarios se persisten en DynamoDB usando `STOREFRONT_USERS_TABLE` o `ORDERS_TABLE` como fallback.
- Si `STOREFRONT_EMAIL_FROM` esta configurado y la identidad existe en Amazon SES, las rutas de verificacion y reset envian correos reales desde SES.
- Si SES no esta configurado o falla, las rutas mantienen fallback controlado a `verificationUrl` y `resetUrl` para no bloquear la demo.
- La sesion firmada incluye `emailVerified`, lo que permite reflejar en la UI si la cuenta aun no confirmo el correo.
- El checkout ahora bloquea a usuarios autenticados cuyo correo sigue sin verificar.

Ejemplo en este entorno:

```env
NEXT_PUBLIC_API_BASE_URL=https://bhyrxu22xc.execute-api.us-east-1.amazonaws.com/dev
```

### Backend

Variables soportadas en [app/backend/serverless.yml](app/backend/serverless.yml):

- `PRODUCTS_TABLE`
- `ORDERS_TABLE`
- `ALLOWED_ORIGIN`
- `PRODUCT_IMAGES_BASE_URL`
- `AWS_NODEJS_CONNECTION_REUSE_ENABLED`
- `STRIPE_SECRET_KEY` (inyectada desde SSM: `/nexora/{stage}/stripe/secret_key`)
- `STRIPE_WEBHOOK_SECRET` (inyectada desde SSM: `/nexora/{stage}/stripe/webhook_secret`)

Los secrets de Stripe se almacenan en AWS SSM Parameter Store como `SecureString` y se inyectan automaticamente al desplegar con Serverless Framework.

El despliegue crea alarmas CloudWatch por defecto, por lo que el usuario IAM de despliegue debe tener permiso `cloudwatch:PutMetricAlarm`.

## Ejecucion local

### Frontend principal

```bash
cd apps/frontend
npm run dev
```

Abrir http://localhost:3000

### Todas las apps del monorepo

```bash
npm run dev
```

Puertos esperados:

- frontend: 3000 (por defecto)

## Backend: calidad, despliegue y verificacion

### Calidad local del backend

```bash
cd app/backend
npm run check-types
npm test
npm run test:payments-consistency
```

Evidencia de Fase 2 (concurrencia/reintentos y reconciliacion de pagos):

- [docs/evidence/phase-2-payments-consistency.md](docs/evidence/phase-2-payments-consistency.md)

### Despliegue multi-stage

```bash
cd app/backend

# Stage dev (lo mismo que hace CI automaticamente)
npx serverless deploy --stage dev --region us-east-1

# Stage stage (promotion manual desde GitHub Actions)
npx serverless deploy --stage stage --region us-east-1

# Stage prod (requiere aprobacion en GitHub Environment 'prod')
npx serverless deploy --stage prod --region us-east-1
```

### CDN de imagenes

El bucket S3 de imagenes se crea con `serverless deploy`, pero la distribucion CloudFront se crea con un script separado porque requiere permisos IAM adicionales:

```powershell
.\scripts\setup-cdn.ps1 -Stage dev
```

URL actual de CloudFront para `dev`:

```text
https://d2ouygleh8pygc.cloudfront.net
```

El backend usa `PRODUCT_IMAGES_BASE_URL` para resolver automaticamente las imagenes de `Remera`, `Taza` y `Gorra` cuando los items en DynamoDB no traen `imageUrl` persistida.

### Promotion via GitHub Actions

El workflow `deploy-backend.yml` gestiona el promotion flow:

1. **quality-gate** — typecheck, tests, audit (auto en cada push).
2. **deploy-dev** — auto en push a `main` con smoke test.
3. **deploy-stage** — manual via `Actions → Run workflow → stage: stage`.
4. **deploy-prod** — manual via `Actions → Run workflow → stage: prod` (requiere revisor en GitHub Environments).

### GitHub Actions: secrets requeridos para deploy backend

Para habilitar el workflow de despliegue en GitHub Actions, crear estos secrets a nivel de repositorio:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SERVERLESS_ACCESS_KEY`

Ruta en GitHub:

- Settings -> Secrets and variables -> Actions -> New repository secret

El workflow de deploy valida estos tres secrets al inicio y falla con mensaje explicito si falta alguno.

### Verificacion post-deploy

Smoke test de productos (v1):

```bash
curl "https://bhyrxu22xc.execute-api.us-east-1.amazonaws.com/dev/v1/products?limit=3"
```

Smoke test de orden (v1):

```bash
curl -X POST "https://bhyrxu22xc.execute-api.us-east-1.amazonaws.com/dev/v1/orders" \
	-H "Content-Type: application/json" \
	-d '{
		"name":"QA User",
		"email":"qa.user@example.com",
		"address":"Calle 123",
		"items":[{"productId":"001","name":"Remera Nexora","unitPrice":2500,"quantity":1}]
	}'
```

### Outputs de CloudFormation post-deploy

Tras el primer deploy, el stack expone:

- `ProductImagesBucketName` — nombre del bucket S3 para imagenes de productos.

```bash
cd app/backend
npx serverless info --stage dev --region us-east-1
```

## API

Base URL por stage:

| Stage | URL |
|-------|-----|
| dev   | `https://bhyrxu22xc.execute-api.us-east-1.amazonaws.com/dev` |
| stage | `https://TU_STAGE_API_ID.execute-api.us-east-1.amazonaws.com/stage` |
| prod  | `https://TU_PROD_API_ID.execute-api.us-east-1.amazonaws.com/prod` |

Endpoints versionados (`/v1/` desde Fase 5):

- `GET  /v1/products?limit=100`
- `POST /v1/orders`
- `POST /v1/checkout/session` (requiere header `Idempotency-Key`)
- `POST /webhooks/stripe` (sin version — controlado por Stripe)

Documentacion del contrato:

- [app/backend/openapi.yaml](app/backend/openapi.yaml)

## Scripts utiles

### Raiz del monorepo

```bash
npm run dev
npm run build
npm run lint
npm run check-types
npm run format
```

### Frontend

```bash
npm run dev --workspace=frontend
npm run build --workspace=frontend
npm run lint --workspace=frontend
npm run test:coverage --workspace=frontend
```

### Backend

```bash
cd app/backend
npm run check-types
npm test
npx serverless deploy --stage dev --region us-east-1
```

## Seguridad y calidad

Puntos implementados:

- Validacion de payload en todos los endpoints con mensajes de error descriptivos.
- Respuestas HTTP consistentes y headers defensivos en respuestas.
- Permisos IAM explicitos (least privilege) para DynamoDB en Lambda.
- Secrets de Stripe en SSM Parameter Store (SecureString, nunca en codigo).
- Verificacion de firma criptografica en webhook de Stripe.
- Idempotencia en creacion de sesion de checkout (header `Idempotency-Key`).
- Suite dedicada de consistencia de pagos en CI (`test:payments-consistency`) para reintentos/duplicados de webhook y reconciliacion de estados.
- CORS desactivado en endpoint de webhook (no es una ruta de navegador).
- CI bloquea ante vulnerabilidades `high`/`critical` (`npm audit --audit-level=high`).
- Escaneo SAST con CodeQL en cada PR (workflow `codeql.yml`).
- Secret scanning con gitleaks en CI.
- Tests unitarios e integracion de todos los handlers (21 tests backend, 28 frontend unit, E2E Playwright).
- Gate de cobertura frontend en CI con umbrales minimos (Vitest + V8).

Artefactos de Fase 3 (seguridad y cumplimiento):

- Checklist OWASP ASVS adaptado: [docs/security/owasp-asvs-checklist.md](docs/security/owasp-asvs-checklist.md)
- Threat model versionado: [docs/security/threat-model.md](docs/security/threat-model.md)
- Matriz de validacion de entradas: [docs/security/input-validation-matrix.md](docs/security/input-validation-matrix.md)
- Politica de rotacion de secretos: [docs/security/secrets-rotation-policy.md](docs/security/secrets-rotation-policy.md)

## Observabilidad operativa

Artefactos de Fase 4 (observabilidad y confiabilidad):

- SLO y error budget: [docs/observability/slo-error-budget.md](docs/observability/slo-error-budget.md)
- Dashboard operativo y queries: [docs/observability/dashboard-operativo.md](docs/observability/dashboard-operativo.md)
- Postmortem de simulacro (MTTR): [docs/postmortems/2026-03-31-stripe-webhook-invalid-signature-drill.md](docs/postmortems/2026-03-31-stripe-webhook-invalid-signature-drill.md)
- Evidencia consolidada Fase 4: [docs/evidence/phase-4-observability-reliability.md](docs/evidence/phase-4-observability-reliability.md)

## Plataforma y escalabilidad

Artefactos de Fase 5 (plataforma y escalabilidad):

- Estrategia de migraciones y versionado de API: [docs/platform/api-versioning-and-migrations.md](docs/platform/api-versioning-and-migrations.md)
- Evidencia consolidada Fase 5 (KPIs medidos): [docs/evidence/phase-5-platform-scalability.md](docs/evidence/phase-5-platform-scalability.md)

## Decisiones de arquitectura (ADRs)

Las decisiones técnicas clave están documentadas con contexto, alternativas evaluadas y consecuencias:

| ADR | Decisión | Estado |
|-----|----------|--------|
| [ADR-0001](docs/adr/0001-stripe-checkout-integration.md) | Integración Stripe Checkout Session + webhook firmado | Aceptado |
| [ADR-0002](docs/adr/0002-backend-architecture.md) | Arquitectura backend serverless en capas (Lambda + DynamoDB + Serverless Framework) | Aceptado |
| [ADR-0003](docs/adr/0003-observability-strategy.md) | Estrategia de observabilidad (CloudWatch EMF + X-Ray + Sentry) | Aceptado |

## Costo estimado AWS

Documentación completa: [docs/platform/aws-cost-estimate.md](docs/platform/aws-cost-estimate.md)

| Ambiente | Costo mensual estimado |
|----------|------------------------|
| Desarrollo / demo | ~$3 |
| Staging | ~$7 |
| Producción (500 K req/mes) | ~$99 |

El mayor driver de costo a escala es el egress de CloudFront. Optimizaciones implementadas: DynamoDB on-demand, Lambda 256 MB, SSM en lugar de Secrets Manager, retención de logs configurada por stage.

## Troubleshooting

### Error EADDRINUSE en frontend

El puerto 3000 ya esta ocupado. Cerrar proceso previo o usar otro puerto.

```bash
cd apps/frontend
npm run dev -- --port 3003
```

### Lock de Next.js en .next/dev/lock

Si queda un lock stale, eliminarlo y volver a iniciar.

### 500 en backend

Pasos recomendados:

1. Revisar logs de Lambda:

```bash
cd app/backend
npx serverless logs -f createOrder --stage dev --region us-east-1 --startTime 10m
```

2. Confirmar tablas DynamoDB y permisos IAM.
3. Validar que NEXT_PUBLIC_API_BASE_URL apunte al stage correcto.

## Estado actual

- Fase 1 ✅: MVP productizado (catalogo, carrito, checkout UX).
- Fase 2 ✅: Pagos Stripe (Checkout Session, webhook firmado, estados de orden, idempotencia).
- Fase 3 ✅: Seguridad (CodeQL SAST, audit high, gitleaks, orderId validation, CORS webhook, SSM secrets).
- Fase 4 ✅: Observabilidad (CloudWatch EMF metrics, X-Ray tracing, Sentry, 8 alarms, runbooks).
- Fase 5 ✅: Plataforma y escalabilidad:
  - Multi-stage CI/CD (dev/stage/prod) con promotion flow y GitHub Environment approvals.
  - API versionada `/v1/` en todos los endpoints de negocio.
  - CDN para imagenes: S3 bucket + CloudFront distribution (gestionados por CloudFormation).
- Fase 6 ✅: Portfolio y narrativa para recruiting:
  - 3 ADRs publicados (backend, pagos, observabilidad).
  - Costo estimado AWS documentado (~$3/mes en dev/demo).
  - Lighthouse CI configurado con umbrales >= 90 en Performance/Best Practices/SEO.
  - README ejecutivo con onboarding < 15 min y enlace único al portfolio.
  - Dashboard admin con autenticacion por token, listado de ordenes y estadisticas.
  - Checklist de release versionado: [docs/release-checklist.md](docs/release-checklist.md).
- Backend desplegado y operativo en stage dev (`us-east-1`).
- Frontend listo para consumo de API mediante `NEXT_PUBLIC_API_BASE_URL`.
- 21 tests backend, 18 unit tests frontend y E2E Playwright en verde.
- ADR de integracion de pagos publicado en [docs/adr/0001-stripe-checkout-integration.md](docs/adr/0001-stripe-checkout-integration.md).
- Evidencia de consistencia de pagos publicada en [docs/evidence/phase-2-payments-consistency.md](docs/evidence/phase-2-payments-consistency.md).
