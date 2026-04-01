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
  public/
    logo.png          Logo principal de Nexora
    remera.png        Imagen del producto Remera Nexora
    taza.png          Imagen del producto Taza Nexora
    gorra.png         Imagen del producto Gorra Nexora
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
  middleware.ts         Proteccion de rutas /admin/* (auth por token o cookie)
  .env.local          Variable de entorno local (no versionada)
  components.json     Configuracion de shadcn/ui
  postcss.config.mjs  Plugin @tailwindcss/postcss
  next.config.ts      Configuracion Next.js (remotePatterns para picsum.photos)
  vitest.config.ts    Configuracion de pruebas unitarias con jsdom
```

---

## Requisitos

- Node.js >= 18
- Backend Nexora desplegado (o accesible localmente)

---

## Configuracion

Crear `.env.local` en esta carpeta:

### Storefront (publico)

```env
# URL del API Gateway — el cliente agrega /v1/ internamente
NEXT_PUBLIC_API_BASE_URL=https://TU_API_ID.execute-api.us-east-1.amazonaws.com/dev

# Sesion y registro/login de storefront
STOREFRONT_AUTH_SECRET=<secreto-minimo-16-chars>

# Persistencia global de usuarios registrados (DynamoDB)
# Si no se define, usa ORDERS_TABLE como fallback
STOREFRONT_USERS_TABLE=Products

# Envio real de emails desde Amazon SES (opcional)
STOREFRONT_EMAIL_FROM=no-reply@nexora.dev
STOREFRONT_EMAIL_REPLY_TO=soporte@nexora.dev
STOREFRONT_EMAIL_REGION=us-east-1

# Credenciales demo opcionales para login rapido
STOREFRONT_DEMO_EMAIL=demo@nexora.local
STOREFRONT_DEMO_PASSWORD=demo12345
```

Flujo storefront actualmente soportado:

- `POST /api/storefront/auth/register`: crea cuenta, inicia sesion y devuelve `verificationUrl` temporal.
- `POST /api/storefront/auth/login`: autentica credenciales demo, usuarios persistidos en DynamoDB o usuarios legacy de cookie.
- `POST /api/storefront/auth/request-email-verification`: regenera el enlace de verificacion.
- `POST /api/storefront/auth/verify-email`: valida token, marca `emailVerified` y refresca la sesion.
- `POST /api/storefront/auth/request-password-reset`: genera `resetUrl` temporal.
- `POST /api/storefront/auth/reset-password`: actualiza la contrasena y recrea la sesion.
- `GET /api/storefront/auth/me`: devuelve `authenticated`, `user` y el flag `emailVerified`.

Si `STOREFRONT_EMAIL_FROM` esta configurado, el frontend server-side usa Amazon SES para enviar correos reales de verificacion y reset.

Si SES no esta configurado o falla, la UI usa el fallback demo y muestra las URLs temporales devueltas por los endpoints como enlaces accionables.

Sin esta variable, el cliente HTTP usa `http://localhost:3000/dev` como fallback. Si el backend no esta disponible, la app carga el catalogo local definido en `lib/products.ts` y lo indica en pantalla.

### Dashboard admin (servidor Next.js — NO usar prefijo NEXT_PUBLIC_)

```env
# Token secreto de acceso al dashboard (minimo 16 caracteres)
ADMIN_TOKEN=<secreto-minimo-16-chars>     # genera con: openssl rand -hex 32

# DynamoDB para consultas server-side desde el admin
AWS_REGION=us-east-1
ORDERS_TABLE=Products

# Credenciales AWS (solo si Next.js no corre en un entorno con IAM role)
AWS_ACCESS_KEY_ID=<tu-access-key>
AWS_SECRET_ACCESS_KEY=<tu-secret-key>
```

> **Seguridad:** `ADMIN_TOKEN` es una variable solo servidor. Nunca usar el prefijo `NEXT_PUBLIC_` para secretos.

> **Imagenes de producto:** en `dev`, la API devuelve `imageUrl` desde CloudFront (`https://d2ouygleh8pygc.cloudfront.net`). El catalogo fallback local usa `/remera.png`, `/taza.png` y `/gorra.png` desde `public/`.

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
npm test         # Alias de tests unitarios (vitest)
npm run test:unit # Tests unitarios (vitest)
npm run test:coverage # Cobertura con umbrales minimos (Vitest + V8)
```

---

## Dashboard Admin

Desde Fase 5, el frontend incluye un dashboard de administracion protegido por auth.

### Rutas

| Ruta           | Descripcion                                 |
|----------------|---------------------------------------------|
| `/admin/login` | Formulario de login con contrasena (token)  |
| `/admin`       | Dashboard: stats + tabla de ordenes         |

### Acceso

1. Definir `ADMIN_TOKEN` en `.env.local` (ver seccion Configuracion).
2. Iniciar el servidor: `npm run dev`.
3. Navegar a `http://localhost:3000/admin` → redirige a `/admin/login`.
4. Ingresar el valor de `ADMIN_TOKEN` → cookie httpOnly de 8 horas.

La cabecera del storefront y del admin usan `public/logo.png` como logo principal.

### Features del dashboard

- 4 stat cards: total de ordenes, pagadas, pendientes, revenue total (solo PAID).
- Filtro por status: ALL / PAID / PENDING / CANCELLED / FAILED.
- Tabla con: Orden ID, cliente, email, status (badge colorizado), total, items, fecha.
- Boton "Actualizar" para reload de datos.
- Boton "Cerrar sesion" que invalida la cookie.

### Arquitectura de seguridad

- `middleware.ts`: verifica el token antes de servir cualquier ruta `/admin/*`.
- `app/api/admin/auth/route.ts`: valida el token y setea cookie `admin_token` (httpOnly, secure en prod).
- `app/api/admin/orders/route.ts`: query DynamoDB server-side (el cliente nunca toca AWS).
- Upgrade path: reemplazar con NextAuth.js + AWS Cognito para auth robusta en produccion.

---

## Flujo funcional

1. Al iniciar, `page.tsx` llama a `GET /products` via `lib/api-client.ts`.
2. Si el usuario entra en `/login`, puede alternar entre iniciar sesion, registrarse, solicitar recuperacion o verificar email con token.
3. El registro crea la cuenta, abre sesion y deja el email como pendiente de verificacion hasta completar el enlace temporal.
4. Si el backend responde, muestra el catalogo remoto. Si falla, usa el catalogo local con aviso.
5. El usuario filtra catalogo en vivo por texto, categoria y rango de precio.
6. La UI oculta productos agotados por defecto y permite incluirlos con un toggle.
7. El usuario agrega productos al carrito (Zustand: `addItem` incrementa cantidad si el item ya existe).
8. El carrito se restaura automaticamente desde LocalStorage al cargar la app (hidratacion segura).
9. Al ingresar nombre, email y direccion, se valida en cliente con `lib/checkout-validation.ts`.
10. El formulario de checkout se guarda como borrador en LocalStorage y expira luego de 30 minutos.
11. Al confirmar, el checkout muestra estados UX claros: `loading`, `success`, `error` y opcion de `retry`.
12. Al confirmar, se envia `POST /orders` con los items del carrito.
13. Si la orden es exitosa, se muestra el `orderId`, se limpia el carrito y se elimina el borrador guardado.

## Auth storefront

- La pagina `app/login/page.tsx` soporta los modos `login`, `register`, `forgot`, `reset` y `verify`.
- El estado cliente del usuario vive en `app/hooks/use-storefront-user.ts` y ahora incluye `emailVerified`.
- La home muestra un aviso de cuenta pendiente de verificacion cuando la sesion existe pero el email aun no fue confirmado.
- El checkout bloquea compras desde cuentas autenticadas no verificadas y redirige al flujo de verificacion.
- La persistencia primaria de usuarios esta en DynamoDB mediante `lib/storefront-users-service.ts`; la cookie firmada `storefront_users` queda como compatibilidad retroactiva.

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

**No llega ningun email de verificacion o reset:**

Es esperado en este estado del proyecto. El storefront corre en modo demo y expone el enlace temporal directamente en la UI usando `verificationUrl` o `resetUrl`.

---

## Referencias

- README general del monorepo: [../../README.md](../../README.md)
- Contrato API: [../../app/backend/openapi.yaml](../../app/backend/openapi.yaml)
- README del backend: [../../app/backend/README.md](../../app/backend/README.md)
