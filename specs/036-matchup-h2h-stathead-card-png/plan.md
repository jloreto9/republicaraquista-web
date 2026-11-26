# Plan Técnico 036: Tarjeta PNG Editorial H2H, Comparativa Multi-Temporada y Modal Exportable en Matchup 360

**Slug:** `036-matchup-h2h-stathead-card-png`  
**Fecha:** 2026-11-25  

---

## 1. Estrategia y Fuente de Verdad

Siguiendo la jerarquía de prioridades (`CLAUDE.md`) y la Escalera Ponytail:
- **Una sola fuente de verdad para métricas y `Stats+`:** Reutilizar los campos enriquecidos por liga (`woba`, `wrcPlus`, `opsPlus`, `fip`, `eraPlus`, `fipPlus`, `whipPlus`) provenientes de `src/lib/supabase.ts` (`/api/stats/batting` y `/api/stats/pitching`), usando `computeWoba`, `computeWrcPlus` y `computeFip` de `src/lib/matchup-engine.ts` únicamente como fallback cuando falte el dato precalculado.
- **Reutilización del patrón CORS-safe probado en Canvas:** Adoptar exactamente el flujo de carga de retratos en 3 niveles de `src/lib/pitch-card-canvas.ts` (`hasLocalPlayerPhoto` → URL primaria → `getMlbFallbackHeadshotUrl`) para que `canvas.toBlob()` funcione en producción sin `SecurityError` ni dependencia de proxies externos.
- **Constructores puros sin acoplamiento al DOM:** Separar la construcción y evaluación de ganadores (`buildBatterMatchupCardData` y `buildPitcherMatchupCardData` en `src/lib/matchup-engine.ts`) del renderizador Canvas (`src/lib/matchup-card-canvas.ts`), permitiendo validar las 18 filas de bateadores y 17 de lanzadores de forma determinística en Node/TSX.
- **Caché de pools por temporada y fase en cliente:** Mantener un `Map` en `useRef` dentro de `MatchupView` precargado con los props iniciales del servidor (`${compareType}-${season}-R`) y completar bajo demanda las combinaciones de temporada/fase distintas vía `AbortController`.

---

## 2. Arquitectura y Flujo de Datos

```text
[/matchup Server Props (season, R)] + [/api/stats/batting | /api/stats/pitching?season=...&phase=...&limit=500]
   │ Caché en cliente: Map<"${compareType}-${season}-${phase}", BattingStats[] | PitchingStats[]>
   ▼
[MatchupView (src/components/matchup/matchup-view.tsx)]
   ├─ Selectores independientes: (season1, phase1, team1) vs (season2, phase2, team2)
   ├─ compareBatters / comparePitchers (usa pool1 y pool2 reales + Stats+ oficiales)
   └─ useMemo ─► buildBatterMatchupCardData / buildPitcherMatchupCardData (src/lib/matchup-engine.ts)
                     │ MatchupCardData (18 filas Bateadores | 17 filas Lanzadores)
                     ▼
               [MatchupCardModal (src/components/matchup/matchup-card-modal.tsx)]
                     ├─ renderMatchupCardToCanvas (src/lib/matchup-card-canvas.ts, 1080px @ 2x)
                     └─ generateMatchupCardBlob ─► Descargar PNG / Copiar Imagen
```

---

## 3. Archivos Afectados por Módulo

### Track A — Spec-Kit (`spec-writer`)
- `specs/036-matchup-h2h-stathead-card-png/spec.md` **[NEW]**
- `specs/036-matchup-h2h-stathead-card-png/plan.md` **[NEW]**
- `specs/036-matchup-h2h-stathead-card-png/tasks.md` **[NEW]**

### Track B — Módulo 1: Modelo de Datos, Motor H2H y Tests (`matchup-data`)
- `src/types/matchup.ts`: `MatchupCardWinner`, `MatchupCardRow`, `MatchupCardSection`, `MatchupCardPlayerMeta`, `MatchupCardData`.
- `src/lib/matchup-engine.ts`: prioridad a `woba`/`wrcPlus`/`fip` oficiales en `compareBatters`/`comparePitchers`, limpieza de comentarios heredados, `buildBatterMatchupCardData`, `buildPitcherMatchupCardData` y `compareWinLoss`.
- `src/lib/__tests__/matchup-card.test.ts` **[NEW]**: pruebas unitarias determinísticas para las 18 filas de bateadores, 17 de lanzadores, direcciones de ganador, `G-P`, manejo de `0 AP`/`0 IP` y prioridad de `Stats+`.

### Track C — Módulo 2: Motor Gráfico Canvas PNG (`matchup-canvas`)
- `src/lib/matchup-card-canvas.ts` **[NEW]**: `MATCHUP_CARD_WIDTH`, `computeMatchupCardHeight`, `renderMatchupCardToCanvas`, `generateMatchupCardBlob`, carga CORS-safe en 3 niveles y diseño Claro Editorial `2x`.

### Track D — Módulo 3: UI `/matchup` y Modal PNG (`matchup-ui`)
- `src/components/matchup/matchup-card-modal.tsx` **[NEW]**: modal accesible con vista previa Canvas en vivo, botones `Descargar PNG` y `Copiar Imagen`, y estado ligado a `renderKey`.
- `src/components/matchup/matchup-view.tsx`: selectores independientes de temporada (`2026-27`, `2025-26`) y fase (`R`, `D`, `L`, `F`, `all`), caché cliente por clave `${compareType}-${s}-${ph}`, botón **"Tarjeta PNG"**, integración de `MatchupCardModal`, iconos Lucide en lugar de emojis y limpieza de copy.

### Track E — Verificación Integral (`verifier` + `coordinator`)
- Ejecución de `matchup-card.test.ts` y suites previas, `npx eslint` sobre los archivos modificados/nuevos, `npx tsc --noEmit`, auditoría de lenguaje deportivo LVBP, `npm run build` y redacción de `specs/036-matchup-h2h-stathead-card-png/implementation.md`.

---

## 4. Plan de Rollback

1. Los archivos nuevos (`matchup-card-canvas.ts`, `matchup-card-modal.tsx`, `matchup-card.test.ts`) y los tipos añadidos a `src/types/matchup.ts` son completamente aditivos; no alteran endpoints API ni esquemas de Supabase.
2. Para revertir, basta restaurar `src/lib/matchup-engine.ts`, `src/types/matchup.ts` y `src/components/matchup/matchup-view.tsx` y eliminar los tres archivos nuevos.
