# Tareas de Implementación 036: Tarjeta PNG Editorial H2H, Comparativa Multi-Temporada y Modal Exportable en Matchup 360

**Slug:** `036-matchup-h2h-stathead-card-png`  
**Fecha:** 2026-11-25  

---

## Track A — Spec-Kit (`spec-writer`)

- [x] **T001 [Track A]**: Redactar y versionar `spec.md`, `plan.md` y `tasks.md` en `specs/036-matchup-h2h-stathead-card-png/` siguiendo el formato canónico y los guardrails LVBP.

---

## Track B — Módulo 1: Modelo de Datos, Motor H2H y Pruebas (`matchup-data`)

- [x] **T002 [Track B]**: Definir y exportar `MatchupCardWinner`, `MatchupCardRow`, `MatchupCardSection`, `MatchupCardPlayerMeta` y `MatchupCardData` en `src/types/matchup.ts` preservando los tipos existentes.
- [x] **T003 [Track B]**: Actualizar `compareBatters` y `comparePitchers` en `src/lib/matchup-engine.ts` para priorizar `woba`, `wrcPlus` y `fip` oficiales de liga, y limpiar los comentarios heredados con lenguaje deportivo directo.
- [x] **T004 [Track B]**: Implementar y exportar `buildBatterMatchupCardData` (18 filas en 2 bloques, `K%` menor es mejor) en `src/lib/matchup-engine.ts`.
- [x] **T005 [Track B]**: Implementar y exportar `buildPitcherMatchupCardData` (17 filas en 2 bloques, helper `compareWinLoss` para `G-P`, direcciones correctas de `ERA`/`WHIP`/`FIP`/`BB%`/`HR`/`BB`/`K%`) en `src/lib/matchup-engine.ts`.
- [x] **T006 [Track B]**: Crear y ejecutar la suite `src/lib/__tests__/matchup-card.test.ts` junto con `npx eslint` sobre los archivos del Módulo 1.

---

## Track C — Módulo 2: Motor Gráfico Canvas PNG (`matchup-canvas`)

- [x] **T007 [Track C]**: Implementar `src/lib/matchup-card-canvas.ts` replicando la carga CORS-safe en 3 niveles de `src/lib/pitch-card-canvas.ts` y exportando `MATCHUP_CARD_WIDTH` (`1080`), `computeMatchupCardHeight`, `renderMatchupCardToCanvas` y `generateMatchupCardBlob`.
- [x] **T008 [Track C]**: Maquetar el diseño Claro Editorial Retina `2x` (`#FFFFFF`, cabecera 3 columnas con retratos `216×268`, encabezados `#F1F5F9`/`#991B1B`, celdas ganadoras `#E6F4EA` y pie con balance H2H y `100 = Promedio LVBP`) y verificar `npx eslint` + `npx tsc --noEmit`.

---

## Track D — Módulo 3: UI `/matchup` y Modal Exportable (`matchup-ui`)

- [x] **T009 [Track D]**: Crear `src/components/matchup/matchup-card-modal.tsx` con cierre por `Escape`/backdrop, bloqueo de scroll, vista previa en `<canvas>`, botones Lucide `Descargar PNG` y `Copiar Imagen`, y control de renderizado compatible con `react-hooks/set-state-in-effect`.
- [x] **T010 [Track D]**: Habilitar en `src/components/matchup/matchup-view.tsx` los selectores independientes de temporada (`2026-27`, `2025-26`) y fase (`R`, `D`, `L`, `F`, `all`) por jugador con caché cliente `Map`, `AbortController` y pools reales hacia `compareBatters`/`comparePitchers`.
- [x] **T011 [Track D]**: Integrar el botón **"Tarjeta PNG"**, `useMemo` para `cardData`, `<MatchupCardModal />`, iconos Lucide en el toggle `Bateadores / Lanzadores` y limpieza de copy en `src/components/matchup/matchup-view.tsx`, pasando `npx eslint`.

---

## Track E — Verificación Integral y Cierre

- [x] **T012 [Track E]**: Ejecutar verificación integral (`matchup-card.test.ts`, suites existentes, `npx eslint`, `npx tsc --noEmit`, auditoría de copy deportivo LVBP y `npm run build`), actualizar checkboxes de `tasks.md` y documentar el cierre en `specs/036-matchup-h2h-stathead-card-png/implementation.md`.
