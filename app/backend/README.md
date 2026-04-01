# Backend - Nexora Commerce

API serverless para el e-commerce Nexora. Expone endpoints de productos, ordenes y pagos sobre AWS Lambda + API Gateway, con persistencia en DynamoDB e integracion con Stripe Checkout.

## Contenido

- Arquitectura.
- Stack.
- Estructura de carpetas.
- Requisitos.
- Instalacion.
- Variables de entorno.
- Ejecucion local (dev).
- Calidad: tipos y pruebas.
- Despliegue.
- Verificacion post-deploy.
- API: endpoints y contrato.
- Seed de datos.
- Troubleshooting.

---

## Arquitectura

El backend sigue una arquitectura en capas basada en principios SOLID:

```
src/
  domain/         Entidades e interfaces de negocio (Product, Order, OrderStatus)
  application/
    ports/        Interfaces de entrada/salida (ProductReader, OrderWriter, OrderStatusUpdater)
    services/     Casos de uso (ListProductsService, CreateOrderService)
    validators/   Validacion de entrada de negocio (order-validator, checkout-validator)
  infra/
    db/           Cliente DynamoDB (AWS SDK v3)
    repositories/ Implementaciones DynamoDB de puertos
  handlers/       Entry points Lambda (buildGetProductsHandler, buildCreateOrderHandler,
                  buildCreateCheckoutSessionHandler, buildStripeWebhookHandler)
  config/         Lectura de variables de entorno
  shared/         Helpers HTTP (respuestas, parseo de body, headers)
```

Cada handler Lambda es una funcion pura construida mediante una factoria (`buildXHandler`) que acepta dependencias inyectadas, lo que permite testear la logica sin infraestructura real.

---

## Stack

- Runtime: Node.js 18 (Lambda)
- Lenguaje: TypeScript 5 (compilado con `ts-node` en desarrollo)
- Infraestructura: Serverless Framework v4
- Nube: AWS Lambda + API Gateway + DynamoDB
- Pagos: Stripe (Checkout Sessions + webhooks firmados)
- Secrets: AWS SSM Parameter Store (SecureString)
- AWS SDK: v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- IDs de orden: `uuid` v4
- Testing: Node.js test runner nativo (sin dependencias externas de test)

---

## Estructura de carpetas

```
app/backend/
  index.ts                  Re-exporta handlers (entry point de referencia)
  serverless.yml            Definicion de infraestructura y funciones
  tsconfig.json             Configuracion TypeScript
  package.json              Dependencias y scripts
  openapi.yaml              Contrato OpenAPI 3.0.3
  dynamodb-seed/            Datos de ejemplo para poblar DynamoDB
  src/                      Codigo fuente (ver Arquitectura arriba)
  tests/                    Pruebas unitarias e integracion de handlers
```

---

## Requisitos

- Node.js >= 18
- npm >= 9
- AWS CLI configurado con credenciales validas (`aws configure`)
- Cuenta en Serverless Framework (org: `ingrid1991`) con access key activo

---

## Instalacion

Este proyecto **no forma parte del npm workspace** del monorepo raiz. Debe instalarse por separado:

```bash
cd app/backend
npm install
```

---

## Variables de entorno

El backend lee sus variables mediante `src/config/env.ts` con fallbacks seguros. No requiere archivo `.env` para funcionar; las variables se inyectan via `serverless.yml` en despliegue.

| Variable                              | Descripcion                              | Origen en deploy             |
|---------------------------------------|------------------------------------------|------------------------------|
| `PRODUCTS_TABLE`                      | Nombre de la tabla DynamoDB de productos | `serverless.yml` custom      |
| `ORDERS_TABLE`                        | Nombre de la tabla DynamoDB de ordenes   | `serverless.yml` custom      |
| `ALLOWED_ORIGIN`                      | Valor del header CORS                    | Env o `*`                    |
| `PRODUCT_IMAGES_BASE_URL`             | Base URL del CDN para imagenes de producto | Env o default por stage    |
| `AWS_NODEJS_CONNECTION_REUSE_ENABLED` | Reutilizacion de conexiones HTTP         | Fijo en `serverless.yml`     |
| `STRIPE_SECRET_KEY`                   | Clave secreta de Stripe                  | SSM `/nexora/{stage}/stripe/secret_key` |
| `STRIPE_WEBHOOK_SECRET`               | Secret de firma de webhook Stripe        | SSM `/nexora/{stage}/stripe/webhook_secret` |

> Los secrets de Stripe **nunca se definen en codigo ni en archivos de entorno**. Se almacenan en AWS SSM Parameter Store como `SecureString` y se inyectan en tiempo de deploy por Serverless Framework.

