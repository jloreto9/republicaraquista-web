# Informe de Implementación y Verificación — Spec 037

**Slug:** `037-stats-integrity-audit-pagination`  
**Fecha de Verificación:** 2026-11-26  
**Auditor:** `auditor` (`#6`) · **Implementador:** `fixer` (`#9`, `#12`) · **Verificador Independiente:** `verifier` (`#14`)  
**Dictamen:** **CONVERGED** (Implementación verificada al 100% con paridad en vivo frente a MLB Stats API y TuJonrón, sin regresiones ni deuda nueva)

---

## 1. Resumen de Archivos Implementados y Verificados

### Núcleo Supabase y Aritmética de Pitcheo (`src/lib/supabase.ts`)
- **Paginación determinística centralizada:** Exporta `fetchAllSupabasePages<T>` con ordenación determinística por defecto sobre la clave primaria (`"id"` ascendente), solicitud inicial con `{ count: "exact" }` y carga paralela acotada (concurrencia `6`) de las páginas restantes, fallback secuencial cuando `count` no está disponible y degradación segura para mocks de pruebas sin `.range()` ni `.order()`.
- **Eliminación de truncamientos:** Reemplazados `.limit(10000)` y `.limit(5000)` en `reconcileSeasonGames`, `getCanonicalGameBoxscoreRows` (con chunking de 30 `game_id` + paginación + deduplicación con `reconciledBoxscoreCache`), `getBattingStats` (temporada y fallback por rango de fechas) y `getPitchingStats` (temporada y fallback por rango de fechas).
- **Outs exactos en `aggregatePitchingRows`:** Exporta `decimalInningsToOuts` y acumula outs enteros exactos (`ip_string` / `decimalInningsToOuts(ip_decimal)`) para calcular `inningsPitched`, `inningsDisplay`, `era`, `whip`, `kPer9` y `bbPer9` sobre `totalOuts / 3`, eliminando la deriva de redondeo `ip_decimal.toFixed(1)` que afectaba al 60.6% de los lanzadores.
- **Exclusión de exhibición y `game_type` canónico:** Exporta `isExhibitionGameType` y define `toCanonicalMlbGameType`; `filterGamesByPhase(..., "all")`, `aggregateBattingRows` y `aggregatePitchingRows` excluyen juegos de exhibición `'E'`/`'e'`/`'exhibition'`, y `reconcileSeasonGames` persiste códigos canónicos (`"R"`, `"D"`, `"L"`, `"F"`, `"E"`) en write-through manteniendo lectura retrocompatible de `["R", "regular"]`.

### Consumidores Secundarios (`src/lib/` y `src/app/api/`)
- `src/lib/player-splits-service.ts`: Reutiliza `decimalInningsToOuts`, `fetchAllSupabasePages` e `isExhibitionGameType` desde `./supabase`; pagina y excluye `'E'`/`'e'` en `getAllAvailablePlayersForSplits` (eliminando `.limit(10000)`) y `getPlayerSplitsProfile`, e incluye guarda para `opponentId` inválido.
- `src/lib/park-factors-service.ts`: Usa `fetchAllSupabasePages` en `fetchSupabaseBoxscoreGames` para `games` (eliminando `.limit(2000)`) y lotes de `batting_stats`.
- `src/lib/player-leverage-service.ts`: Usa `fetchAllSupabasePages` y excluye `game_type` `'E'`/`'e'` en `getPlayerLeverageSplits`.
- `src/lib/season-service.ts`: Usa `fetchAllSupabasePages` (`orderColumn: "season"`) en `getAvailableSeasons`.
- `src/app/api/pitching/search/route.ts`: Usa `fetchAllSupabasePages<PitcherDirectoryRow>` y excluye `'E'`/`'e'` en `getLvbpPitcherDirectory` sin `any`.

### Suite de Regresión Permanente
- `src/lib/__tests__/stats-pagination-integrity.test.ts` **[NEW]**: Cubre paginación multipágina (`>10,000` filas / caso Víctor Bericoto `7 HR`), compatibilidad con mocks sin `.range()`/`.order()`, chunking + deduplicación con `reconciledBoxscoreCache`, suma exacta de outs/IP (`6.2`, `10.2`, `0.2` IP), exclusión de `'E'`/`'e'` y write-through `game_type: "R"`.

---

## 2. Evidencia de Pruebas, Lint, Build y Validación en Vivo (Ejecutados tras `#12`)

### 2.1. Suites de Pruebas Unitarias (16/16 Pasaron)
- Comando ejecutado por `@verifier` (`#14`): `Get-ChildItem src/lib/__tests__/*.test.ts | npx tsx`
- Resultado observado: **16/16 suites pasaron** (`exit 0`): `stats-pagination-integrity.test.ts`, `realtime-postgame-sync.test.ts`, `individual-date-range.test.ts`, `plus-stats.test.ts`, `park-factors.test.ts`, `player-splits.test.ts`, `player-leverage-and-splits.test.ts`, `awards-engine.test.ts`, `collective-pitching-roles.test.ts`, `fielding-stats.test.ts`, `leones-stats-extrainning.test.ts`, `lineup-card.test.ts`, `lob-tracker.test.ts`, `matchup-card.test.ts`, `pitch-telemetry.test.ts` y `streaks-service.test.ts`.

### 2.2. ESLint, TypeScript, Build y Auditoría de Límites
- **ESLint dirigido:** `npx eslint src/app/api/pitching/search/route.ts src/lib/park-factors-service.ts src/lib/player-leverage-service.ts src/lib/season-service.ts src/lib/supabase.ts src/lib/__tests__/stats-pagination-integrity.test.ts` → **`exit 0` (0 errores, 0 warnings)**.
  - *Alcance reportado por `@verifier` (`#14`):* `npm run lint` global reporta 125 errores y 113 warnings preexistentes en otros módulos del repositorio (incluyendo `any` preexistentes en `src/lib/player-splits-service.ts`); `npx tsc --noEmit` no reportó errores en ninguno de los archivos del diff (solo 1 error preexistente ajeno en `src/components/calendar/calendar-event-modal.tsx:218`).
