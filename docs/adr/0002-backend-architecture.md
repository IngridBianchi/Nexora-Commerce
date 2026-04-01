# ADR-0002: Arquitectura de backend serverless en capas

- Estado: Aceptado
- Fecha: 2026-03-31
- Autores: Equipo Nexora Commerce

## Contexto

Nexora Commerce necesitaba un backend que cumpliera simultáneamente:

1. Costo operativo cercano a cero en entornos de demo/sandbox.
2. Latencia predecible para un catálogo y flujo de órdenes de volumen moderado.
3. Capacidad de evolucionar hacia una arquitectura más compleja sin reescrituras.
4. Onboarding rápido para un equipo pequeño sin operaciones dedicadas.
5. Compatibilidad nativa con los servicios de AWS ya utilizados (DynamoDB, CloudWatch, X-Ray).

Las opciones evaluadas incluían contenedores en ECS/Fargate, una API REST en EC2 y funciones Lambda con Serverless Framework.

## Decisión

Se adopta **AWS Lambda + API Gateway HTTP API** desplegado con **Serverless Framework v4** y una arquitectura interna en cuatro capas:

```
handlers/          ← Adaptadores HTTP (parse, validate, respond)
application/       ← Casos de uso y orquestación de dominio
domain/            ← Entidades, tipos e invariantes de negocio
infra/             ← Implementaciones de repositorios y servicios externos
```

La base de datos elegida es **Amazon DynamoDB** (tabla única, on-demand billing).

### Razones de la decisión

#### Lambda + API Gateway HTTP API

- Facturación por invocación: costo `~$0` con tráfico demo (< 1 M req/mes en capa gratuita).
- No hay servidores que mantener ni parches de SO.
- Escala automáticamente a cero y hasta miles de invocaciones concurrentes sin configuración.
- API Gateway HTTP API tiene ~70% menos latencia añadida que REST API y menor costo.
- Integración nativa con CloudWatch Logs, X-Ray y IAM sin agentes adicionales.

#### Serverless Framework v4

- Abstrae CloudFormation y reduce ~80% del boilerplate de IaC para proyectos Lambda.
- Soporta plugins maduros (`serverless-offline`, `serverless-dynamodb-local`).
- Pipeline de CI/CD (`serverless deploy`) reproducible desde cualquier entorno en < 5 min.
- Alternativas consideradas: AWS SAM (más verboso, sin ecosistema de plugins equivalente), CDK (mayor curva de aprendizaje para un equipo de una persona).

#### DynamoDB (tabla única, on-demand)

- `~$0` de costo en tráfico sandbox/demo (25 GB almacenamiento + 200 M operaciones gratuitas/mes).
- Sin servidor que administrar, backups automáticos con Point-in-Time Recovery.
- Latencia de lectura determinista < 5 ms (p99) para colecciones pequeñas.
- Única tabla con GSI para acceso por `orderId` y escaneo de productos.
- On-demand billing evita provisionar capacidad y elimina el riesgo de throttling en picos cortos.

#### Arquitectura en capas

- Separa las responsabilidades de HTTP parsing, lógica de dominio e infraestructura.
- Permite reemplazar repositorios o adaptadores externos (ej. cambiar DynamoDB por RDS) sin tocar los casos de uso.
- Facilita las pruebas unitarias e integración: los casos de uso se prueban con repositorios en memoria.

## Alternativas consideradas

### A) Contenedores en ECS Fargate

- Pros: entorno de ejecución determinista, más fácil de depurar localmente.
- Contras: costo mínimo ~$30/mes por tarea siempre activa; requiere VPC, ALB, registro de imágenes; onboarding más lento.

Resultado: descartada para esta fase. Candidata si el volumen de tráfico supera 10 M req/mes.

### B) EC2 con Node.js / Express

- Pros: máxima flexibilidad.
- Contras: gestión de parches, costo fijo, sin escala automática. No compatible con el objetivo de operaciones mínimas.

Resultado: descartada definitivamente.

### C) AWS SAM en lugar de Serverless Framework

- Pros: toolchain oficial de AWS.
- Contras: más verboso (YAML extenso), menor ecosistema de plugins, `sam local` más lento que `serverless-offline`.

Resultado: descartada. Serverless Framework fue suficiente y más productivo.

## Consecuencias

### Positivas

- Deploy desde cero en < 5 min reproducible por cualquier colaborador con credenciales AWS.
- Costo mensual en sandbox: `< $1 USD`.
- Cobertura de pruebas: 21 tests en backend (unitarios + integración con mocks en memoria).
- Separación de capas permite añadir nuevos endpoints sin modificar lógica de dominio existente.

### Negativas / Riesgos gestionados

- **Cold start:** p95 ≈ 200–400 ms en Lambda Node.js con cold start. Mitigación: provisioned concurrency si se detecta impacto en SLO.
- **DynamoDB query patterns rígidos:** el modelado de tabla única requiere planificar access patterns de antemano. Mitigación: GSI disponibles y documentados en `docs/platform/api-versioning-and-migrations.md`.
- **Vendor lock-in:** la arquitectura en capas aisla el acoplamiento a AWS en la capa `infra/`. Migrar a otro proveedor implicaría solo reescribir esa capa.

## Referencias

- [Serverless Framework v4 docs](https://www.serverless.com/framework/docs)
- [DynamoDB single-table design – Alex DeBrie](https://www.alexdebrie.com/posts/dynamodb-one-table/)
- [AWS Lambda performance best practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- `app/backend/src/` — implementación de capas `domain/`, `application/`, `infra/`, `handlers/`
- `docs/observability/slo-error-budget.md` — SLOs de latencia por endpoint
