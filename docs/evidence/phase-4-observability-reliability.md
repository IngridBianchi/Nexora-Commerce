# Evidencia Fase 4 - Observabilidad y Confiabilidad Operativa

Estado: Completado (2026-03-31)

## Entregables y evidencia

1. Trazas distribuidas
- X-Ray habilitado en Lambda (`provider.tracing.lambda: true`)
- Permisos IAM xray:PutTraceSegments y xray:PutTelemetryRecords

2. Error tracking
- Sentry wrapper en backend: app/backend/src/shared/sentry.ts
- Inicializacion por entorno usando `SENTRY_DSN`

3. SLOs y alertas
- Alarmas por errores y latencia p95 en app/backend/serverless.yml
- Documento de SLO/error budget: docs/observability/slo-error-budget.md

4. Runbooks operativos
- docs/runbooks/lambda-errors.md
- docs/runbooks/latency-slo-breach.md
- docs/runbooks/stripe-webhook-failures.md

5. Simulacro y postmortem
- docs/postmortems/2026-03-31-stripe-webhook-invalid-signature-drill.md
- MTTR registrado: 18 min (< 30 min)

6. Dashboard operativo publicado
- docs/observability/dashboard-operativo.md

## Criterios de aceptacion del roadmap

1. Dashboard operativo publicado en README
- Cumplido (README enlaza docs de observabilidad)

2. Simulacro de fallo documentado con postmortem
- Cumplido (postmortem versionado en docs/postmortems)
