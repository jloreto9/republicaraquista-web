# Plan Técnico — Spec 039: Historial de por vida LVBP en `/jugadores`

**Feature Slug:** `039-player-lvbp-career-stats`  
**Fecha:** 2026-11-26  

---

## 1. Arquitectura y Decisiones (Escalera Ponytail)

1. **¿Se necesita construir?** Sí: `PlayerGeneralStatsCard` solo recibe las temporadas `2025+` almacenadas en Supabase (`seasonsBatting`, `seasonsPitching`, `postseasonBatting`, `postseasonPitching`) y no existe ningún servicio ni endpoint que consulte `yearByYear` de MLB Stats API para LVBP (`leagueId=135`).
2. **Reutilización y mínimo cambio:**
   - Se reutilizan las interfaces existentes `BattingStats` y `PitchingStats` (`src/types/sports.ts`), así como `formatSeason` y `getTeam` (`src/lib/constants.ts`) y los componentes de tabla `BattingSeasonTable` y `PitchingSeasonTable` dentro de `PlayerGeneralStatsCard`.
   - Se extienden los tipos en `src/types/player-splits.ts` con wrappers ligeros (`PlayerCareerSeasonEntry<T>`, `PlayerCareerPostseasonEntry<T>`, `PlayerLvbpCareerResult`) sin alterar las propiedades actuales de `PlayerGeneralProfile` ni romper ningún consumidor existente.
   - En lugar de bloquear la carga SSR/RSC o la consulta principal de splits en Supabase, la carrera histórica se carga de forma paralela y no bloqueante mediante `/api/stats/player-career` con caché de 1 hora (los datos históricos `< 2025` son inmutables).
3. **Módulo compartido client-safe (`player-career-service.ts`):**
   - `PlayerGeneralStatsCard` es `"use client"` y necesita las funciones puras de fusión (`mergeRegularCareerSeasons`, `mergePostseasonCareerSeasons`).
   - Para evitar que Next.js/Turbopack intente empaquetar dependencias de servidor (`./supabase` o `./player-splits-service`), `src/lib/player-career-service.ts` define localmente `parseInningsStringToOuts` y `outsToInningsDisplay` (espejando `player-splits-service.ts` L114-130) e importa únicamente `@/types/sports`, `@/types/player-splits` y `./constants`.
4. **Cálculo determinista y cero doble conteo:**
   - Para temporadas multi-equipo, `normalizeMlbCareerBatting` / `normalizeMlbCareerPitching` deduplican splits por `team.id`, generan primero la fila combinada (`2EQ`/`3EQ`, `isCombined: true`) y luego las sub-filas (`isTeamSplit: true`).
   - En el componente UI, `computeTotalBatting` y `computeTotalPitching` filtran `!entry.isTeamSplit` antes de acumular, cuentan temporadas únicas por `season`, y aplican una guardia estricta en `weightedAverageAll`: si cualquier entrada contabilizada carece de la métrica avanzada (`wOBA`, `FIP`, `Stats+`), retorna `undefined` (`--`).

---

## 2. Flujo de Datos y Contratos

```text
[Jugador seleccionado en /jugadores]
  │
  ├──(1) Render inmediato con `profile.general` (Supabase: 2025, 2026 + Stats+)
  │
  └──(2) Fetch paralelo no bloqueante (useEffect en PlayerGeneralStatsCard)
           │
           ▼
    GET /api/stats/player-career?player_id=<id>&type=<batter|pitcher>
           │  (Validación /^\d+$/ + Cache-Control s-maxage=3600)
           ▼
    getPlayerLvbpCareer(playerId, type)  [caché en memoria 1h]
           ├── fetchMlbLvbpYearByYear(id, group, "R")  ──┐ (Promise.all,
           └── fetchMlbLvbpYearByYear(id, group, "P")  ──┘  timeout 5000ms)
           │
           ▼
    normalizeMlbCareerBatting / Pitching
      • Filtra strictly Number(s.league.id) === 135, season > 1900, games > 0
      • Agrupa por season -> si >= 2 equipos: [combinada (NEQ), ...splits (isTeamSplit: true)]
      • Recalcula tasas (AVG/OBP/SLG/OPS/ISO/BABIP o ERA/WHIP/K9/BB9/KBB)
      • Deja wOBA, FIP y Stats+ como undefined
           │
           ▼
    Cliente: mergeRegularCareerSeasons & mergePostseasonCareerSeasons
      • Conserva temporadas presentes en Supabase (source: "supabase")
      • Anexa temporadas de MLB API solo para años ausentes en Supabase
      • Ordena descendente manteniendo [combinada, ...splits] dentro de cada año
           │
           ▼
    PlayerGeneralStatsCard
      • Renderiza filas combinadas + sub-filas indentadas (isTeamSplit)
      • Calcula `Total de por vida LVBP (N temp.)` y `Total Postemporada LVBP (N temp.)`
        excluyendo `isTeamSplit` y ocultando wOBA/FIP/Stats+ si falta en alguna temp.
```