---

## Ejecucion local (dev)

Para invocar los handlers localmente con Serverless offline (si se requiere), instalar el plugin correspondiente. De lo contrario, las pruebas unitarias cubren el comportamiento de los handlers sin levantar infraestructura:

```bash
npm test
```

---

## Calidad: tipos y pruebas

### Verificacion de tipos

```bash
npm run check-types
```

### Pruebas

```bash
npm test
```

Las pruebas se ejecutan con el test runner nativo de Node.js. No requieren conexion a AWS.

```bash
npm run test:watch
```

### Cobertura de pruebas

| Archivo de prueba                                        | Que cubre                                                 |
|----------------------------------------------------------|-----------------------------------------------------------|
| `tests/order-validator.test.ts`                         | Validacion de payload de orden                            |
| `tests/create-order-service.test.ts`                    | Logica de creacion de orden y calculo de total            |
| `tests/create-order-handler.integration.test.ts`        | Flujo HTTP completo de POST /orders                       |
| `tests/get-products-handler.integration.test.ts`        | Flujo HTTP completo de GET /products                      |
| `tests/create-checkout-session-handler.integration.test.ts` | POST /checkout/session, idempotency key, errores Stripe |
| `tests/stripe-webhook-handler.integration.test.ts`      | POST /webhooks/stripe, firma invalida, idempotencia       |

---

## Despliegue

### Deploy por stage

```bash
# Stage dev
npx serverless deploy --stage dev --region us-east-1

# Stage stage
npx serverless deploy --stage stage --region us-east-1

# Stage prod
npx serverless deploy --stage prod --region us-east-1
```

### Promotion via GitHub Actions

El workflow `.github/workflows/deploy-backend.yml` gestiona el promotion flow:

| Job            | Disparo                           | Descripcion                                          |
|----------------|-----------------------------------|------------------------------------------------------|
| `quality-gate` | Automatico en cada push           | typecheck, tests, npm audit high                     |
| `deploy-dev`   | Auto en push a `main`             | Deploy + smoke test GET /v1/products                |
| `deploy-stage` | Manual via `Run workflow`         | Deploy a stage con GitHub Environment `stage`        |
| `deploy-prod`  | Manual via `Run workflow`         | Deploy a prod, requiere aprobacion de revisor        |

El despliegue actualiza:
- Las funciones Lambda (`getProducts`, `createOrder`, `createCheckoutSession`, `stripeWebhook`).
- Los permisos IAM del rol de ejecucion Lambda sobre DynamoDB.
- La configuracion de API Gateway con CORS habilitado (excepto `/webhooks/stripe`).
- Las alarmas CloudWatch de errores.
- El bucket S3 `ProductImagesBucket` para almacenar imagenes de producto.

### CDN de imagenes

La distribucion CloudFront se crea por separado con [scripts/setup-cdn.ps1](../../scripts/setup-cdn.ps1), porque el usuario de deploy puede no tener permisos `cloudfront:CreateDistribution`.

```powershell
.\scripts\setup-cdn.ps1 -Stage dev
```

URL actual de `dev`:

```text
https://d2ouygleh8pygc.cloudfront.net
```

Cuando `PRODUCT_IMAGES_BASE_URL` esta configurada, el backend resuelve automaticamente:

- `PRODUCT#001` → `remera.png`
- `PRODUCT#002` → `taza.png`
- `PRODUCT#003` → `gorra.png`

### Outputs de CloudFormation

Tras el deploy, el stack expone:

```bash
npx serverless info --stage dev --region us-east-1
```

| Output                    | Descripcion                                        |
|---------------------------|----------------------------------------------------|
| `ProductImagesBucketName` | Nombre del bucket S3 para imagenes de productos    |

> **Requisito de permisos:** el usuario AWS de despliegue debe tener permisos de CloudFormation, Lambda, API Gateway, S3 e IAM. Las tablas DynamoDB deben existir previamente (no se crean desde serverless por restriccion de `dynamodb:TagResource`).

> **Nota sobre CloudWatch alarms:** el usuario AWS de despliegue debe tener permiso `cloudwatch:PutMetricAlarm` para crear/actualizar alarmas durante `serverless deploy`.

> **CloudFront propagation:** la primera creacion de la distribucion CloudFront puede tardar 10-15 minutos. Los deploys posteriores son mas rapidos.

---

## Verificacion post-deploy

Tras el despliegue, Serverless imprime los endpoints. Los endpoints usan el prefijo `/v1/` desde Fase 5:

**Productos (v1):**

```bash
curl "https://bhyrxu22xc.execute-api.us-east-1.amazonaws.com/dev/v1/products?limit=3"
```

