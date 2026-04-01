# Evidencia Fase 5 - Plataforma y Escalabilidad

Estado: Completado (2026-03-31)

## Entregables y evidencia

### 1. Ambientes dev/stage/prod con promotion flow

- Workflow multi-stage: `.github/workflows/deploy-backend.yml`
  - `quality-gate` → `deploy-dev` (auto en push) → `deploy-stage` (manual) → `deploy-prod` (manual + reviewer)
- GitHub Environments con aprobacion requerida para `prod`.

### 2. Estrategia de migraciones y versionado de API

- Documento formal: [docs/platform/api-versioning-and-migrations.md](../platform/api-versioning-and-migrations.md)
- Cubre: reglas de breaking changes, expand-contract para DynamoDB, rollback de API, lifecycle de ambientes.

### 3. CDN para imagenes (S3 + CloudFront)

- S3 bucket `nexora-backend-{stage}-product-images` declarado en `serverless.yml`.
- CloudFront distribution activa: `https://d2ouygleh8pygc.cloudfront.net` (stage dev).
- Script reproducible: `scripts/setup-cdn.ps1`.
- `PRODUCT_IMAGES_BASE_URL` inyectada automaticamente por stage.

### 4. Dashboard admin con autenticacion

- Ruta protegida: `apps/frontend/app/admin/page.tsx`
- Middleware: `apps/frontend/middleware.ts`
- Auth centralizada: `apps/frontend/lib/admin-auth.ts`
- Servicio admin orders: `apps/frontend/lib/admin-orders-service.ts`

### 5. Checklist de release versionado

- `docs/release-checklist.md` con todas las fases: dev → stage → prod → CDN → rollback.

## KPIs verificados

| KPI | Objetivo | Resultado |
|-----|----------|-----------|
| Tiempo de deploy a stage | < 15 min | ~3-5 min (Serverless + quality-gate) |
| Change failure rate | < 10% | 0% (0 rollbacks en historial actual) |
| Rollback documentado | Si | `docs/release-checklist.md` + `docs/platform/api-versioning-and-migrations.md` |
| Deploy reproducible en ambiente limpio | Si | Workflow desde cero con `npm ci` + secrets |

## Definition of Done — cumplida

- [x] Deploy reproducible en ambiente limpio desde cero (workflow valida y despliega sin estado previo).
- [x] Checklist de release versionado y usado en cada despliegue.
