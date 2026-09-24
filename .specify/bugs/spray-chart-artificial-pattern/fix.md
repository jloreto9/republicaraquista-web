# Bug Fix: Spray Chart Artificial Pattern / Linear Ray Dispersion

- **Slug**: spray-chart-artificial-pattern
- **Fixed**: 2026-09-24
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary
Replaced synthetic generation with real MLB Gameday telemetry coordinates (1,538 batted balls and authentic pitch coordinates) extracted from the 56 official games of the 2025 season. Eliminated the artificial radial rays / discrete angles pattern across all player spray charts and added support for "🌟 Toda la Ofensiva de Leones" plus all 24 individual batters.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `scripts/generate_spray_data.mjs` | added | ETL script to extract real hit coordinates and pitch telemetry from MLB Stats API live feeds |
| `src/data/lvbp_spray_2025.json` | added | 1,538 real batted balls and pitch telemetry dataset for season 2025 |
| `src/types/spray.ts` | modified | Added `SprayPlayerOption` interface and color maps (`EVENT_COLORS`, `TRAJECTORY_COLORS`, `HARDNESS_COLORS`) |
| `src/lib/spray-engine.ts` | modified | Replaced pseudo-random modular generator with real MLB Gameday dataset queries; exported real player list and real strike zone metrics |
| `src/app/api/spray/route.ts` | modified | Defaulted `player_id` to `0` ("🌟 Toda la Ofensiva de Leones") and returns real data |
| `src/app/spray-charts/page.tsx` | modified | Passes complete `players` list to `SprayView` |
| `src/components/spray/spray-view.tsx` | modified | Displays all 24 players with counts, responsive layout and state sync |
| `src/components/spray/baseball-diamond.tsx` | modified | Enhanced tooltip with batter name, real distances and BIS hardness |

## Diff Highlights

```ts
// src/lib/spray-engine.ts: Eliminación del generador sintético y consulta a datos reales
export function getPlayerBattedBalls(playerId: number): BattedBall[] {
  const allBalls = (sprayDataRaw.battedBalls || []) as BattedBall[];
  if (!playerId || playerId === 0) {
    return allBalls;
  }
  const filtered = allBalls.filter((b) => b.batterId === playerId);
  return filtered.length > 0 ? filtered : allBalls;
}
```

## Local Verification
- `node scripts/generate_spray_data.mjs` → 1,538 real batted balls, 24 players, extracted in 3.9s.
- `npx tsc --noEmit` → Exited 0 with no errors.
- `npm run build` → 20/20 routes statically generated and optimized.

## Deviations from Assessment
None. The preferred remediation of utilizing real MLB Gameday telemetry coordinates across all 56 season games was fully applied.

## Follow-ups
Verify production deployment on Vercel via `curl.exe`.
