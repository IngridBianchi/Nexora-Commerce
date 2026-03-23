# Docs App - Nexora Commerce

Aplicacion Next.js destinada al portal de documentacion de Nexora Commerce. Su objetivo es centralizar guias tecnicas, contratos API, decisiones arquitectonicas, runbooks operativos y onboarding del equipo.

## Stack

- Next.js 16
- React 19
- TypeScript
- Configuraciones compartidas de eslint y tsconfig

## Objetivo funcional

- Publicar documentacion tecnica y funcional versionada junto al codigo.
- Consolidar manuales de operacion, integracion y despliegue.
- Reducir conocimiento tribal dejando el contexto del monorepo accesible para desarrollo y operaciones.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run check-types
```

## Desarrollo local

Esta app usa el puerto 3002 por defecto.

```bash
npm run dev
```

Abrir http://localhost:3002

## Validacion de calidad

```bash
npm run lint
npm run check-types
```

## Referencias

- README general del monorepo: ../../README.md
- Configuraciones compartidas: ../../packages/eslint-config y ../../packages/typescript-config
