import assert from "node:assert/strict";
import {
  computeGSv2,
  computeFIP,
  computeERAMinus,
  computeLOBPct,
  computeBABIP,
  getMetricCellShade,
} from "../pitching-constants";
import {
  parsePitcherFromLiveFeed,
  aggregatePitcherTelemetries,
} from "../pitch-parser";
import { CANVAS_W, CANVAS_H } from "../pitch-card-canvas";

function approxEqual(actual: number | null | undefined, expected: number, eps = 0.02, msg = "") {
  assert.notEqual(actual, null, `Expected number near ${expected}, got null. ${msg}`);
  assert.notEqual(actual, undefined, `Expected number near ${expected}, got undefined. ${msg}`);
  assert.ok(
    Math.abs((actual as number) - expected) <= eps,
    `Expected ${actual} to be within ${eps} of ${expected}. ${msg}`
  );
}

function buildSyntheticLiveFeed() {
  // Home pitcher ID = 612797 pitching Top 1st and Top 2nd
  return {
    gameData: {
      status: { abstractGameState: "Final" },
    },
    liveData: {
      plays: {
        allPlays: [
          // Play 1 (Top 1st, 0 outs, bases empty): LHB batter 101 hits a Double -> postOnSecond = 101 (NOT RISP pre-play!)
          {
            about: { inning: 1, isTopInning: true, isComplete: true },
            count: { balls: 1, strikes: 1, outs: 0 },
            result: { event: "Double", eventType: "double", homeScore: 0, awayScore: 0 },
            matchup: {
              pitcher: { id: 612797 },
              batter: { id: 101 },
              batSide: { code: "L" },
              postOnSecond: { id: 101 },
            },
            playEvents: [
              {
                isPitch: true,
                count: { balls: 0, strikes: 0, outs: 0 },
                details: { description: "Called Strike", isStrike: true, type: { code: "FF", description: "4-Seam Fastball" } },
                pitchData: { startSpeed: 93.2, spinRate: 2250, extension: 6.4, strikeZoneTop: 3.4, strikeZoneBottom: 1.6, coordinates: { pfxZ: 1.3, pfxX: -0.6, pX: 0.2, pZ: 2.5 } },
              },
              {
                isPitch: true,
                count: { balls: 0, strikes: 1, outs: 0 },
                details: { description: "In play, run(s)", isInPlay: true, isStrike: true, type: { code: "SL", description: "Slider" } },
                pitchData: { startSpeed: 84.5, spinRate: 2450, extension: 6.3, strikeZoneTop: 3.4, strikeZoneBottom: 1.6, coordinates: { pfxZ: 0.2, pfxX: 0.4, pX: 0.1, pZ: 2.2 } },
                hitData: { trajectory: "line_drive", hardness: "hard", launchSpeed: 101.2, launchAngle: 18, coordinates: { coordX: 60, coordY: 95 } },
              },
            ],
          },
          // Play 2 (Top 1st, 0 outs, runner on 2B -> RISP pre-play!): RHB batter 102 strikes out swinging on 3 pitches (0-2 pitch is K -> PutAway!)
          {
            about: { inning: 1, isTopInning: true, isComplete: true },
            count: { balls: 0, strikes: 3, outs: 1 },
            result: { event: "Strikeout", eventType: "strikeout", homeScore: 0, awayScore: 0 },
            matchup: {
              pitcher: { id: 612797 },
              batter: { id: 102 },
              batSide: { code: "R" },
              postOnSecond: { id: 101 },
            },
            playEvents: [
              {
                isPitch: true,
                count: { balls: 0, strikes: 0, outs: 0 },
                details: { description: "Called Strike", isStrike: true, type: { code: "FF", description: "4-Seam Fastball" } },
                pitchData: { startSpeed: 94.0, spinRate: 2300, extension: 6.5, strikeZoneTop: 3.4, strikeZoneBottom: 1.6, coordinates: { pfxZ: 1.4, pfxX: -0.5, pX: -0.2, pZ: 2.6 } },
              },
              {
                isPitch: true,
                count: { balls: 0, strikes: 1, outs: 0 },
                details: { description: "Swinging Strike", isStrike: true, type: { code: "SL", description: "Slider" } },
                pitchData: { startSpeed: 85.0, spinRate: 2500, extension: 6.3, strikeZoneTop: 3.4, strikeZoneBottom: 1.6, coordinates: { pfxZ: 0.1, pfxX: 0.5, pX: 1.1, pZ: 1.2 } }, // Chase outside zone!
              },
              {
                isPitch: true,
                count: { balls: 0, strikes: 2, outs: 0 },
                details: { description: "Swinging Strike", isStrike: true, type: { code: "FF", description: "4-Seam Fastball" } },
                pitchData: { startSpeed: 95.1, spinRate: 2340, extension: 6.6, strikeZoneTop: 3.4, strikeZoneBottom: 1.6, coordinates: { pfxZ: 1.5, pfxX: -0.6, pX: 0.0, pZ: 3.1 } },
              },
            ],
          },
          // Play 3 (Top 1st, 1 out, runner still on 2B -> RISP pre-play!): batter 101 faces pitcher a 2nd time (simulated 2nd TTO) and grounds out weakly
          {
            about: { inning: 1, isTopInning: true, isComplete: true },
            count: { balls: 1, strikes: 0, outs: 3 },
            result: { event: "Double Play", eventType: "grounded_into_double_play", homeScore: 0, awayScore: 0 },
            matchup: {
              pitcher: { id: 612797 },
              batter: { id: 101 },
              batSide: { code: "L" },
            },
            playEvents: [
              {
                isPitch: true,
                count: { balls: 0, strikes: 0, outs: 1 },
                details: { description: "Ball", isBall: true, type: { code: "CH", description: "Changeup" } },
                pitchData: { startSpeed: 86.0, spinRate: 1750, extension: 6.4, strikeZoneTop: 3.4, strikeZoneBottom: 1.6, coordinates: { pfxZ: 0.5, pfxX: -1.1, pX: -1.2, pZ: 1.1 } },
              },
              {
                isPitch: true,
                count: { balls: 1, strikes: 0, outs: 1 },
                details: { description: "In play, out(s)", isInPlay: true, isStrike: true, type: { code: "CH", description: "Changeup" } },
                pitchData: { startSpeed: 86.2, spinRate: 1760, extension: 6.4, strikeZoneTop: 3.4, strikeZoneBottom: 1.6, coordinates: { pfxZ: 0.4, pfxX: -1.0, pX: -0.1, pZ: 1.9 } },
                hitData: { trajectory: "ground_ball", hardness: "soft", launchSpeed: 74.0, launchAngle: -12, coordinates: { coordX: 118, coordY: 185 } },
              },
            ],
          },
        ],
      },
    },
  };
}

