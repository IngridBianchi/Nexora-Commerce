# Web App - Nexora Commerce

Aplicacion Next.js reservada para la futura consola operativa de Nexora Commerce. Su objetivo es alojar flujos internos como panel administrativo, revision de ordenes, metricas comerciales y herramientas de soporte, separados de la storefront publica.

## Stack

- Next.js 16
- React 19
- TypeScript
- Paquete compartido @repo/ui

## Objetivo funcional

- Desacoplar la experiencia publica de compra de los flujos internos del negocio.
- Servir como base para dashboard operativo, gestion de catalogo y monitoreo comercial.
- Reutilizar configuraciones y componentes compartidos del monorepo sin mezclar concerns con `apps/frontend`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run check-types
```

## Desarrollo local

Esta app usa el puerto 3001 por defecto.

```bash
npm run dev
```

Abrir http://localhost:3001

## Calidad

```bash
npm run lint
npm run check-types
```

## Referencias

- README general del monorepo: ../../README.md
- UI compartida: ../../packages/ui
