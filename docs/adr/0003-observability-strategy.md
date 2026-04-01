# ADR-0003: Estrategia de observabilidad — CloudWatch EMF + X-Ray + Sentry

- Estado: Aceptado
- Fecha: 2026-03-31
- Autores: Equipo Nexora Commerce

## Contexto

Operar un sistema de pagos en producción requiere detectar degradaciones antes de que los usuarios las reporten y responder a incidentes con contexto suficiente para resolver la causa raíz, no solo el síntoma.

El stack de observabilidad debe cubrir los tres pilares:

| Pilar | Pregunta que responde |
|-------|----------------------|
| Métricas | ¿Cuánto? ¿A qué velocidad? ¿Qué porcentaje falla? |
| Trazas distribuidas | ¿Dónde perdí tiempo? ¿Qué llamada externa falló? |
| Logs estructurados | ¿Qué pasó exactamente y en qué orden? |

Además, se requería visibilidad de errores de aplicación con contexto de usuario y release tagging.

La restricción operativa principal: equipo de una persona, sin presupuesto para licencias de herramientas SaaS premium (Datadog, New Relic).

## Decisión

Se adopta la siguiente combinación de herramientas nativas y de bajo costo:

### 1. CloudWatch EMF (Embedded Metric Format) — Métricas de negocio y latencia

```typescript
// Ejemplo de uso en handlers
await emitMetric('CheckoutInitiated', 1, 'Count', {
  environment: process.env.STAGE,
  result: 'success',
});
```

- Emite métricas sin costo adicional sobre CloudWatch Logs (ya incluido en el costo de logs).
- Permite crear alarmas sobre métricas de negocio (CheckoutInitiated, OrderPaid, WebhookError).
- Sin agente ni sidecar: la métrica viaja embebida en el JSON del log.
- 8 alarmas CloudWatch configuradas en `serverless.yml` con umbrales alineados a SLOs.

### 2. AWS X-Ray — Trazas distribuidas

```yaml
# serverless.yml
provider:
  tracing:
    lambda: true
    apiGateway: true
```

- Activado a nivel de proveedor: todas las funciones Lambda y API Gateway trazan automáticamente.
- Permite identificar latencias por segmento: handler → caso de uso → DynamoDB → Stripe.
- Sin código adicional en rutas críticas (instrumentación pasiva vía SDK AWS).
- Costo: primeros 100,000 traces/mes gratuitos; suficiente para demo y staging.

### 3. Sentry — Error tracking con release tagging

```typescript
// Wrappers de handler
export const handler = wrapWithSentry(rawHandler);
```

- Captura errores no controlados y excepciones de dominio con stack trace.
- Release tagging (`SENTRY_RELEASE`) vincula errores a la versión del deploy.
- Plan gratuito: 5,000 errores/mes — suficiente para entorno sandbox.
- Alertas por correo/Slack ante nuevos errores en producción.

### 4. Logs estructurados JSON — Correlación y búsqueda

```typescript
console.log(JSON.stringify({
  level: 'INFO',
  correlationId: event.requestContext.requestId,
  orderId,
  action: 'webhook_processed',
  result: updateResult.status,
}));
```

- Todos los handlers emiten JSON con `correlationId`, `orderId` y `action`.
- CloudWatch Logs Insights permite queries ad hoc sin preprocesar los logs.
- Sin costo adicional: los logs ya estaban en CloudWatch.

## Alternativas consideradas

### A) OpenTelemetry (OTel) end-to-end

- Pros: estándar abierto, exporta a cualquier backend (Grafana, Jaeger, etc.).
- Contras: mayor overhead de setup en Lambda (cold start +50–100 ms por la carga del SDK); requiere un collector autogestionado o un SaaS receptor pagado.

Resultado: **descartado para esta fase**. Candidato si el equipo crece y se requiere portabilidad de backend de observabilidad.

### B) Datadog

- Pros: UI excepcional, correlación logs+trazas+métricas out of the box.
- Contras: costo mínimo ~$15/host/mes; para Lambda se factura por función activa. No compatible con la restricción de presupuesto cero.

Resultado: descartado definitivamente para el contexto del proyecto.

### C) CloudWatch Container Insights / Embedded Agent

- No aplica: el proyecto no usa contenedores.

### D) Solo logs sin métricas estructuradas

- Pros: cero configuración adicional.
- Contras: sin SLOs accionables, sin alarmas automáticas, sin visibilidad de error budget.

Resultado: descartado. Los SLOs exigen métricas cuantificables.

## Consecuencias

### Positivas

- **Costo marginal:** CloudWatch EMF + X-Ray + Sentry plan free = `~$0–2 USD/mes` en sandbox.
- **Cobertura de los tres pilares** con herramientas nativas AWS + un SaaS freemium.
- **MTTR simulado < 30 min** demostrado en el simulacro documentado en `docs/postmortems/`.
- Alarmas vinculadas directamente a los SLOs definidos en `docs/observability/slo-error-budget.md`.
- Sin dependencias externas en runtime crítico: sin agentes, sin bases de datos adicionales.

### Negativas / Riesgos gestionados

- **Correlación logs-trazas-errores manual:** X-Ray, CloudWatch y Sentry son silos separados. Mitigación: el `correlationId` del request se propaga en todos los medios.
- **Límites del plan free de Sentry:** 5,000 errores/mes. Mitigación: sampling rate configurable; upgrade a plan Team si el volumen crece.
- **Retención de logs en CloudWatch:** 30 días en dev, 90 días en prod. Pasado ese período no hay acceso histórico sin exportar a S3.

## Estado de implementación

| Herramienta | Implementada | Evidencia |
|-------------|-------------|-----------|
| CloudWatch EMF | ✅ | `app/backend/src/utils/db.ts` + `emitMetric` calls en handlers |
| CloudWatch Alarmas | ✅ | 8 alarmas en `serverless.yml` |
| X-Ray tracing | ✅ | `provider.tracing.lambda: true` en `serverless.yml` |
| Sentry | ✅ | `wrapWithSentry` en todos los handlers |
| Logs JSON estructurados | ✅ | `console.log(JSON.stringify(...))` en handlers |
| Dashboard operativo | ✅ | `docs/observability/dashboard-operativo.md` |
| SLOs y error budget | ✅ | `docs/observability/slo-error-budget.md` |
| Postmortem de simulacro | ✅ | `docs/postmortems/2026-03-31-stripe-webhook-invalid-signature-drill.md` |

## Referencias

- [CloudWatch Embedded Metric Format](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html)
- [AWS X-Ray for Lambda](https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html)
- [Sentry for AWS Lambda](https://docs.sentry.io/platforms/node/guides/aws-lambda/)
- `docs/observability/slo-error-budget.md`
- `docs/observability/dashboard-operativo.md`
- `docs/postmortems/2026-03-31-stripe-webhook-invalid-signature-drill.md`
