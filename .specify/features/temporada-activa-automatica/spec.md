# Feature Specification: Detección Automática de Temporada Activa & Transición Cero-Mantenimiento

**Identificador**: `temporada-activa-automatica`  
**Estado**: Especificado  
**Prioridad**: Alta  
**Aplicación**: REPUBLICARAQUISTAPP (Next.js 16 / React 19 / Vercel)  
**Objetivo**: Automatizar al 100% la transición entre temporadas (ej. 2025-26 a 2026-27) en el momento en que se disputen los primeros encuentros de la nueva temporada, eliminando cualquier intervención manual en el código.

---

## 1. Problema & Justificación

Actualmente, la constante de temporada activa estaba fijada en `export const ACTIVE_SEASON = 2025;` en `src/lib/constants.ts`, y ciertos componentes cliente contenían `season=2025` hardcodeado en sus peticiones de `fetch`. 

Al comenzar la temporada 2026-2027 en octubre 2026, el pipeline diario de GitHub Actions insertará partidos y estadísticas con `season: 2026`. Si la aplicación web no detecta dinámicamente este cambio, continuaría solicitando datos de 2025 a menos que un desarrollador edite y despliegue un cambio manual en el repositorio.

---

## 2. Requerimientos Funcionales

### RF1: Resolución Autónoma de Temporada Activa (`getActiveSeason`)
- Debe existir una función en `src/lib/season-service.ts` (o `src/lib/supabase.ts`) que determine de forma reactiva la temporada más reciente con partidos jugados:
  ```sql
  SELECT DISTINCT season FROM games WHERE status IN ('Final', 'Game Over', 'Live', 'In Progress', 'Completed Early') ORDER BY season DESC LIMIT 1
  ```
- Si existen juegos registrados de `2026`, la temporada activa devuelta es automáticamente `2026`.
- Si aún no hay juegos de 2026 disputados (período de pre-temporada o receso), retorna `2025` como fallback defensivo para asegurar que el portal mantenga estadísticas visibles y consistentes.
- La consulta debe disponer de caché en memoria de corta duración (TTL 5 minutos / 300 segundos) para no sobrecargar Supabase.

### RF2: Descubrimiento Dinámico de Temporadas Disponibles (`getAvailableSeasons`)
- Debe consultar las temporadas distintas existentes en Supabase (`games`), combinándolas con las temporadas canónicas (`[2026, 2025]`).
- Esto permite alimentar selectores históricos sin listas estáticas fijas.

### RF3: Estandarización de Endpoints API
- Todos los endpoints de API (`/api/stats/batting`, `/api/stats/pitching`, `/api/stats/player-splits`, `/api/games`, `/api/standings`, `/api/kpis`, `/api/bullpen`, `/api/situacional`, `/api/wpa`):
  - Si el parámetro `season` no es proporcionado en la URL, resuelven automáticamente la temporada activa vía `await getActiveSeason()`.
  - Prohibido cualquier valor hardcodeado `2025` como default rígido sin consulta dinámica.

### RF4: Sincronización en Server Components & Client Components
- Todas las páginas maestras (`src/app/page.tsx`, `src/app/standings/page.tsx`, `src/app/individuales/page.tsx`, `src/app/bullpen/page.tsx`, `src/app/colectivas/page.tsx`, etc.):
  - Resuelven `const currentSeason = await getActiveSeason()` en el servidor y transmiten `season={currentSeason}` a sus componentes de presentación.
- En los componentes cliente (ej: `individuales-view.tsx`, `pitching-view.tsx`, `bullpen-view.tsx`):
  - Las llamadas `fetch` deben interpolar la variable `season` recibida por props (`/api/stats/batting?season=${season}...`).

---

## 3. Criterios de Aceptación

1. **Autonomía Total**: Al insertarse en Supabase un registro de juego con `season = 2026`, una llamada a `getActiveSeason()` devuelve `2026` sin reiniciar ni editar código.
2. **Cero Pantallas en Blanco**: Si no hay partidos de 2026, el fallback garantiza que la temporada 2025 se presente sin errores ni datos vacíos.
3. **Cero Hardcoding**: Ningún archivo bajo `src/app/` ni `src/components/` debe contener `season=2025` quemado en llamadas `fetch` o estados iniciales no parametrizados.
4. **Build Limpio & Rendimiento**: El build de Next.js 16 (Turbopack) debe compilar al 100% sin advertencias ni regresiones en las 28 rutas.
