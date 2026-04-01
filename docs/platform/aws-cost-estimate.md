# Costo estimado AWS — Nexora Commerce

Estimación de costo mensual por ambiente. Todos los valores son USD, calculados con la [AWS Pricing Calculator](https://calculator.aws/) en región **us-east-1** a marzo 2026.

---

## Ambiente de desarrollo / demo

Tráfico asumido: **~5,000 peticiones/mes** (desarrollo activo + demos a reclutadores).

| Servicio | Uso estimado | Costo mensual |
|----------|-------------|---------------|
| AWS Lambda | 5,000 invocaciones × 256 MB × 300 ms avg | **$0.00** ¹ |
| API Gateway HTTP API | 5,000 peticiones | **$0.00** ² |
| Amazon DynamoDB (on-demand) | < 1 M lecturas + < 1 M escrituras + < 1 GB stored | **$0.00** ³ |
| Amazon CloudFront | < 1 TB transfer out, < 10 M peticiones | **$0.00** ⁴ |
| Amazon S3 | < 5 GB (imágenes + assets estáticos) | **$0.00** ⁵ |
| CloudWatch Logs | < 5 GB ingestion + 30 days retention | **~$2.50** |
| CloudWatch Alarms | 8 alarmas | **$0.80** |
| AWS X-Ray | < 100,000 traces/mes | **$0.00** ⁶ |
| AWS Systems Manager (SSM) | < 10,000 API calls (secrets on cold start) | **$0.00** |
| **TOTAL DEV/DEMO** | | **~$3.30 / mes** |

¹ Capa gratuita: 1 M invocaciones + 400,000 GB-s/mes perpetuo.  
² Capa gratuita: 1 M llamadas HTTP API/mes durante 12 meses; luego $1.00/M.  
³ Capa gratuita perpetua: 25 WCU + 25 RCU + 25 GB storage + 200 M on-demand ops/mes.  
⁴ Capa gratuita: 1 TB egress/mes + 10 M peticiones/mes durante 12 meses.  
⁵ Capa gratuita: 5 GB standard storage + 20,000 GET + 2,000 PUT/mes durante 12 meses.  
⁶ Capa gratuita: 100,000 traces registradas + 1 M segmentos escaneados/mes.

---

## Ambiente de staging

Tráfico asumido: **~50,000 peticiones/mes** (QA, demos automáticas, pruebas de carga periódicas).

| Servicio | Uso estimado | Costo mensual |
|----------|-------------|---------------|
| AWS Lambda | 50,000 invocaciones × 256 MB × 300 ms | **$0.00** (dentro de capa gratuita) |
| API Gateway HTTP API | 50,000 peticiones | **$0.05** |
| DynamoDB (on-demand) | ~5 M ops + 2 GB stored | **$0.00–$1.00** |
| CloudFront | < 100 GB transfer | **$0.00** (capa gratuita) |
| CloudWatch Logs | ~10 GB/mes | **~$5.00** |
| CloudWatch Alarms | 8 alarmas | **$0.80** |
| Sentry (plan free) | < 5,000 errores/mes | **$0.00** |
| **TOTAL STAGING** | | **~$7 / mes** |

---

## Ambiente de producción (proyección a 12 meses)

Tráfico asumido: **500,000 peticiones/mes** (producto validado con primeros usuarios reales).

| Servicio | Uso estimado | Costo mensual |
|----------|-------------|---------------|
| AWS Lambda | 500,000 invocaciones × 256 MB × 300 ms | **~$0.50** |
| API Gateway HTTP API | 500,000 peticiones | **$0.50** |
| DynamoDB (on-demand) | 50 M ops (r+w) + 10 GB stored | **~$15.00** |
| CloudFront | ~500 GB transfer out | **~$42.50** |
| S3 (imágenes) | 20 GB + operaciones | **~$0.50** |
| CloudWatch Logs | 20 GB/mes, 90 días retención | **~$12.00** |
| CloudWatch Alarms | 8 alarmas | **$0.80** |
| X-Ray | ~500,000 traces (sobre capa gratuita) | **~$1.50** |
| Sentry (plan Team) | Sin límite de errores | **$26.00** |
| **TOTAL PRODUCCIÓN** | | **~$99 / mes** |

> **Nota:** El mayor costo a escala es CloudFront (egress de imágenes de producto). Optimizable con cache-control headers agresivos y compresión WebP.

---

## Optimizaciones implementadas y proyectadas

### Implementadas ✅

| Optimización | Impacto |
|--|--|
| DynamoDB on-demand billing | Sin costo de capacidad reservada no utilizada en demo |
| CloudFront para assets estáticos (CDN) | Reduce latencia global y costo de S3 egress directo |
| Lambda 256 MB (mínimo viable) | Menor costo por GB-s; aumentable si el cold start lo requiere |
| SSM para secrets (sin Secrets Manager) | SSM Standard = gratis; Secrets Manager = $0.40/secret/mes |
| Logs retention 30 días en dev, 90 en prod | Controla acumulación de costos de CloudWatch storage |

### Proyectadas para escala 🔜

| Optimización | Impacto estimado |
|--|--|
| Lambda Provisioned Concurrency (top 3 funciones) | Elimina cold start en rutas críticas; +~$5/mes por función |
| DynamoDB Reserved Capacity (> 1 M ops/mes constantes) | -40% vs on-demand a tráfico estable |
| CloudFront + S3 Object Lambda para imágenes WebP on-the-fly | -30% en transfer costs |
| Sentry plan Team en producción | Observabilidad de errores sin límite de volumen |
| DynamoDB Point-in-Time Recovery desactivado en dev | Ahorro ~$0.20/GB/mes en ambientes no críticos |

---

## Resumen de costo total por ambiente

| Ambiente | Costo mensual estimado |
|----------|------------------------|
| Desarrollo / demo | ~$3 |
| Staging | ~$7 |
| Producción (500 K req/mes) | ~$99 |

**Costo total para operar los tres ambientes simultáneamente: ~$110 / mes.**

A 500,000 peticiones/mes en producción, el costo por petición es **~$0.0002 USD** — competitivo frente a alternativas PaaS como Heroku (~$25/dyno/mes) o Railway (~$20/mes por servicio).
