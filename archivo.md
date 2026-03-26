# Filtrados en busquedas y filtro en vivo

## Objetivo

Este documento explica como funciona actualmente el filtrado de productos en el frontend de Nexora Commerce, incluyendo busqueda en vivo, filtros por categoria/precio y visibilidad de stock agotado.

## Que es el filtro en vivo

El filtro en vivo es una busqueda que se aplica mientras el usuario escribe, sin necesidad de hacer click en un boton ni recargar la pagina.

En la practica:

1. El usuario escribe en el buscador o modifica los filtros.
2. Los estados de filtros se actualizan al instante.
3. La lista visible de productos se recalcula inmediatamente.

## Implementacion actual

La logica vive en `apps/frontend/app/page.tsx` y `apps/frontend/lib/catalog-filters.ts`.

Los filtros aplicados son combinables:

- Texto (`searchTerm`): coincidencia parcial (`includes`) en nombre + descripcion.
- Categoria (`selectedCategory`): incluye "Todas" o una categoria especifica.
- Precio minimo (`minPrice`): solo productos con `price >= minPrice`.
- Precio maximo (`maxPrice`): solo productos con `price <= maxPrice`.
- Stock (`includeOutOfStock`): permite ocultar productos agotados por defecto.

Formula conceptual simplificada:

`resultado = texto && categoria && precioMin && precioMax && stock`

Esto permite busquedas mas precisas sin perder la respuesta en tiempo real.

## Comportamiento UX observado

- La respuesta visual es inmediata (live) en cada cambio de filtros.
- La busqueda es case-insensitive.
- Si no hay coincidencias, se muestra: "No se encontraron productos".
- Existe opcion de "Limpiar filtros" para volver rapidamente al estado inicial.

## Ventajas de este enfoque

- Experiencia rapida y fluida.
- Filtros combinados sin llamadas extra al backend.
- Implementacion modular con funciones testeables.
- Buen rendimiento para catalogos chicos/medianos.

## Manejo de stock agotado en UI

- Si `stock <= 0`, la tarjeta muestra badge "Agotado".
- El boton de compra se deshabilita y muestra "Sin stock".
- Si el usuario ya agrego la cantidad maxima disponible, el boton muestra "Stock maximo en carrito".
- Si no hay dato de stock, el producto se considera comprable (modo compatible con API actual).

## Limitaciones actuales

- No hay ordenamiento (por precio, nombre, etc.).
- No hay normalizacion avanzada (acentos, sinonimos, typos).
- La API de productos aun no expone `category` y `stock` de forma garantizada para todos los entornos.

## Recomendaciones para evolucion

1. Incluir opcion de ordenar resultados (precio asc/desc, alfabetico).
2. Aplicar normalizacion de acentos para mejorar busquedas en espanol.
3. Llevar categoria y stock como campos oficiales en el contrato OpenAPI.
4. Agregar pruebas E2E para escenarios combinados de filtros.

## Estado actual dentro de Fase 1

- Busqueda por texto con filtro en vivo: implementada.
- Filtros reales por precio/categoria/busqueda: implementados.
- Manejo de stock agotado visible en UI: implementado.