Respuesta esperada (`200`):

```json
{
  "data": [
    {
      "id": "003",
      "name": "Gorra Nexora",
      "description": "Gorra negra ajustable con logo Nexora",
      "price": 1800,
      "imageUrl": "https://d2ouygleh8pygc.cloudfront.net/gorra.png"
    }
  ]
}
```

**Crear orden (v1):**

```bash
curl -X POST "https://bhyrxu22xc.execute-api.us-east-1.amazonaws.com/dev/v1/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "address": "Calle 123, Buenos Aires",
    "items": [
      {
        "productId": "001",
        "name": "Remera Nexora",
        "unitPrice": 2500,
        "quantity": 1
      }
    ]
  }'
```

Respuesta esperada (`201`):

```json
{
  "message": "Order created successfully",
  "orderId": "d011b96e-...",
  "total": 2500,
  "status": "PENDING"
}
```

**Logs en tiempo real:**

```bash
npx serverless logs -f createOrder --stage dev --region us-east-1 --startTime 10m
npx serverless logs -f getProducts --stage dev --region us-east-1 --startTime 10m
```

---

## API: endpoints y contrato

Desde Fase 5 todos los endpoints de negocio usan prefijo `/v1/`. El webhook de Stripe no se versiona (es controlado por Stripe).

| Metodo | Path                    | Descripcion                                               |
|--------|-------------------------|-----------------------------------------------------------|
| GET    | `/v1/products`          | Listar productos (`?limit=N`, max 100)                    |
| POST   | `/v1/orders`            | Crear una orden                                           |
| POST   | `/v1/checkout/session`  | Crear sesion de pago Stripe (requiere `Idempotency-Key`)  |
| POST   | `/webhooks/stripe`      | Recibir eventos Stripe (firma verificada, sin CORS)       |

El contrato completo con schemas de request, response y errores esta en:

- [`openapi.yaml`](openapi.yaml) — OpenAPI 3.0.3

### Respuestas de error

| Codigo | Significado                              |
|--------|------------------------------------------|
| 400    | Body JSON invalido o parametro incorrecto |
| 422    | Validacion de negocio fallida            |
| 500    | Error interno del servidor               |

Todos los errores devuelven:

```json
{ "error": "descripcion del error" }
```

---

## Seed de datos

Para poblar la tabla `Products` en DynamoDB con datos de ejemplo:

```bash
aws dynamodb put-item \
  --table-name Products \
  --region us-east-1 \
  --item file://dynamodb-seed/product1.json

aws dynamodb put-item \
  --table-name Products \
  --region us-east-1 \
  --item file://dynamodb-seed/product2.json

aws dynamodb put-item \
  --table-name Products \
  --region us-east-1 \
  --item file://dynamodb-seed/product3.json
```

Esquema de item en DynamoDB:

| Atributo      | Tipo   | Descripcion                        |
|---------------|--------|------------------------------------|
| `PK`          | String | `PRODUCT#001` (clave de particion) |
| `SK`          | String | `DETAILS` (clave de orden)         |
| `name`        | String | Nombre del producto                |
| `price`       | Number | Precio                             |
| `description` | String | Descripcion del producto           |
| `stock`       | Number | Cantidad en stock                  |

---

## Troubleshooting

**400 en POST /checkout/session:**

Verificar que el cliente incluye el header `Idempotency-Key` con valor de entre 8 y 255 caracteres.

**400 en POST /webhooks/stripe (firma invalida):**

Verificar que `STRIPE_WEBHOOK_SECRET` en SSM coincide con el secret del webhook configurado en el dashboard de Stripe.

```bash
aws ssm get-parameter --name "/nexora/dev/stripe/webhook_secret" --region us-east-1 --query "Parameter.Version"
```

**500 al llamar a un endpoint:**

1. Verificar logs de Lambda:
   ```bash
   npx serverless logs -f createOrder --stage dev --region us-east-1 --startTime 10m
   npx serverless logs -f stripeWebhook --stage dev --region us-east-1 --startTime 10m
   ```
2. Confirmar que la tabla DynamoDB existe en la region correcta.
3. Verificar que el rol Lambda tiene los permisos IAM definidos en `serverless.yml`.

**Error de permisos en deploy:**

El usuario de despliegue necesita permisos de CloudFormation, Lambda, API Gateway e IAM. Si falta `dynamodb:TagResource`, la creacion de tablas desde CloudFormation fallara — crear las tablas manualmente desde la consola AWS o con el CLI.

**Tipos con errores:**

```bash
npm run check-types
```

Asegurarse de que `ts-node` esta instalado en `devDependencies`.
