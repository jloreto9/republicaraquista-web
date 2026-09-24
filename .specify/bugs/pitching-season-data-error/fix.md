# Bug Fix: Pitching Season Data 404 & Missing Fallback

- **Slug**: pitching-season-data-error
- **Fixed**: 2026-09-24T18:33:00-04:00
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Implemented intelligent season fallback and graceful empty states in both `/api/pitching/game-logs` and `/api/pitching/season-data`, matching the exact behavior of Streamlit `RepubliCaraquistApp/pages/9_🔥_Pitching_Summary.py`. Additionally reordered `CARACAS_FEATURED_PITCHERS` to place Erick Leal (612797, 10 starts in LVBP 2025) as the primary featured pitcher, preventing empty initial loads and eliminating the red 404 error banner.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/lib/pitching-constants.ts` | modified | Placed Erick Leal (612797) as primary featured pitcher for Caracas in LVBP 2025 |
| `src/app/api/pitching/game-logs/route.ts` | modified | Added `fetchLogsForSeason`, smart candidate season fallback (`[2025, 2024, 2023, 2022]`), and returned `effectiveSeason`, `fallbackUsed`, and `fallbackMessage` |
| `src/app/api/pitching/season-data/route.ts` | modified | Added season fallback, replaced 404 error with HTTP 200 graceful response when `gamesCount: 0`, and included `effectiveSeason` |
| `src/components/pitching/pitching-view.tsx` | modified | Added `fallbackNotice` notification banner (Streamlit style), synchronized season state on fallback, and handled zero-game states cleanly |

## Tests Added or Updated

- Typecheck: `npx tsc --noEmit` passed with 0 errors.
- Build verification: `npm run build` completed with all 25 static & dynamic routes generated.

## Local Verification

- Commands run: `npx tsc --noEmit` → Success (code 0)
- Commands run: `npm run build` → Success (code 0)
- Manual checks: Verified Albert Suárez LVBP fallback to 2023 and Erick Leal 2025 logs.

## Deviations from Assessment

None. The fix strictly aligns with the assessment and Streamlit reference parity.

## Follow-ups

- Deploy to Vercel and verify live interaction on `republicaraquistapp.vercel.app/pitching`.
