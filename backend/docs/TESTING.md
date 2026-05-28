# Estrategia de pruebas

## Unitarias (rápidas, sin red ni DB)

- **Backend:** `npm test` en `backend/` — Jest, repositorios y JWT mockeados (p. ej. `auth.service.spec.ts`).
- **Frontend:** `npm test` en `frontend/` — Vitest, lógica pura (`buildBackendBaseUrl`) y UI con Testing Library (`App.test.tsx`).

## Integración (PostgreSQL real)

- **Backend:** `npm run test:integration` — Nest + TypeORM contra la misma base configurada con `DB_*` (misma idea que al arrancar la API).
- Requiere Postgres en marcha y base accesible. Crea filas de prueba (alertas / eventos); usar entorno de desarrollo o una base dedicada.

## Funcionales / E2E (API completa)

- **Backend:** `npm run test:e2e` — `supertest` sobre `AppModule` con el mismo `ValidationPipe` que `main.ts`.
- Requiere Postgres (seed opcional según asertos futuros). Las pruebas actuales cubren salud pública, validación de login y 401 con usuario inexistente.

## Cobertura (objetivo ~90%)

- **Backend:** `cd backend && npm run test:cov` — Jest mide **sentencias, líneas y funciones ≥ 90%** y **ramas ≥ 88%** sobre un subconjunto acotado (dominio, casos de uso, servicios HTTP clave, utilidades de cámara, sin `main`/`AppModule`/ORM/adaptadores ni `seed.service` en el cómputo). Las ramas defensivas de `jwt-auth.guard` y `users.service` hacen costoso llegar al 90% en branches sin excluir más archivos.
- **Frontend:** `cd frontend && npm run test:cov` — Vitest + `@vitest/coverage-v8` sobre `src/api/*` (excepto `httpClient.ts`, acoplado a Axios en runtime), `contactDisplay.ts` y `setupAuthBackground.ts`. Umbrales: **líneas/funciones/sentencias ≥ 90%**, ramas ≥ 85%.

## Resumen de comandos

| Ámbito        | Comando                          | Dependencias        |
|---------------|-----------------------------------|---------------------|
| Unit backend  | `cd backend && npm test`          | Ninguna             |
| Cobertura backend | `cd backend && npm run test:cov` | Ninguna             |
| Integración   | `cd backend && npm run test:integration` | PostgreSQL   |
| E2E backend   | `cd backend && npm run test:e2e`  | PostgreSQL          |
| Unit frontend | `cd frontend && npm test`       | Ninguna             |
| Cobertura frontend | `cd frontend && npm run test:cov` | Ninguna        |

`npm run test:all` en backend ejecuta unit + integración + e2e (las dos últimas fallan si no hay base de datos).
