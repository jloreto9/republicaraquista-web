# Bug Assessment: Spray Chart Artificial Pattern / Linear Ray Dispersion

- **Slug**: spray-chart-artificial-pattern
- **Date**: 2026-09-24
- **Severity**: High (Data Quality / Visual Authenticity)
- **Status**: verified

## 1. Symptom & Observation
In the `/spray-charts` view, batted balls on the baseball diamond field SVG form artificial, visible radial spokes / diagonal rays instead of an organic, scatter dispersion. Every player's spray chart displays the exact same linear pattern (verified in user screenshot `media_1790282501413.png`).

## 2. Root Cause Analysis
In `src/lib/spray-engine.ts`, `getPlayerBattedBalls(playerId)` and `getPlayerStrikeZoneData(playerId)` used synthetic generation loops with modular arithmetic:
```ts
distFt = 70 + ((i * 9) % 65);
angleDeg = batSide === "R" ? -40 + ((i * 6) % 35) : 5 + ((i * 6) % 35);
```
Because `(i * 6) % 35` and `(i * 7) % 80` only yield a few discrete angle values, all dots collapsed into identical radial rays. Furthermore, only 6 hardcoded players were configured, sharing the exact same generation loop.

## 3. Proposed Remediation
1. Extract and persist all 1,538 real batted balls and pitch telemetry events from the 56 official games of the 2025 LVBP season into `src/data/lvbp_spray_2025.json`.
2. Update `src/lib/spray-engine.ts`:
   - `getPlayerBattedBalls(playerId)` returns the real MLB Gameday coordinates (`xFt`, `yFt`, `distanceFt`, `sprayAngle`, `trajectory`, `hardness`).
   - Support `playerId = 0` ("🌟 Toda la Ofensiva de Leones") and all individual batters.
   - `getPlayerStrikeZoneData(playerId)` evaluates real pitch telemetry for strike zone 3x3 and plate discipline metrics.
   - `LEONES_SPRAY_PLAYERS` provides all 24 real Leones batters with their real batted ball counts.
3. Update `src/components/spray/spray-view.tsx` and `src/app/spray-charts/page.tsx` to pass and display the full player list.

## 4. Files Likely to Change
- `src/lib/spray-engine.ts`
- `src/app/api/spray/route.ts`
- `src/app/spray-charts/page.tsx`
- `src/components/spray/spray-view.tsx`
- `src/components/spray/baseball-diamond.tsx`

## 5. Verification Plan
- Run `node scripts/generate_spray_data.mjs` to guarantee real dataset integrity.
- Run `npx tsc --noEmit` to ensure type safety.
- Run `npm run build` to verify clean static page generation.
- Deploy to Vercel and verify `/spray-charts` and `/api/spray`.
