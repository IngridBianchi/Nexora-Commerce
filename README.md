# Nexora Commerce

Monorepo de e-commerce con frontend en Next.js, backend serverless en AWS y paquetes compartidos para UI y configuracion de desarrollo.

## Contenido

- Vision general
- Arquitectura del monorepo
- Stack tecnologico
- Requisitos
- Instalacion
- Configuracion de entorno
- Ejecucion local
- Backend: calidad, despliegue y verificacion
- API
- Scripts utiles
- Seguridad y calidad
- Troubleshooting

## Vision general

Nexora Commerce implementa un flujo end-to-end de compra:

- Catalogo de productos consumido desde API.
- Carrito con estado global en frontend.
- Checkout con validacion de datos.
- Creacion de ordenes en backend.

El repositorio esta organizado como monorepo con Turborepo para tareas de build, lint y type-check en apps y paquetes compartidos.

## Arquitectura del monorepo

### Aplicaciones

- [apps/frontend](apps/frontend): storefront principal (catalogo, carrito, checkout).
- [apps/web](apps/web): app Next.js adicional para web.
- [apps/docs](apps/docs): app Next.js para documentacion.

### Backend

- [app/backend](app/backend): API serverless en AWS Lambda + API Gateway.
	- Endpoints: GET /products y POST /orders.
	- Contrato OpenAPI: [app/backend/openapi.yaml](app/backend/openapi.yaml).
	- Capas de codigo: [app/backend/src](app/backend/src) con domain, application, infra y handlers.

### Paquetes compartidos

- [packages/ui](packages/ui): componentes React compartidos.
- [packages/eslint-config](packages/eslint-config): configuraciones de lint.
- [packages/typescript-config](packages/typescript-config): bases de TypeScript.

## Stack tecnologico

- Node.js + npm workspaces + Turborepo.
- Frontend: Next.js 16, React 19, TypeScript, Zustand, UI components.
- Backend: TypeScript, AWS Lambda, API Gateway, DynamoDB, AWS SDK v3.
- Calidad: ESLint, TypeScript, pruebas con Node test runner.

## Requisitos

- Node.js >= 18.
- npm (el proyecto declara npm 11.6.2).
- AWS CLI configurado con credenciales validas.
- Serverless Framework v4 (local en backend, o global opcional).

## Instalacion

1. Instalar dependencias del monorepo (apps y packages):

```bash
npm install
```

2. Instalar dependencias del backend serverless (fuera de workspaces):

```bash
cd app/backend
npm install
cd ../..
```

## Configuracion de entorno

### Frontend

Crear [apps/frontend/.env.local](apps/frontend/.env.local) con:

```env
NEXT_PUBLIC_API_BASE_URL=https://TU_API_ID.execute-api.us-east-1.amazonaws.com/dev
```

Ejemplo en este entorno:

```env
NEXT_PUBLIC_API_BASE_URL=https://bhyrxu22xc.execute-api.us-east-1.amazonaws.com/dev
```

### Backend

Variables soportadas en [app/backend/serverless.yml](app/backend/serverless.yml):

- PRODUCTS_TABLE
- ORDERS_TABLE
- ALLOWED_ORIGIN
- AWS_NODEJS_CONNECTION_REUSE_ENABLED

Nota: en la configuracion actual de serverless, si ORDERS_TABLE no se define, usa Products por defecto para permitir funcionamiento en entornos con tabla unica.

## Ejecucion local

### Frontend principal

```bash
cd apps/frontend
npm run dev
```

Abrir http://localhost:3000

### Todas las apps del monorepo

```bash
npm run dev
```

Puertos esperados:

- frontend: 3000 (por defecto)
- web: 3001
- docs: 3002

## Backend: calidad, despliegue y verificacion

### Calidad local del backend

```bash
cd app/backend
npm run check-types
npm test
```

### Despliegue

```bash
cd app/backend
npx serverless deploy --stage dev --region us-east-1
```

### Verificacion post-deploy

Smoke test de productos:

```bash
curl "https://TU_API_ID.execute-api.us-east-1.amazonaws.com/dev/products?limit=3"
```

Smoke test de orden:

```bash
curl -X POST "https://TU_API_ID.execute-api.us-east-1.amazonaws.com/dev/orders" \
	-H "Content-Type: application/json" \
	-d '{
		"name":"QA User",
		"email":"qa.user@example.com",
		"address":"Calle 123",
		"items":[{"productId":"001","name":"Remera Nexora","unitPrice":2500,"quantity":1}]
	}'
```

## API

Base URL:

- https://TU_API_ID.execute-api.us-east-1.amazonaws.com/dev

Endpoints:

- GET /products?limit=100
- POST /orders

Documentacion del contrato:

- [app/backend/openapi.yaml](app/backend/openapi.yaml)

## Scripts utiles

### Raiz del monorepo

```bash
npm run dev
npm run build
npm run lint
npm run check-types
npm run format
```

### Frontend

```bash
npm run dev --workspace=frontend
npm run build --workspace=frontend
npm run lint --workspace=frontend
```

### Backend

```bash
cd app/backend
npm run check-types
npm test
npx serverless deploy --stage dev --region us-east-1
```

## Seguridad y calidad

Puntos implementados en el backend:

- Validacion de payload en ordenes.
- Respuestas HTTP consistentes.
- Headers defensivos en respuestas.
- Permisos IAM explicitos para DynamoDB en Lambda.
- Tests unitarios e integracion de handlers.

Archivo de referencia de mejoras:

- [CORRECCIONES_SOLID_SEGURIDAD.md](CORRECCIONES_SOLID_SEGURIDAD.md)

## Troubleshooting

### Error EADDRINUSE en frontend

El puerto 3000 ya esta ocupado. Cerrar proceso previo o usar otro puerto.

```bash
cd apps/frontend
npm run dev -- --port 3003
```

### Lock de Next.js en .next/dev/lock

Si queda un lock stale, eliminarlo y volver a iniciar.

### 500 en backend

Pasos recomendados:

1. Revisar logs de Lambda:

```bash
cd app/backend
npx serverless logs -f createOrder --stage dev --region us-east-1 --startTime 10m
```

2. Confirmar tablas DynamoDB y permisos IAM.
3. Validar que NEXT_PUBLIC_API_BASE_URL apunte al stage correcto.

## Estado actual

- Backend desplegado y operativo en stage dev.
- Frontend listo para consumo de API mediante NEXT_PUBLIC_API_BASE_URL.
- Lint, build y pruebas backend ejecutadas correctamente en la ultima iteracion.
