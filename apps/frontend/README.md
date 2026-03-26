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
    catalog-filters.ts Reglas de filtros combinados de catalogo
    checkout-draft.ts Persistencia segura del borrador de checkout (LocalStorage con TTL)
    checkout-validation.ts  Validacion de datos de checkout en cliente
    products.ts       Catalogo local de fallback
    types.ts          Interfaces TypeScript del dominio (Product, CartItem, OrderRequest...)
    utils.ts          Helper cn() para merging de clases Tailwind
  store/
    cart.ts           Store Zustand con persistencia segura de carrito en LocalStorage
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
3. El usuario filtra catalogo en vivo por texto, categoria y rango de precio.
4. La UI oculta productos agotados por defecto y permite incluirlos con un toggle.
5. El usuario agrega productos al carrito (Zustand: `addItem` incrementa cantidad si el item ya existe).
4. El carrito se restaura automaticamente desde LocalStorage al cargar la app (hidratacion segura).
5. Al ingresar nombre, email y direccion, se valida en cliente con `lib/checkout-validation.ts`.
6. El formulario de checkout se guarda como borrador en LocalStorage y expira luego de 30 minutos.
7. Al confirmar, el checkout muestra estados UX claros: `loading`, `success`, `error` y opcion de `retry`.
8. Al confirmar, se envia `POST /orders` con los items del carrito.
9. Si la orden es exitosa, se muestra el `orderId`, se limpia el carrito y se elimina el borrador guardado.

## Filtro en vivo de catalogo

- Filtros combinados: texto + categoria + precio minimo + precio maximo.
- Boton de limpiar filtros para volver al estado base.
- "Incluir productos agotados" como toggle opcional.
- Las reglas de filtrado estan desacopladas en `lib/catalog-filters.ts` y cubiertas por pruebas unitarias.

## Stock agotado en UI

- Badge "Agotado" cuando `stock <= 0`.
- Boton de compra deshabilitado para productos sin stock.
- Limite de compra por producto cuando se alcanza el stock disponible.

## Estados UX de checkout

- `loading`: feedback visual con mensaje de procesamiento y estado activo.
- `success`: confirmacion clara con `orderId` y total final.
- `error`: mensaje de fallo legible con causa (API o red).
- `retry`: boton de reintento que reutiliza el ultimo payload valido del checkout.

## Persistencia local segura

- Carrito:
  - Key: `nexora-cart`
  - Mecanismo: Zustand `persist` con `skipHydration` + rehidratacion explicita.
  - Seguridad: sanitizacion de items persistidos antes de usarlos.

- Borrador checkout:
  - Key: `nexora-checkout-draft`
  - TTL: 30 minutos (`CHECKOUT_DRAFT_TTL_MS`).
  - Seguridad: parseo seguro, validacion de schema y limpieza automatica ante datos corruptos o expirados.

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
