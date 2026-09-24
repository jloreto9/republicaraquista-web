# Bug Assessment: Pitching Season Data 404 & Missing Fallback

- **Slug**: pitching-season-data-error
- **Date**: 2026-09-24
- **Severity**: High (User Experience / Robustness)
- **Status**: verified

## 1. Symptom & Observation
When viewing Pitching Summary in "Temporada Completa" mode with default pitcher Albert Suárez (or any pitcher without appearances in the selected season), a red error banner is displayed:
`"No se pudieron calcular los datos de la temporada para este lanzador. Prueba seleccionando otra salida o cambiando de temporada."` (verified from screenshot `media_1790288923114.png`).

## 2. Root Cause Analysis
1. **HTTP 404 in API route**: In `src/app/api/pitching/season-data/route.ts`, when `logs.length === 0`, the endpoint returned `NextResponse.json({ error: "..." }, { status: 404 })`.
2. **Missing Season Fallback**: Unlike the reference Streamlit app (`RepubliCaraquistApp/pages/9_🔥_Pitching_Summary.py` lines 456-488), there was no automatic fallback to the pitcher's most recent active season when the requested season had 0 appearances. Albert Suárez pitched in LVBP in 2023 (11 games) and MLB in 2024 (32 games), but had 0 games in LVBP 2025.
3. **Default Pitcher Selection**: `CARACAS_FEATURED_PITCHERS[0]` was Albert Suárez, causing immediate empty season data when loading LVBP 2025, whereas Erick Leal (612797) was active with 10 starts in LVBP 2025.

## 3. Proposed Remediation
1. **Reorder Featured Pitchers**: Set Erick Leal (612797) as the primary featured pitcher in `src/lib/pitching-constants.ts` so the initial view in LVBP 2025 immediately renders 10 real game logs and season telemetry.
2. **Backend Season Fallback & 200 Graceful Response**:
   - In `src/app/api/pitching/game-logs/route.ts` and `src/app/api/pitching/season-data/route.ts`, if the requested season yields 0 appearances, evaluate candidate seasons `[2025, 2024, 2023, 2022]` to locate the most recent active season.
   - Never return HTTP 404 when logs are empty; return HTTP 200 with `gamesCount: 0` and empty boxscore metrics.
3. **Frontend Smart Season Sync & Informative Banner**:
   - In `src/components/pitching/pitching-view.tsx`, detect when a season fallback was applied and display the informative notice: `ℹ️ No se encontraron salidas registradas en la temporada {season} para esta rama. Mostrando la última temporada disponible ({effectiveSeason}).`
   - Synchronize the season state to the effective season.
   - Display a clean informative state instead of a red error box when no games exist.

## 4. Files Likely to Change
- `src/lib/pitching-constants.ts`
- `src/app/api/pitching/game-logs/route.ts`
- `src/app/api/pitching/season-data/route.ts`
- `src/components/pitching/pitching-view.tsx`
- `src/components/pitching/pitching-header.tsx`

## 5. Verification Plan
- Query `/api/pitching/season-data?pitcher_id=544150&season=2025&branch=lvbp` and verify it falls back to 2023 without 404 error.
- Query `/api/pitching/game-logs?pitcher_id=612797&season=2025&branch=lvbp` and verify 10 games returned for Erick Leal.
- Run `npx tsc --noEmit` and `npm run build`.
- Deploy to Vercel and verify online.
