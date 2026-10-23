# Bug Fix: Pitcher Splits Fallback & Ineligible MLB Players (Freddy Peralta)

- **Slug**: pitcher-splits-freddy-peralta
- **Fixed**: 2026-10-23T10:04:00-04:00
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary
Se corrigió la causa raíz que impedía cargar los splits de cualquier lanzador de la LVBP eliminando la columna inexistente `games_started` de la consulta a `pitching_stats` en Supabase, y se eliminaron definitivamente los peloteros hardcodeados ajenos a la LVBP (Freddy Peralta y Junior Caminero), restableciendo a los jugadores insignia reales de los Leones del Caracas e incrementando el límite del selector de jugadores a 5,000 registros para cubrir toda la liga.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/lib/player-splits-service.ts` | modified | Se eliminó `games_started` del select a `pitching_stats`, se añadió fallback a 2025 si la temporada activa aún no tiene registros del jugador, se reemplazaron Peralta/Caminero por estrellas de Leones del Caracas (Gudiño, Leal, Lugo, Kent, Castro, Corredor, Rondón, Bericoto) y se amplió el límite del selector a 5,000 registros. |
| `src/components/stats/splits/player-splits-view.tsx` | modified | Se cambiaron los fallbacks iniciales de selección de `691406`/`642547` (Caminero/Peralta) a `605612`/`660508` (Harold Castro / Norwith Gudiño). |

## Diff Highlights

```typescript
// player-splits-service.ts: Corrección del select de pitching_stats
- player_id, team_id, ip_decimal, h, r, er, bb, so, hr, games_started,
+ player_id, team_id, ip_decimal, h, r, er, bb, so, hr,

// player-splits-service.ts: featuredStars legítimos de Leones del Caracas
- { id: 691406, name: "Junior Caminero", ... }
- { id: 642547, name: "Freddy Peralta", ... }
+ { id: 605612, name: "Harold Castro", ... }
+ { id: 660508, name: "Norwith Gudiño", ... }
+ { id: 612797, name: "Erick Leal", ... }
+ { id: 682845, name: "Rito Lugo", ... }
+ { id: 687849, name: "Zak Kent", ... }

// player-splits-view.tsx: Fallback predeterminado para lanzadores y bateadores
- initialPlayerId || (initialType === "batter" ? 691406 : 642547)
+ initialPlayerId || (initialType === "batter" ? 605612 : 660508)
```

## Local Verification
- `tsc --noEmit --project republicaraquista-web/tsconfig.json` → Código de salida 0 (sin errores de compilación ni de tipado).
- Script de consulta contra Supabase validando generación completa de métricas de splits para Norwith Gudiño (2025 y 2026), Erick Leal y Zak Kent sin errores PostgreSQL 42703.
- Búsqueda global confirmando cero referencias residuales a los IDs 642547 (Peralta) y 691406 (Caminero).

## Deviations from Assessment
Ninguna. La remediación se ejecutó estrictamente conforme a lo planificado.

## Follow-ups
- Despliegue de los cambios a Vercel mediante push a `main`.
