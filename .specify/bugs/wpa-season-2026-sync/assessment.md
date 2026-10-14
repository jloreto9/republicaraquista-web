# Bug Assessment: wpa-season-2026-sync

## 1. Bug Summary
- **User Request:** "Ahora la pestana de WPA sigue mostrando la temporads 2025. Eso debe estar conectado con todo, cuando cambie en uno deberia cambiar en todo y deberia mostrar la temporada 2026"
- **Symptom:** 
  1. The `/wpa` tab continues to display only 2025 games (`LEONES_ALL_GAMES` 56 games from 2025) and shows the header `Líderes de Probabilidad de Victoria (WPA & Clutch) — Temporada 2025-26`, despite the active season being `2026`.
  2. The initial loaded game is hardcoded to `829871` (a December 2025 game).
  3. The season state is fragmented across tabs: changing the season in one view (e.g. Bullpen or Individuales) does not synchronize or propagate to other tabs, nor is there a global season control in the Header.

## 2. Root Cause Analysis
1. **`src/lib/wpa-engine.ts` Hardcoding:**
   - `LEONES_ALL_GAMES` contains 56 games hardcoded from season 2025.
   - `getLeonesGamesList(season)` ignored the `season` argument and unconditionally returned `LEONES_ALL_GAMES`.
   - `getSeasonWpaLeaders()` returned a static list of 2025 leaders without season support.
2. **`src/app/wpa/page.tsx` & `/api/wpa` Mismatch:**
   - `WpaPage` requested `activeSeason` (2026), but fed `LEONES_ALL_GAMES[0].id` (game 829871 from 2025) to `processGameWpa`.
   - `/api/wpa/route.ts` returned `LEONES_ALL_GAMES` on `leaders=true` ignoring the requested season.
3. **Lack of Global Season Synchronization:**
   - There was no top-level React context (`SeasonContext`) in `src/app/layout.tsx`.
   - Each view (`IndividualesView`, `PitchingView`, `BullpenView`) managed its own local isolated `useState(season)`.
   - The global `Header` displayed a static string pill (`Temporada 2026 (2026-27)`) without interactive season controls.

## 3. Severity & Impact
- **Severity:** High (Functional & DX inconsistency).
- **Impact:** Users navigating between tabs experience disconnected season states, and the WPA tab is effectively locked in the past season (2025) while other tabs display 2026.

## 4. Remediation Plan
1. **Global Season Architecture (`SeasonContext`):**
   - Create `src/context/season-context.tsx` with `SeasonProvider` and `useSeason()` hook.
   - Default season: `2026`. Supported seasons: `[2026, 2025]`.
   - Persist selection in `localStorage` (`rc_season`) and cookies (`rc_season`) for cross-tab and server-rendering consistency.
   - Wrap application tree in `src/app/layout.tsx` with `<SeasonProvider>`.
2. **Interactive Global Header:**
   - Upgrade `src/components/layout/header.tsx` to include an interactive season selector dropdown bound to `useSeason()`.
   - When the user selects a season in the Header (or any tab), it triggers state updates across all listening views.
3. **WPA Engine & API Modernization (`wpa-engine.ts`, `api/wpa/route.ts`):**
   - Add season 2026 games list (Game 870090: 13 Oct 2026 vs Águilas del Zulia).
   - Support `LEONES_GAMES_BY_SEASON[season]` for `2026` and `2025`.
   - Parameterize `getLeonesGamesList(season)` and `getSeasonWpaLeaders(season)`.
   - Update `WpaPage` and `WpaView` to consume `useSeason()`, defaulting to 2026, dynamically loading the corresponding season's games and leaders.
4. **Synchronize Other Views:**
   - Ensure `BullpenView`, `IndividualesView`, and `PitchingView` reflect and sync changes with `useSeason()`.
5. **Validation:**
   - `npx tsc --noEmit` and `npm run build`.
   - Verify that switching season in Header updates `/wpa`, `/bullpen`, and other tabs immediately.
