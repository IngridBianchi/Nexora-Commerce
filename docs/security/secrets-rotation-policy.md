# Politica de rotacion de secretos - Nexora Commerce

Estado: Version 1.0 (2026-03-31)

## 1. Alcance

Secrets cubiertos:

1. `STRIPE_SECRET_KEY`
2. `STRIPE_WEBHOOK_SECRET`
3. `SENTRY_DSN`
4. `ADMIN_TOKEN`
5. Credenciales de deploy (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SERVERLESS_ACCESS_KEY`)

## 2. Frecuencia

1. Rotacion trimestral obligatoria (90 dias).
2. Rotacion inmediata ante sospecha de exposicion.
3. Rotacion obligatoria al cambiar responsables de acceso.

## 3. Proceso operativo

1. Generar nuevo secreto en proveedor origen (Stripe/Sentry/AWS).
2. Subir a SSM Parameter Store como `SecureString` en ruta por stage.
3. Actualizar secrets de GitHub Actions si aplica.
4. Ejecutar deploy a `dev` y smoke tests.
5. Promover a `stage` y luego `prod` con checklist de release.
6. Invalidar/eliminar secreto anterior.

## 4. Controles automatizados

1. gitleaks en CI para prevenir secretos en git.
2. Validacion de presence de secrets antes de deploy backend.
3. `npm audit` y CodeQL activos para reducir riesgo de exfiltracion por dependencia.

## 5. Evidencia requerida por rotacion

1. PR o ticket con fecha de rotacion.
2. Registro de stage afectado (`dev|stage|prod`).
3. Confirmacion de smoke test exitoso post-rotacion.
