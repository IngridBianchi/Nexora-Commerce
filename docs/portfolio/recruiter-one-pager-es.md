# Nexora Commerce - One Pager para Reclutadores

## Pitch en 60 segundos

Nexora Commerce es un sistema de e-commerce serverless con foco en madurez de ingeniería, no solo en interfaz. Incluye pagos reales con Stripe, reconciliación idempotente, controles de seguridad, observabilidad con SLOs y flujo de promoción CI/CD por ambientes.

Este proyecto es especialmente atractivo para procesos de selección porque demuestra ownership end-to-end: producto, arquitectura backend, confiabilidad, seguridad y operación.

## Por qué destaca en entrevistas

- Alcance end-to-end: frontend, backend, cloud, CI/CD, observabilidad y hardening de seguridad.
- Manejo de fallas del mundo real: reintentos de pago, webhooks duplicados y runbooks operativos.
- Resultados medibles: KPIs explícitos, SLOs, error budget y simulacro de incidente con MTTR documentado.
- Comunicación técnica sólida: ADRs, postmortems, checklist de release y documentación de plataforma.

## Logros de alto valor (foco recruiter)

### 1) Pagos implementados correctamente (no solo demo)

- Integración de Stripe Checkout con verificación de firma en webhook.
- Idempotencia en creación de sesión y reconciliación para evitar mutaciones duplicadas.
- Ciclo de estados de orden implementado (`PENDING`, `PAID`, `CANCELLED`).
- Suite de consistencia de pagos ejecutada en CI para rutas críticas.

Evidencia:
- [ADR-0001 Integración Stripe Checkout](../adr/0001-stripe-checkout-integration.md)
- [Evidencia Fase 2 - Consistencia de pagos](../evidence/phase-2-payments-consistency.md)

### 2) Mentalidad de confiabilidad y operación

- SLO y error budget definidos para endpoints críticos.
- Alarmas en CloudWatch, métricas EMF, trazas en X-Ray e integración con Sentry.
- Simulacro de incidente ejecutado y documentado con MTTR de 18 minutos.
- Runbooks operativos para errores Lambda, brechas de latencia y fallos de webhook.

Evidencia:
- [ADR-0003 Estrategia de observabilidad](../adr/0003-observability-strategy.md)
- [SLO y error budget](../observability/slo-error-budget.md)
- [Dashboard operativo](../observability/dashboard-operativo.md)
- [Postmortem del simulacro](../postmortems/2026-03-31-stripe-webhook-invalid-signature-drill.md)

### 3) Seguridad tratada como feature

- Checklist OWASP ASVS adaptado al alcance real del proyecto.
- Threat model, matriz de validación de inputs y política de rotación de secretos versionados.
- Quality gates de seguridad en CI: CodeQL, npm audit (high) y gitleaks.

Evidencia:
- [Checklist OWASP ASVS](../security/owasp-asvs-checklist.md)
- [Threat model](../security/threat-model.md)
- [Matriz de validación de entradas](../security/input-validation-matrix.md)
- [Política de rotación de secretos](../security/secrets-rotation-policy.md)

### 4) Disciplina de plataforma y escalabilidad

- Ambientes multi-stage (`dev`, `stage`, `prod`) con promotion flow.
- Checklist de release y procedimiento de rollback versionados.
- Estrategia de versionado de API y migraciones documentada.

Evidencia:
- [Versionado de API y migraciones](../platform/api-versioning-and-migrations.md)
- [Release checklist](../release-checklist.md)
- [Evidencia Fase 5 - Plataforma y escalabilidad](../evidence/phase-5-platform-scalability.md)

## Snapshot de KPIs para reclutadores

| KPI | Resultado |
|---|---|
| Tests backend | 21 |
| Tests unitarios frontend | 28 |
| MTTR simulacro incidente | 18 min |
| Costo mensual dev/demo | ~3 USD |
| Promotion flow | dev -> stage -> prod |
| Gate de consistencia de pagos en CI | Implementado |

## Arquitectura y eficiencia de costos

- Arquitectura backend: Lambda + API Gateway + DynamoDB con diseño por capas.
- Costo cloud optimizado para demo y etapa temprana, manteniendo controles de confiabilidad tipo producción.

Evidencia:
- [ADR-0002 Arquitectura backend](../adr/0002-backend-architecture.md)
- [Estimación de costos AWS](../platform/aws-cost-estimate.md)

## Cómo evaluar este proyecto en 10 minutos

1. Leer el resumen de portfolio en [README](../../README.md).
2. Revisar arquitectura y decisiones en ADRs.
3. Abrir evidencias de consistencia de pagos y observabilidad.
4. Verificar workflows de CI para gates de calidad, seguridad y cobertura.

## Narrativa lista para entrevista

Si te preguntan "¿qué construiste y por qué importa?":

"Construí un sistema de comercio serverless completo que se comporta como una carga de producción. Priorizé confiabilidad y corrección en pagos, incluyendo verificación de firma de webhook y reconciliación idempotente. Sumé SLOs, alarmas, runbooks y un simulacro documentado para demostrar readiness operativa, y reforcé todo con quality/security gates en CI. El resultado es una plataforma de bajo costo pero alta madurez técnica, ideal para demos y conversaciones de ingeniería."