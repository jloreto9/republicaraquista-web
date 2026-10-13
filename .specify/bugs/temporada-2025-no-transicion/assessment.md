# Bug Assessment: Transición de Temporada Activa 2026-2027 en Vercel

- **Slug**: temporada-2025-no-transicion
- **Created**: 2026-10-13T07:22:00-04:00
- **Source**: Pasted text ("la aplicacion de vercel aun sigue mostrando la temporada 2025, al parecer no se soluciono lo que pedi")
- **Verdict**: valid
- **Severity**: high

## Report

El usuario indica que la aplicación desplegada en Vercel sigue mostrando la temporada 2025-2026 a pesar de que el primer partido oficial de la temporada LVBP 2026-2027 ya se disputó el 12 de octubre de 2026 (Tiburones de La Guaira @ Navegantes del Magallanes).

## Symptom

Al navegar por la aplicación web en producción (Vercel), los encabezados, la barra lateral (`Sidebar`), el menú móvil (`MobileNav`) y el Centro de Mando muestran "Temporada 2025 (2025-26)" en lugar de reflejar la nueva temporada oficial "Temporada 2026 (2026-27)".

## Reproduction

1. Ingresar a `https://republicaraquistapp.vercel.app/`.
2. Observar el pie de página de la barra lateral izquierda: muestra `Temporada LVBP 2025-26`.
3. Observar la barra superior en páginas que no pasan prop de temporada o usan el fallback sincrónico: muestra `Temporada 2025 (2025-26)`.
4. Consultar `getActiveSeason()`: retornaba `2025` porque en Supabase no existían juegos de 2026 con estado `Final` o `Live`.

## Suspected Code Paths

- `caraquista-reflex/scripts/ingest_lvbp_batch.py:110-120`: Payload de `teams` incluía columnas inexistentes en Supabase (`abbrev`, `short_name`, etc.) en lugar de `abbreviation`.
- `caraquista-reflex/scripts/ingest_lvbp_batch.py:230-245`: Payload de `games` incluía columnas inexistentes en Supabase (`game_pk`, `phase`, `is_night`, `game_type_code`), provocando error `PGRST204` y evitando la actualización de los juegos a estado `Final`.
- `caraquista-reflex/scripts/ingest_lvbp_batch.py:305-312`: Payload de `players` usaba `"name"` en vez de `"full_name"`, provocando fallo en cascada por foreign keys en `batting_stats` y `pitching_stats`.
- `republicaraquista-web/src/lib/constants.ts:86`: `ACTIVE_SEASON` estaba fijado en `2025` como fallback sincrónico, provocando que `Sidebar` y `MobileNav` mostraran siempre `2025-26`.
- `republicaraquista-web/src/lib/season-service.ts:3`: `FALLBACK_SEASON` estaba en `2025` y el umbral de detección en `2025`.

## Root Cause Hypothesis

Confianza: **Alta**.
Una falla en dos niveles concatenados:
1. **Pipeline de Ingesta ETL**: El script `ingest_lvbp_batch.py` fallaba silenciosamente en Supabase con errores PostgREST (`PGRST204`) por discrepancia de columnas (`teams.abbrev`, `games.game_pk`, `players.name`), por lo que el juego inaugural del 12 de octubre de 2026 (ID 870098) quedó en Supabase con estado `'Scheduled'` en lugar de `'Final'`. Como `getActiveSeason()` requería juegos con estado `'Final'` o `'Live'`, no detectaba el juego y retornaba el fallback.
2. **Constantes y Componentes Sincrónicos**: `ACTIVE_SEASON` y `FALLBACK_SEASON` continuaban en `2025`. Componentes de navegación como `Sidebar` y `MobileNav` leían directamente `ACTIVE_SEASON`, mostrando siempre "2025-26".

## Proposed Remediation

**Preferred**:
1. Corregir los payloads en `scripts/ingest_lvbp_batch.py` para coincidir exactamente con el esquema de Supabase (`teams`, `games`, `players`), y re-ejecutar la ingesta para que los juegos y estadísticas de 2026 se actualicen a `Final`.
2. Actualizar `ACTIVE_SEASON = 2026` y `FALLBACK_SEASON = 2026` en `republicaraquista-web`.
3. Sincronizar el snapshot `lvbp_season_2026.json` en `src/data/` para la analítica de bullpen y lineups.
4. Compilar con Next.js Turbopack y desplegar a Vercel con `git push origin main`.

**Files likely to change**:
- `c:/Users/Administrator/Projets/caraquista-reflex/scripts/ingest_lvbp_batch.py`
- `c:/Users/Administrator/Projets/republicaraquista-web/src/lib/constants.ts`
- `c:/Users/Administrator/Projets/republicaraquista-web/src/lib/season-service.ts`
- `c:/Users/Administrator/Projets/republicaraquista-web/src/data/lvbp_season_2026.json`
- `c:/Users/Administrator/Projets/republicaraquista-web/src/app/page.tsx`

**Tests to add or update**:
- Test de consulta a Supabase verificando que `getActiveSeason()` retorne `2026`.
- Test de carga completa de Server Components con temporada `2026`.

## Risks & Considerations

- Cero regresiones en la consulta de temporadas anteriores (2025, 2024, etc.) mediante selectores.
- Garantizar que los componentes no fallen cuando un equipo aún no ha disputado su primer encuentro.

## Open Questions

Ninguna. Causa raíz confirmada y verificada contra base de datos y API de MLB.
