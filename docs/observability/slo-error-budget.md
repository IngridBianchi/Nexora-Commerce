# SLO y Error Budget - Nexora Commerce Backend

Estado: Version 1.0 (2026-03-31)

## 1. SLOs definidos

Scope: APIs de negocio en Lambda + API Gateway.

1. GET /v1/products
- Objetivo: p95 < 500 ms
- Error objective: disponibilidad >= 99.5% mensual

2. POST /v1/orders
- Objetivo: p95 < 800 ms
- Error objective: disponibilidad >= 99.5% mensual

3. POST /v1/checkout/session
- Objetivo: p95 < 2000 ms
- Error objective: disponibilidad >= 99.0% mensual

4. POST /webhooks/stripe
- Objetivo: tasa de error = 0 para eventos validos
- Error objective: 99.9% de respuestas 2xx en eventos firmados

## 2. Error budget mensual

Formula:

error_budget_minutes = total_minutes_in_month * (1 - SLO)

Referencias:

1. SLO 99.5% -> budget aprox 216 min/mes (30 dias)
2. SLO 99.0% -> budget aprox 432 min/mes
3. SLO 99.9% -> budget aprox 43.2 min/mes

## 3. Fuente de metricas

1. AWS/Lambda Duration p95 por funcion (alarmas en serverless.yml)
2. AWS/Lambda Errors por funcion
3. Nexora/Backend BackendErrors (EMF custom metric)
4. Nexora/Backend StripeWebhooksHandled por status
5. X-Ray traces para diagnostico de latencia
6. Sentry issues para correlacion de errores de runtime

## 4. Reglas de alerta

Implementadas en infraestructura:

1. Alarmas de errores por funcion
2. Alarmas p95 para getProducts/createOrder/createCheckoutSession
3. Alarma de backend errors agregada

Sugerencia operativa:

1. Warning: consumo de >50% del error budget en la primera mitad del mes
2. Critical: consumo de >80% del error budget
3. Freeze de cambios no criticos cuando se supera 90%

## 5. Revision operativa

Frecuencia:

1. Revision semanal de SLO y tendencias
2. Revision mensual de error budget consumido

Salida esperada:

1. Decisiones de hardening
2. Acciones de performance
3. Postmortem si se excede budget
