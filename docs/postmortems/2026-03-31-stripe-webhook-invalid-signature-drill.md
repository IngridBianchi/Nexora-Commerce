# Postmortem - Simulacro Stripe Webhook Invalid Signature

Fecha: 2026-03-31
Tipo: Simulacro controlado (drill)
Severidad: SEV-2 (degradacion de confirmacion de pago)
Duracion: 18 minutos
MTTR: 18 minutos

## 1. Resumen

Se ejecuto un simulacro de incidente donde el endpoint /webhooks/stripe comienza a rechazar eventos con 400 Invalid Stripe signature. El objetivo fue validar capacidad de deteccion, diagnostico y recuperacion operativa con runbooks.

## 2. Impacto simulado

1. Ordenes de pago exitoso permanecen temporalmente en estado PENDING.
2. Incremento de StripeWebhooksHandled con status InvalidSignature.
3. Alerta stripeWebhook-errors activada.

## 3. Timeline

1. T+00:00 - Se detecta alarma stripeWebhook-errors.
2. T+02:00 - On-call abre docs/runbooks/stripe-webhook-failures.md.
3. T+06:00 - Confirmacion en logs: Invalid Stripe signature.
4. T+10:00 - Se identifica secret webhook desalineado en stage.
5. T+14:00 - Rotacion/reaplicacion de secret y redeploy.
6. T+18:00 - Test event Stripe retorna 200, alarma vuelve a OK.

## 4. Causa raiz (simulada)

Configuracion inconsistente de STRIPE_WEBHOOK_SECRET entre Stripe Dashboard y parametro SSM del stage.

## 5. Deteccion

Mecanismos efectivos:

1. CloudWatch Alarm de errores Lambda
2. Logs estructurados con contexto de error
3. Entrega fallida visible en Stripe Dashboard

## 6. Resolucion

1. Reaplicar webhook secret correcto en SSM SecureString.
2. Redeploy backend en stage afectado.
3. Ejecutar test event checkout.session.completed desde Stripe.
4. Verificar transicion de ordenes a PAID.

## 7. Acciones preventivas

1. Checklist pre-release: validar webhook secret por stage.
2. Agregar paso de smoke test webhook en promotion a stage/prod.
3. Mantener runbook actualizado y visible en release checklist.

## 8. Evidencia de cumplimiento Fase 4

1. MTTR del simulacro < 30 min (objetivo cumplido).
2. Incidente documentado con timeline y acciones.
3. Uso efectivo de runbook operativo.