- **`npm run build` (`next build`):** **`exit 0`**, compilado en `4.9s` con `19/19` páginas estáticas generadas.
- **`git grep -n "\.limit(" src/`:** `0` ocurrencias restantes de `.limit(10000)`, `.limit(5000)` o `.limit(2000)` en consultas de estadísticas/juegos.

### 2.3. Verificación en Vivo (`.env.local` vía `npx tsx -`, contra MLB Stats API y TuJonrón.com)
- `getCanonicalSeasonGames(2026, "R")`: **224** juegos (`132` regulares finalizados, `92` `Scheduled`; `'E'`/`'e'` excluidos).
- `getCanonicalGameBoxscoreRows(2026, finalRIds)`: **11,503** filas de bateo y **11,495** filas de pitcheo (`132` juegos, sin truncamiento).
- `getBattingStats(2026, "R", "all", 500, 0)` (`178` bateadores) vs MLB Stats API (`181` splits): **0 diferencias** en `AB, H, 2B, 3B, HR, RBI, R, BB, SO, SB, CS` y **0 faltantes con `>0 AB`** (solo 3 jugadores con `0 AB/PA` en MLB). `getBattingStats(2026, "all", "all", 500, 0)` mantiene paridad exacta sin fuga `'E'`/`'e'`.
- `getPitchingStats(2026, "R", "all", 500, 0)` (`251` lanzadores) vs MLB Stats API (`249` splits): **0 diferencias** en los `249` lanzadores oficiales en `G, IP, H, R, ER, BB, SO, HR, ERA` (las 2 filas extra corresponden a duplicados por homonimia ya existentes en BD: `805769 Jose Leandro` y `666678 Pedro Garcia`, documentados en `assessment.md` como saneamiento de BD fuera de alcance).
- `GET /api/pitching/search?q=Oviedo`: HTTP `200`, `count: 16`, devuelve `801743 Adolfo Oviedo`.

| Jugador (ID) | App (`getBattingStats` / `getPitchingStats`) | MLB Stats API (2026 `R`) | TuJonrón (`estadisticas`) |
|---|---|---|---|
| **Víctor Bericoto (682674)** | 27 G, 107 AB, 41 H, 7 2B, 1 3B, 7 HR, 31 RBI, 20 BB, 15 SO, .383/.488/.664 (1.152) | Idéntico + 4 GIDP | Idéntico + 4 GIDP |
| Ildemaro Vargas (545121) | 19 G, 73 AB, 21 H, 4 2B, 2 HR, 7 RBI, 14 BB, 4 SO, .288/.409/.425 (.834) | Idéntico | N/C |
| Ali Castillo (542419) | 34 G, 154 AB, 47 H, 4 2B, 1 HR, 12 RBI, 6 BB, 12 SO, .305/.329/.351 (.680) | Idéntico | Idéntico |
| Carlos Pérez (656024) | 33 G, 125 AB, 43 H, 7 2B, 10 HR, 22 RBI, 14 BB, 13 SO, .344/.411/.640 (1.051) | Idéntico | Idéntico |
| Moisés Gómez (664332) | 24 G, 80 AB, 20 H, 4 2B, 6 HR, 22 RBI, 7 BB, 29 SO, .250/.326/.525 (.851) | Idéntico | N/C |
| Símon Muzziotti (665922) | 34 G, 146 AB, 52 H, 10 2B, 6 HR, 36 RBI, 11 BB, 17 SO, .356/.403/.548 (.951) | Idéntico | Idéntico |
| Alexi Amarista (506560) | 33 G, 129 AB, 40 H, 10 2B, 2 HR, 17 RBI, 13 BB, 19 SO, .310/.375/.434 (.809) | Idéntico | Idéntico |
| Jonathan Villar (542340) | 2 G, 10 AB, 2 H, 0 HR, 1 RBI, 1 BB, 2 SO, .200/.273/.200 (.473) | Idéntico | N/C |
| Elias Díaz (553869) | 1 G, 3 AB, 1 H, 0 HR, 1 RBI, 1 BB, 1 SO, .333/.500/.333 (.833) | Idéntico | N/C |
| Félix Doubront (467094, P) | 6 G, 25.1 IP, 5.68 ERA, 1.50 WHIP, 16 ER, 25 SO | Idéntico | N/A |
| Silvino Bracho (611093, P) | 14 G, 14.2 IP, 3.07 ERA, 1.36 WHIP, 5 ER, 12 SO | Idéntico | N/A |
| Adolfo Oviedo (801743, P) | 6 G, 6.2 IP, 9.45 ERA, 1.95 WHIP, 7 ER, 4 SO | Idéntico | N/A |
| Henry Gómez (683510, P) | 19 G, 10.2 IP, 4.22 ERA, 1.97 WHIP, 5 ER, 11 SO | Idéntico | N/A |
| Touki Toussaint (657053, P) | 2 G, 0.2 IP, 67.50 ERA, 12.00 WHIP, 5 ER, 1 SO | Idéntico | N/A |

---

## 3. Dictamen Final de Convergencia

Todos los requerimientos funcionales (`RF-01` a `RF-05`), criterios de aceptación (`CA-01` a `CA-04`), 16/16 suites unitarias, ESLint dirigido sobre los archivos limpios del diff, `npm run build` y la comparación en vivo contra MLB Stats API y TuJonrón.com han sido verificados sin regresiones. **Spec 037 queda CERRADA y CONVERGENTE.**
