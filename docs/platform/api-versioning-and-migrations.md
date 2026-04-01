# Estrategia de migraciones y versionado de API - Nexora Commerce

Version: 1.0 (2026-03-31)

## 1. Versionado de API

### Esquema actual

Todos los endpoints de negocio usan el prefijo `/v1/` gestionado por la variable `apiVersion` en `serverless.yml`:

```yaml
custom:
  apiVersion: v1
```

Endpoints activos:

| Metodo | Path | Version |
|--------|------|---------|
| GET    | `/v1/products` | v1 |
| POST   | `/v1/orders` | v1 |
| POST   | `/v1/checkout/session` | v1 |
| POST   | `/webhooks/stripe` | sin version (controlado por Stripe, no by-us) |

El contrato de cada endpoint esta versionado en OpenAPI: `app/backend/openapi.yaml`.

### Reglas de compatibilidad

1. Cambios backwards-compatible (NO requieren version bump):
   - Agregar campos opcionales a la respuesta.
   - Agregar nuevos query params opcionales.
   - Agregar headers de respuesta nuevos.

2. Cambios breaking (REQUIEREN nueva version `/v2/`):
   - Eliminar o renombrar campos de request/response.
   - Cambiar tipo de un campo existente.
   - Cambiar comportamiento de status codes existentes.
   - Modificar restricciones de validacion mas estrictas.

### Proceso de version bump

1. Crear nueva funcion Lambda en `serverless.yml` bajo el path `/v2/endpoint`.
2. Mantener `/v1/endpoint` operativo durante periodo de deprecacion (minimo 60 dias).
3. Actualizar `openapi.yaml` con nuevo `info.version` y nuevos paths.
4. Publicar changelog con tabla de diferencias v1 -> v2.
5. Comunicar fecha de sunset de v1 en headers `Sunset` y `Deprecation`.

## 2. Estrategia de migraciones de datos (DynamoDB)

### Contexto

DynamoDB no tiene migraciones de esquema en sentido relacional. El modelo es semi-estructurado, por lo que las migraciones son operativas y por convenciones.

### Patron de evolucion

**Expand-contract** (migracion de bajo riesgo):

1. Fase expand: escribir en campo nuevo y campo viejo simultaneamente.
2. Fase migrate: script de backfill sobre items existentes.
3. Fase contract: eliminar campo viejo una vez que todos los items estan migrados.

### Procedimiento para migraciones destructivas

1. Crear backup antes de ejecutar:

```bash
aws dynamodb create-backup \
  --table-name Products \
  --backup-name "pre-migration-$(Get-Date -Format 'yyyyMMdd-HHmm')" \
  --region us-east-1
```

2. Ejecutar script de migracion en `dev` y verificar con queries spot-check.
3. Verificar en `stage` antes de promover a `prod`.
4. Registrar la migracion en `docs/platform/migration-log.md`.

### Ejemplo de backfill script

Ubicacion de referencia: `scripts/migrations/` (agregar por migracion cuando aplique).

Convention de nombre: `YYYYMMDD-descripcion-breve.ts`.

## 3. Lifecycle de un ambiente

### Ambientes activos

| Stage | Proposito | Promotion |
|-------|-----------|-----------|
| `dev` | Integracion continua, deploy automatico en push a `main` | Automatico |
| `stage` | QA manual y validacion pre-prod | Manual via workflow_dispatch |
| `prod` | Produccion, requiere aprobacion en GitHub Environments | Manual + reviewer |

### Reglas de promotion

1. Los cambios llegan a `dev` antes que a `stage`.
2. No se promueve a `prod` sin antes validar en `stage` por al menos 1 hora.
3. Todo deploy a `prod` requiere el checklist de release completado: `docs/release-checklist.md`.

## 4. Rollback de API

Serverless Framework mantiene artefactos de cada deploy. Para revertir:

```bash
cd app/backend

# Listar timestamps disponibles
npx serverless deploy list --stage prod --region us-east-1

# Rollback a timestamp especifico
npx serverless rollback --stage prod --region us-east-1 --timestamp <TIMESTAMP>
```

Se mantienen los ultimos 5 deploys disponibles para rollback.

## 5. Cambio failure rate

KPI objetivo: < 10% de deploys con rollback o fixforward en la misma sesion.

Historico:

| Fecha | Stage | Resultado | Requirio rollback |
|-------|-------|-----------|-------------------|
| 2026-03-27 | dev | OK | No |
| 2026-03-27 | dev | OK | No |
| 2026-03-31 | dev | OK | No |

Change failure rate actual: 0%.
