# Bug Verification: Splits Inventando Cantidad de Juegos y Jugadores Inactivos (Bateadores y Lanzadores)

- **Slug**: splits-fake-games-players
- **Assessed**: `.specify/bugs/splits-fake-games-players/assessment.md`
- **Fixed**: `.specify/bugs/splits-fake-games-players/fix.md`
- **Verified**: 2026-10-31T22:33:25-04:00
- **Result**: verified

## Checks Run
- `npx tsx --env-file=.env.local src/lib/__tests__/player-splits.test.ts` — **PASS** (`343` jugadores activos reales en LVBP 2026-27; `Aldrem Corredor = 15 JJ`, `Sandy Gastón = 7 JJ`, `Harold Castro = null`, `Rito Lugo = null`, ID fantasma `672580` ausente, cero lanzadores con `0 PA` en listas de bateadores, `Local + Visitante === totalGames`).
- `npx tsx src/lib/__tests__/pitch-telemetry.test.ts` — **PASS** (cero regresiones en telemetría de pitcheo).
- `npx tsc --noEmit` — **PASS** (0 errores TypeScript).
- `npm run build` — **PASS** (Next.js 16.3.6 Turbopack compilado y optimizado exitosamente).

## Reproduction Re-Test
- En `/individuales?tab=splits` (`season=2026`):
  1. Ya no carga por defecto `Harold Castro` (`605612`) ni aparecen jugadores con `0` apariciones en la temporada (`Rito Lugo`, `Harold Castro`, ID duplicado `672580`), ni lanzadores con `0 PA` en la pestaña de bateadores.
  2. El conteo `Juegos` (`J`) ya no suma días de banca o bullpen sin acción (`Sandy Gastón` pasa de `14` filas crudas a `7` relevos reales; `Aldrem Corredor` cuadra exactamente `15` juegos `6 Local + 9 Visitante`).
  3. Los splits situacionales, platoon, conteos, outs, entradas y roles provienen exclusivamente de `statsapi.mlb.com` filtrando `sportId=17&leagueId=135` para la temporada exacta solicitada, sin multiplicadores sintéticos ni fuga de MLB (`sportId=1`) o temporadas previas.

## Regression Check
- `getStandings`, `getBattingStats`, `getPitchingStats` y el módulo `/pitching` mantienen compatibilidad completa de contratos y pasan todas las pruebas y el build de producción.

## Manual Verification Needed
- Ninguna obligatoria (el despliegue automático de Vercel en `https://republicaraquistapp.vercel.app/individuales?tab=splits` reflejará los cambios tras el push a `origin/main`).
