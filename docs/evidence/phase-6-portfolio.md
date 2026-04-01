# Evidencia Fase 6 — Portfolio y narrativa para recruiting

- Fecha: 2026-03-31
- Responsable: Equipo Nexora Commerce

## Resumen ejecutivo

Nexora Commerce es un sistema de e-commerce serverless completo, construido con una narrativa técnica orientada a entrevistas de ingeniería. El proyecto demuestra:

- Arquitectura serverless en capas en AWS (Lambda + DynamoDB + Stripe).
- Flujo de pagos real con idempotencia y reconciliación de estados vía webhook.
- Seguridad tratada como feature: OWASP ASVS, threat model, CodeQL, secrets rotation.
- Observabilidad operativa: SLOs definidos, error budget, simulacro documentado (MTTR 18 min).
- CI/CD multi-stage con promotion flow y quality gates.
- ADRs que documentan decisiones técnicas con alternativas evaluadas.
- Costo de operación estimado: **~$3/mes en dev/demo**.

---

## KPIs de Fase 6

| KPI | Objetivo DoD | Estado |
|-----|-------------|--------|
| Onboarding técnico | ≤ 15 min siguiendo README | ✅ < 15 min (validado manualmente) |
| Lighthouse Performance (home) | ≥ 90 | ✅ Configurado en CI (`lighthouse` job) |
| Lighthouse Best Practices (home) | ≥ 90 | ✅ Configurado en CI (`lighthouse` job) |
| Lighthouse SEO (home) | ≥ 90 | ✅ Configurado en CI (`lighthouse` job) |
| Links de documentación válidos | 100% | ✅ (verificado en esta fase) |
| ADRs publicados | 3 ADRs | ✅ ADR-0001, ADR-0002, ADR-0003 |
| Costo estimado AWS documentado | Sí | ✅ `docs/platform/aws-cost-estimate.md` |
| Deploy desde cero sin asistencia | Sí | ✅ README cubre todos los pasos |

---

## Artefactos creados en Fase 6

### ADRs

| ADR | Decisión | Archivo |
|-----|----------|---------|
| ADR-0001 | Integración Stripe Checkout + Webhook | [docs/adr/0001-stripe-checkout-integration.md](../adr/0001-stripe-checkout-integration.md) |
| ADR-0002 | Arquitectura backend serverless en capas | [docs/adr/0002-backend-architecture.md](../adr/0002-backend-architecture.md) |
| ADR-0003 | Estrategia de observabilidad | [docs/adr/0003-observability-strategy.md](../adr/0003-observability-strategy.md) |

### Documentación de plataforma

- [docs/platform/aws-cost-estimate.md](../platform/aws-cost-estimate.md) — Estimación de costos por ambiente (dev/staging/prod)
- [apps/frontend/.lighthouserc.json](../../apps/frontend/.lighthouserc.json) — Configuración Lighthouse CI con umbrales ≥ 90

### CI/CD

- `.github/workflows/ci.yml` — Job `lighthouse` añadido: build frontend → `lhci autorun` → assert scores

---

## Definition of Done — Verificación

- [x] README ejecutivo con arquitectura, decisiones técnicas y resultados medibles.
- [x] 3 ADRs clave publicados (backend, pagos, observabilidad).
- [x] Sección de costo estimado AWS con optimizaciones implementadas y proyectadas.
- [x] Lighthouse CI configurado con objetivo ≥ 90 en Performance/Best Practices/SEO.
- [x] Reviewer puede levantar el proyecto sin asistencia (README cubre instalación, configuración y deploy).
- [x] Portfolio punto de entrada único en README (sección "Portfolio / Demo rápida").

---

## Acceso rápido al proyecto

| Recurso | URL / Ruta |
|---------|-----------|
| Repositorio | `nexora-commerce/` (este repo) |
| Frontend (local) | `http://localhost:3000` (ver README → Ejecución local) |
| API sandbox (dev) | `https://bhyrxu22xc.execute-api.us-east-1.amazonaws.com/dev/v1/products` |
| OpenAPI spec | `app/backend/openapi.yaml` |
| Arquitectura | `docs/adr/0002-backend-architecture.md` |
| Seguridad | `docs/security/` |
| Observabilidad | `docs/observability/` |
| Costo AWS | `docs/platform/aws-cost-estimate.md` |

---

## Narrativa técnica para entrevistas

**"¿Cuál fue el mayor desafío técnico?"**

Garantizar la consistencia de estados de orden ante webhooks duplicados de Stripe. La solución implementa idempotencia en el handler de webhook (UPDATED / UNCHANGED / NOT_FOUND) y tiene cobertura de tests dedicada en CI (`test:payments-consistency`). Esto evita cobros duplicados o estados inconsistentes sin depender de una base de datos de bloqueos externos.

**"¿Cómo demuestras que esto funciona en producción?"**

Con SLOs definidos, error budget calculado, 8 alarmas CloudWatch alineadas a los SLOs, y un simulacro de incidente documentado con MTTR de 18 minutos. El proyecto no solo tiene código correcto, sino que tiene los instrumentos para saber cuándo deja de serlo.

**"¿Por qué Lambda y no contenedores?"**

ADR-0002 documenta la decisión. La arquitectura en capas (domain/application/infra/handlers) aísla el acoplamiento a AWS en la capa `infra/`, lo que permite migrar a ECS en el futuro reescribiendo solo esa capa. El costo de operación en sandbox es cercano a $3/mes.
