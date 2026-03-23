# Frontend - Nexora Commerce

Aplicacion principal de e-commerce de Nexora. Permite explorar el catalogo, gestionar el carrito y realizar compras conectadas al backend serverless.

## Contenido

- Stack
- Estructura de carpetas
- Requisitos
- Configuracion
- Ejecucion local
- Scripts
- Flujo funcional
- Componentes UI
- Troubleshooting
- Referencias

---

## Stack

| Tecnologia            | Version   | Rol                                      |
|-----------------------|-----------|------------------------------------------|
| Next.js               | 16.1.7    | Framework React con App Router           |
| React                 | 19.2.3    | UI                                       |
| TypeScript            | ^5        | Tipado estatico                          |
| Tailwind CSS          | ^4.0.0    | Estilos por clases utilitarias           |
| shadcn/ui             | ^4.0.8    | Sistema de componentes sobre Radix       |
| Radix UI              | ^1.4.3    | Primitivos de accesibilidad              |
| lucide-react          | ^0.577.0  | Iconos                                   |
| Zustand               | ^5.0.12   | Estado global del carrito                |
| class-variance-authority | ^0.7.1 | Variantes de componentes con CVA        |
| tailwind-merge        | ^3.5.0    | Fusion segura de clases Tailwind         |

---

## Estructura de carpetas

```
apps/frontend/
  app/
    globals.css       Estilos globales (Tailwind v4 + shadcn/ui)
    layout.tsx        Layout raiz
    page.tsx          Pagina principal: catalogo, carrito y checkout
  components/
    ui/
      button.tsx      Componente Button (shadcn/ui + CVA + Radix Slot)
      card.tsx        Componente Card
      input.tsx       Componente Input
  lib/
    api-client.ts     Cliente HTTP para GET /products y POST /orders
    checkout-validation.ts  Validacion de datos de checkout en cliente
    products.ts       Catalogo local de fallback
    types.ts          Interfaces TypeScript del dominio (Product, CartItem, OrderRequest...)
    utils.ts          Helper cn() para merging de clases Tailwind
  store/
    cart.ts           Store Zustand: items, addItem, removeItem, clearCart, getTotal, getItemsCount
  .env.local          Variable de entorno local (no versionada)
  components.json     Configuracion de shadcn/ui
  postcss.config.mjs  Plugin @tailwindcss/postcss
  next.config.ts      Configuracion Next.js (remotePatterns para picsum.photos)
```

---

## Requisitos

- Node.js >= 18
- Backend Nexora desplegado (o accesible localmente)

---

## Configuracion

Crear `.env.local` en esta carpeta:

```env
NEXT_PUBLIC_API_BASE_URL=https://TU_API_ID.execute-api.us-east-1.amazonaws.com/dev
```

Sin esta variable, el cliente HTTP usa `http://localhost:3000/dev` como fallback. Si el backend no esta disponible, la app carga el catalogo local definido en `lib/products.ts` y lo indica en pantalla.

---

## Ejecucion local

```bash
npm run dev
```

Abrir http://localhost:3000

---

## Scripts

```bash
npm run dev      # Servidor de desarrollo (puerto 3000 por defecto)
npm run build    # Build de produccion
npm run start    # Servidor de produccion (requiere build previo)
npm run lint     # Lint con ESLint
```

---

## Flujo funcional

1. Al iniciar, `page.tsx` llama a `GET /products` via `lib/api-client.ts`.
2. Si el backend responde, muestra el catalogo remoto. Si falla, usa el catalogo local con aviso.
3. El usuario agrega productos al carrito (Zustand: `addItem` incrementa cantidad si el item ya existe).
4. Al ingresar nombre, email y direccion, se valida en cliente con `lib/checkout-validation.ts`.
5. Al confirmar, se envia `POST /orders` con los items del carrito.
6. Si la orden es exitosa, se muestra el `orderId` y el carrito se limpia.

---

## Componentes UI

Los componentes de `components/ui/` son generados con shadcn/ui sobre Radix UI y estilizados con Tailwind v4 + CVA:

- `Button`: variantes `default`, `outline`, `secondary`, `ghost`, `destructive`, `link` y tamaños `xs`, `sm`, `default`, `lg`, `icon`.
- `Card`: contenedor con `CardHeader`, `CardTitle` y `CardContent`.
- `Input`: campo de texto accesible.

La funcion `cn()` en `lib/utils.ts` combina `clsx` con `tailwind-merge` para evitar conflictos de clases.

---

## Troubleshooting

**Puerto 3000 en uso (EADDRINUSE):**

```bash
npm run dev -- --port 3003
```

**El catalogo muestra solo productos locales:**

Verificar que `NEXT_PUBLIC_API_BASE_URL` apunta al backend correcto y que el backend esta desplegado y accesible.

**Error de build por tipos:**

```bash
npx tsc --noEmit
```

---

## Referencias

- README general del monorepo: [../../README.md](../../README.md)
- Contrato API: [../../app/backend/openapi.yaml](../../app/backend/openapi.yaml)
- README del backend: [../../app/backend/README.md](../../app/backend/README.md)
