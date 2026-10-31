# Plan Técnico: Pitching Summary Editorial 3:4 (2400x3200 px) y Telemetría Expandida

**Slug:** `015-pitching-summary-3x4-metrics`  
**Fecha:** 2026-10-31  
**Spec de Referencia:** [`spec.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/015-pitching-summary-3x4-metrics/spec.md)  

---

## 1. Arquitectura y Escalera Ponytail

1. **Reutilización de motores existentes (Escalón 2 Ponytail):**
   - `RE24`, `encodeBaseState`, `calculateWinExpectancy` y `calculateLeverageIndex` ya existen y están probados en [`src/lib/wpa-engine.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/wpa-engine.ts). Se invocan directamente desde `pitch-parser.ts`.
   - `classifyHardness` y `transformCoordinates` ya existen en [`src/lib/spray-engine.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/spray-engine.ts). Se reutilizan para construir el perfil de contacto determinístico BIS sin duplicar reglas geométricas.
   - `getPlayerHeadshotUrl`, `hasLocalPlayerPhoto` y `getMlbFallbackHeadshotUrl` ya viven en [`src/lib/constants.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/constants.ts).
2. **Fuente Única de Verdad PBP (`CLAUDE.md` §3):**
   - Se consolida toda la lectura de `game/{gamePk}/feed/live` en [`src/lib/pitch-parser.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/pitch-parser.ts), eliminando el bucle duplicado y `calculateSimpleLI` en `game-data/route.ts` y la fórmula heurística `0.175` en `game-logs/route.ts` y `season-data/route.ts`.
3. **Caché LRU en Memoria + Concurrencia Acotada:**
   - Los partidos con estado `Final` son inmutables: `fetchAndParseGameTelemetryCached` almacena el resumen compactado por `${gamePk}:${pitcherId}:${branch}` (máx. 600 entradas en memoria) y procesa múltiples juegos en lotes de `6` con `Promise.allSettled` y `AbortSignal.timeout(10000)`.
4. **Compatibilidad Total de Contratos (`CLAUDE.md` §1 y §14):**
   - Se mantienen intactos los nombres de tipos exportados (`PitchGameDataResponse`, `PitcherProfile`, `PitcherGameLog`, `StatcastPitchRow`, `PBPKPIs`) y las firmas `generatePitchingCardBlob` / `downloadPitchingCard`, extendiéndolos con propiedades tipadas para evitar regresiones en `pitching-view.tsx` o rutas consumidoras.

---

## 2. Distribución Espacial del Lienzo `2400 x 3200 px`

| Banda | Rango Y (`px`) | Contenido Modo Juego (`game`) | Contenido Modo Temporada (`season`) |
|---|---|---|---|
| **Cabecera** | `44 – 374` | Retrato 3-capas CORS-safe, Nombre, Bio + Rol (`Abridor`/`Relevista`), Rival/Fecha/Decisión, Escudo | Igual + Subtítulo de Temporada/Fase y Récord |
| **Doble Barra KPI** | `400 – 690` | Fila 1: `IP, BF, H, R, ER, BB, SO, HR, P-S(Str%)` · Fila 2: `GSv2/QS` o `IR-IRS`, `WPA`, `RE24`, `aLI(gmLI)`, `F-Strike%`, `CSW%`, `Whiff%`, `SwStr%`, `PutAway%` | Fila 1: `JJ(GS), W-L(SV/HLD), IP, TBF, ERA, WHIP, FIP, ERA-, SO, BB` · Fila 2: `K%, BB%, K-BB%, BABIP, LOB%, BAA/OPS, F-Strike%, CSW%, Whiff%, WPA/RE24` + Rol (`QS/GSv2` o `IR-IRS%/SD-MD`) |
| **Tríptico Central** | `740 – 1400` | LVBP: Pitcheos/Inning, `LI` Real/Inning, Platoon · MLB: Velo, Zona 3x3, Movimiento `iVB/HB` | LVBP: Bolas/Strikes Últ. 10, `Whiff%` Real Últ. 10, `CSW%` Real Últ. 10 · MLB: Velo, Zona 3x3, Movimiento |
| **Bloque Medio** | `1460 – 2140` | LVBP: Destinos PBP (Izq) + Contacto BIS (Der) · MLB: Repertorio Hawk-Eye (`Ext, Chase%, Z-Contact%`) + Contacto Óptico (`EV, HardHit%, Barrel%`) | LVBP: Splits Temporada (Izq) + Contacto BIS (Der) · MLB: Repertorio Hawk-Eye + Contacto Óptico |
| **Bloque Inferior** | `2200 – 2990` | Splits del Partido (`vs LHB, vs RHB, RISP, Limpias`) + `Vueltas al Orden (1ra/2da/3ra+ TTO)` o Situación Relevo | Historial Últimos 10 Juegos con PBP 100% Real (`IP, H, CL, BB, K, P-S, GSv2, WPA, CSW%, Whiff%`) |
| **Pie Institucional** | `3040 – 3156` | `@republicaraquista • Jorge Leonardo Loreto • @GilbertoMendez` \| Metodología limpia \| `Thomas Nestico (@TJStats)` | Igual |

---

## 3. Plan de Rollback

- El árbol de Git inicia limpio sobre `main`. Ante cualquier regresión en `tsc` o `next build`, `git checkout -- <archivo>` o `git revert <commit>` restaura el estado previo de forma inmediata sin efectos colaterales en base de datos (solo lectura sobre Supabase).