---

## 3. Archivos a Modificar / Crear

1. **`src/types/player-splits.ts`** *(modificar)*:
   - Exportar `CareerDataSource = "supabase" | "mlb_api"`.
   - Exportar `PlayerCareerSeasonEntry<T>`, `PlayerCareerPostseasonEntry<T>` (`phase: "D" | "L" | "F" | "P"`) y `PlayerLvbpCareerResult`.
2. **`src/lib/player-career-service.ts`** *(crear)*:
   - Helpers locales client-safe `parseInningsStringToOuts` y `outsToInningsDisplay`.
   - `fetchMlbLvbpYearByYear` con `sportId=17&leagueId=135`, `AbortSignal.timeout(5000)` y filtro estricto `league.id === 135`.
   - Normalizadores puros `normalizeMlbCareerBatting`, `normalizeMlbCareerPitching` (y soporte para postemporada `phase: "P"`).
   - Funciones puras de fusión `mergeRegularCareerSeasons` y `mergePostseasonCareerSeasons`.
   - Orquestador cacheado (1h) `getPlayerLvbpCareer` y `clearPlayerCareerCache`.
3. **`src/app/api/stats/player-career/route.ts`** *(crear)*:
   - `export const dynamic = "force-dynamic";`.
   - `GET`: validación estricta de `player_id` (entero positivo -> 400 en español) y `type` (`"batter" | "pitcher"`), respuesta `{ success: true, career }` con `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`, manejo de error HTTP `500` en español.
4. **`src/components/stats/splits/player-general-stats-card.tsx`** *(modificar)*:
   - Fetch paralelo no bloqueante a `/api/stats/player-career` por `(profile.playerId, profile.type)` con cancelación (`AbortController`) al cambiar de jugador.
   - Fusión mediante `mergeRegularCareerSeasons` y `mergePostseasonCareerSeasons`.
   - Soporte de sub-filas indentadas `isTeamSplit?: boolean` en `TableRowItem<T>`, `BattingSeasonTable` y `PitchingSeasonTable`.
   - Guardia de totales sin doble conteo (`!isTeamSplit`) y regla estricta de `wOBA`/`FIP`/`Stats+` (`--` salvo cobertura completa en todas las temporadas contabilizadas), más etiquetas `Total de por vida LVBP (N temp.)` y `Total Postemporada LVBP (N temp.)`.
5. **`src/lib/__tests__/player-career.test.ts`** *(crear)*:
   - Pruebas unitarias cubriendo: filtrado estricto `leagueId=135`, temporadas de 1 equipo vs multi-equipo (`2EQ` + sub-filas), cálculos de tasas de bateo y pitcheo desde outs exactos, fusión Supabase + MLB API sin duplicar temporadas presentes en Supabase, y verificación de totales sin doble conteo ni `wOBA`/`FIP`/`Stats+` parciales.

---

## 4. Invariantes y Plan de Rollback

- **Invariantes verificados:**
  - `leagueId=135` obligatorio en consulta y normalización.
  - Cero métricas Statcast en tipos, servicio y UI.
  - Cero dependencias de servidor en `player-career-service.ts`.
  - Interfaz y mensajes de error 100% en español.
- **Plan de Rollback:**
  - Si la API de MLB presenta indisponibilidad o latencia excesiva en runtime, el endpoint retorna arrays vacíos y `PlayerGeneralStatsCard` degrada silenciosamente mostrando las temporadas de Supabase sin interrumpir la vista `/jugadores`.
  - Todos los cambios están aislados en los 5 archivos listados y son reversibles de forma atómica mediante `git revert <commit>`.
