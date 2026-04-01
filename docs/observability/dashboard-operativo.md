# Dashboard Operativo - Nexora Commerce

Estado: Version 1.0 (2026-03-31)

Este documento define el tablero minimo de operacion para seguimiento diario.

## 1. Widgets obligatorios

1. Lambda Errors por funcion
- getProducts
- createOrder
- createCheckoutSession
- stripeWebhook

2. Lambda Duration p95 por funcion
- getProducts
- createOrder
- createCheckoutSession

3. Custom metric BackendErrors (Nexora/Backend)
- Dimension Function=createOrder

4. Custom metric StripeWebhooksHandled por status
- Success
- Ignored
- InvalidSignature
- Error

5. API Gateway 5XXError y 4XXError

6. X-Ray service map y traces de latencia alta

## 2. Queries operativas recomendadas

CloudWatch Logs Insights (errores backend):

```sql
fields @timestamp, @message
| filter @message like /"level":"ERROR"/
| sort @timestamp desc
| limit 100
```

CloudWatch Logs Insights (latencia aproximada por funcion):

```sql
fields @timestamp, @message
| filter @message like /Products listed|Order created|Stripe checkout session created|stripeWebhook processed/
| sort @timestamp desc
| limit 200
```

## 3. Politica de reaccion

1. Si una alarma de Errors pasa a ALARM: abrir runbook correspondiente en < 5 min.
2. Si p95 excede SLO por 3 periodos: analizar X-Ray y logs.
3. Si stripeWebhook falla: reconciliar ordenes PENDING afectadas.

Runbooks relacionados:

1. docs/runbooks/lambda-errors.md
2. docs/runbooks/latency-slo-breach.md
3. docs/runbooks/stripe-webhook-failures.md

## 4. KPI operativo objetivo

1. MTTR < 30 min en incidentes simulados
2. 100% de incidentes con ticket o postmortem
3. Error budget revisado semanalmente
