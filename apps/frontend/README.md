# Frontend - Nexora Commerce

Aplicacion principal de e-commerce de Nexora.

## Descripcion

Este frontend implementa:

- Catalogo de productos.
- Carrito de compras con estado global.
- Checkout con validacion de datos.
- Integracion con backend serverless para listar productos y crear ordenes.

## Stack

- Next.js 16
- React 19
- TypeScript
- Zustand para estado del carrito

## Requisitos

- Node.js 18 o superior
- Backend desplegado y accesible por HTTP

## Configuracion

Crear archivo .env.local en esta carpeta con:

```env
NEXT_PUBLIC_API_BASE_URL=https://TU_API_ID.execute-api.us-east-1.amazonaws.com/dev
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Ejecucion local

```bash
npm run dev
```

Abrir http://localhost:3000

## Flujo funcional esperado

1. Cargar productos desde GET /products.
2. Agregar productos al carrito.
3. Completar datos de checkout.
4. Confirmar compra enviando POST /orders.

## Troubleshooting rapido

- Si aparece EADDRINUSE, el puerto 3000 ya esta en uso. Ejecutar:

```bash
npm run dev -- --port 3003
```

- Si falla la API, verificar NEXT_PUBLIC_API_BASE_URL y el despliegue backend.

## Referencias

- README general del monorepo: ../../README.md
- Contrato API: ../../app/backend/openapi.yaml