async function runTests() {
  // 1. Tangotiger Game Score v2
  assert.equal(computeGSv2({ outs: 18, so: 7, bb: 1, h: 4, er: 1, hr: 0 }), 70);
  assert.equal(computeGSv2({ outs: 4, so: 1, bb: 3, h: 6, er: 5, hr: 2 }), 4);

  // 2. FIP & zero-outs safety
  approxEqual(computeFIP({ hr: 1, bb: 2, hbp: 0, so: 9, outs: 27 }, 3.45), 3.56, 0.02);
  assert.equal(computeFIP({ hr: 1, bb: 1, hbp: 0, so: 0, outs: 0 }, 3.45), null);

  // 3. ERA- & zero-outs / zero-lgERA safety
  assert.equal(computeERAMinus(2.425, 4.85), 50);
  assert.equal(computeERAMinus(null, 4.85), null);
  assert.equal(computeERAMinus(3.5, 0), null);

  // 4. LOB% clamping and zero-baserunner safety
  approxEqual(computeLOBPct({ h: 10, bb: 4, hbp: 1, r: 3, hr: 1 }), 88.24, 0.05);
  assert.equal(computeLOBPct({ h: 0, bb: 0, hbp: 0, r: 0, hr: 0 }), null);
  assert.equal(computeLOBPct({ h: 1, bb: 0, hbp: 0, r: 1, hr: 1 }), null);

  // 5. BABIP safety
  approxEqual(computeBABIP({ h: 10, hr: 2, ab: 35, so: 8, sf: 1 }), 8 / 26, 0.005);
  assert.equal(computeBABIP({ h: 1, hr: 1, ab: 1, so: 0, sf: 0 }), null);

  // 6. Semantic Cell Shading
  assert.equal(getMetricCellShade("cswPct", 32.5).tier, "elite");
  assert.equal(getMetricCellShade("cswPct", 27.0).tier, "neutral");
  assert.equal(getMetricCellShade("cswPct", 20.0).tier, "poor");
  assert.equal(getMetricCellShade("fip", 3.10).tier, "elite");
  assert.equal(getMetricCellShade("fip", 5.20).tier, "poor");
  assert.equal(getMetricCellShade("wpa", 0.12).tier, "elite");
  assert.equal(getMetricCellShade("wpa", -0.10).tier, "poor");
  assert.equal(getMetricCellShade("cswPct", null).tier, "neutral");

  // 7. Task 2: Pre-play State Machine, RISP, TTO, PutAway%, BIS vs Statcast separation
  const feed = buildSyntheticLiveFeed();
  const lvbpParsed = parsePitcherFromLiveFeed(feed, 612797, "lvbp");

  assert.equal(lvbpParsed.pitches.length, 7, "7 total pitches parsed");
  // Play 1 was bases empty pre-play; Play 2 and Play 3 had runner on 2B pre-play -> RISP BF === 2!
  const rispSplit = lvbpParsed.situationalSplits.find((s) => s.key === "risp");
  const emptySplit = lvbpParsed.situationalSplits.find((s) => s.key === "basesEmpty");
  assert.ok(rispSplit, "RISP split exists");
  assert.equal(rispSplit!.bf, 2, "Pre-play RISP BF must be 2 (Play 2 & Play 3, NOT Play 1)");
  assert.equal(rispSplit!.h, 0, "0 hits allowed with RISP");
  assert.equal(emptySplit!.bf, 1, "Bases empty BF must be 1 (Play 1)");
  assert.equal(emptySplit!.h, 1, "1 hit allowed with bases empty");

  // TTO: Batter 101 had 1st PA in Play 1 and 2nd PA in Play 3; Batter 102 had 1st PA in Play 2 -> 1st TTO = 2 BF, 2nd TTO = 1 BF
  const tto1 = lvbpParsed.ttoSplits.find((s) => s.key === "tto1");
  const tto2 = lvbpParsed.ttoSplits.find((s) => s.key === "tto2");
  assert.equal(tto1!.bf, 2, "1st TTO BF === 2");
  assert.equal(tto2!.bf, 1, "2nd TTO BF === 1");

  // PutAway%: 1 pitch thrown with 2 strikes (Play 2, pitch 3) -> resulted in Strikeout -> 100.0%
  assert.equal(lvbpParsed.pbpKpis.putAwayPct, "100.0%", "PutAway% = 1 K / 1 two-strike pitch");
  // F-Strike%: Play 1 (Strike), Play 2 (Strike), Play 3 (Ball) -> 2/3 = 66.7%
  assert.equal(lvbpParsed.pbpKpis.fpsPct, "66.7%", "F-Strike% = 2/3");

  // Scoreless inning (0.461 expected runs at start of Top 1st, 0 runs scored, 3 outs at end) -> net RE24 = +0.461!
  approxEqual(lvbpParsed.contextMetrics.re24, 0.461, 0.01, "Scoreless inning saves +0.461 RE24 runs");
  assert.ok(lvbpParsed.contextMetrics.wpa > 0, "Scoreless Top 1st yields positive pitcher WPA");

  // Strict sensor separation: LVBP branch MUST NOT expose optical EV/HardHit%/Barrel%
  assert.equal(lvbpParsed.hasStatcast, false, "LVBP branch forces hasStatcast=false");
  assert.equal(lvbpParsed.contactProfile.avgEv, null, "LVBP branch strips optical avgEv");
  assert.equal(lvbpParsed.contactProfile.bip, 2, "2 balls in play (1 LD hard, 1 GB soft)");
  assert.equal(lvbpParsed.contactProfile.ld, 1);
  assert.equal(lvbpParsed.contactProfile.gb, 1);

  // MLB branch DOES expose Hawk-Eye optical metrics (EV, HardHit%, Extension, Chase%, Z-Contact%)
  const mlbParsed = parsePitcherFromLiveFeed(feed, 612797, "mlb");
  assert.equal(mlbParsed.hasStatcast, true, "MLB branch detects Hawk-Eye coordinates");
  approxEqual(mlbParsed.contactProfile.avgEv, (101.2 + 74.0) / 2, 0.1, "MLB avgEV computed");
  assert.equal(mlbParsed.contactProfile.hardHitPct, 50, "1 of 2 BIP >= 95 mph");
  assert.equal(mlbParsed.pbpKpis.chasePct, "50.0%", "1 chase on 2 out-of-zone pitches");

  // Aggregation across multiple outings
  const agg = aggregatePitcherTelemetries([
    { telemetry: lvbpParsed, isHome: true },
    { telemetry: lvbpParsed, isHome: false },
  ], "lvbp");
  approxEqual(agg.contextMetrics.re24, 0.922, 0.02, "Season aggregated RE24 sums across games");
  const homeSplit = agg.situationalSplits.find((s) => s.key === "home");
  const awaySplit = agg.situationalSplits.find((s) => s.key === "away");
  assert.equal(homeSplit!.bf, 3, "Home split aggregates home outings");
  assert.equal(awaySplit!.bf, 3, "Away split aggregates away outings");

  // 8. Canvas 3:4 Portrait Dimensions (300 DPI)
  assert.equal(CANVAS_W, 2400, "Canvas width must be 2400px");
  assert.equal(CANVAS_H, 3200, "Canvas height must be 3200px (3:4 portrait)");

  console.log("✅ All Pitching Summary 3:4 telemetry, math, state-machine & sensor separation tests passed!");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
