import assert from "node:assert/strict";
import { buildGameScorecard } from "../scorecard-engine";
import { GameCenterTeam } from "@/types/game-center";

const homeTeam: GameCenterTeam = {
  id: 695,
  name: "Leones del Caracas",
  abbreviation: "CAR",
  logoUrl: "/logos/car.png",
  isLeones: true,
  score: 4,
  hits: 6,
  errors: 0,
  lob: 3,
};

const awayTeam: GameCenterTeam = {
  id: 699,
  name: "Tigres de Aragua",
  abbreviation: "TIG",
  logoUrl: "/logos/tig.png",
  isLeones: false,
  score: 1,
  hits: 3,
  errors: 0,
  lob: 2,
};

const boxscore = {
  teams: {
    away: {
      batters: [594021, 661411],
      players: {
        ID594021: {
          person: { id: 594021, fullName: "Alberth Martinez" },
          position: { abbreviation: "LF" },
          battingOrder: "100",
          stats: { batting: { atBats: 0, hits: 0, runs: 0 } },
        },
        ID661411: {
          person: { id: 661411, fullName: "Lorenzo Cedrola" },
          position: { abbreviation: "CF" },
          battingOrder: "200",
          stats: { batting: { atBats: 1, hits: 0, runs: 0 } },
        },
      },
    },
    home: {
      batters: [686404, 640902, 685744],
      players: {
        ID686404: {
          person: { id: 686404, fullName: "Wuilfredo Antunez" },
          position: { abbreviation: "LF" },
          battingOrder: "100",
          stats: { batting: { atBats: 1, hits: 1, runs: 1 } },
        },
        ID640902: {
          person: { id: 640902, fullName: "Jhonny Pereda" },
          position: { abbreviation: "C" },
          battingOrder: "800",
          stats: { batting: { atBats: 1, hits: 0, runs: 0 } },
        },
        ID685744: {
          person: { id: 685744, fullName: "Kenedy Corona" },
          position: { abbreviation: "CF" },
          battingOrder: "900",
          stats: { batting: { atBats: 1, hits: 1, runs: 0 } },
        },
      },
    },
  },
};

const allRawPlays = [
  // Alta del 2do: Martínez HBP, luego Cedrola Forceout (Martínez out en 2B como out #3, Cedrola quieto en 1B)
  {
    atBatIndex: 13,
    about: { inning: 2, isTopInning: true },
    result: { event: "Hit By Pitch", isOut: false, rbi: 0, description: "Alberth Martinez hit by pitch." },
    count: { balls: 1, strikes: 1, outs: 2 },
    matchup: { batter: { id: 594021, fullName: "Alberth Martinez" } },
    runners: [{ details: { runner: { id: 594021 }, event: "Hit By Pitch" }, movement: { start: null, end: "1B", isOut: false } }],
  },
  {
    atBatIndex: 16,
    about: { inning: 2, isTopInning: true },
    result: { event: "Forceout", isOut: true, rbi: 0, description: "Lorenzo Cedrola grounds into a force out." },
    count: { balls: 0, strikes: 1, outs: 3 },
    matchup: { batter: { id: 661411, fullName: "Lorenzo Cedrola" } },
    runners: [
      { details: { runner: { id: 594021 }, event: "Forceout" }, movement: { start: "1B", end: null, isOut: true, outBase: "2B", outNumber: 3 } },
      { details: { runner: { id: 661411 }, event: "Forceout" }, movement: { start: null, end: "1B", isOut: false } },
    ],
  },
  // Baja del 2do: Pereda F9 (Out #1), Corona 1B, Antúnez 1B mientras Corona es CS 2B (Out #2)
  {
    atBatIndex: 17,
    about: { inning: 2, isTopInning: false },
    result: { event: "Flyout", isOut: true, rbi: 0, description: "Jhonny Pereda flies out to right field." },
    count: { balls: 2, strikes: 2, outs: 1 },
    matchup: {
      batter: { id: 640902, fullName: "Jhonny Pereda" },
      pitcher: { id: 683681, fullName: "Jose Gonzalez" },
    },
    runners: [{ details: { runner: { id: 640902 }, event: "Flyout" }, movement: { start: null, end: null, isOut: true, outBase: "1B", outNumber: 1 } }],
  },
  {
    atBatIndex: 18,
    about: { inning: 2, isTopInning: false },
    result: { event: "Single", isOut: false, rbi: 0, description: "Kenedy Corona singles." },
    count: { balls: 2, strikes: 2, outs: 1 },
    matchup: {
      batter: { id: 685744, fullName: "Kenedy Corona" },
      pitcher: { id: 683681, fullName: "Jose Gonzalez" },
    },
    runners: [{ details: { runner: { id: 685744 }, event: "Single" }, movement: { start: null, end: "1B", isOut: false } }],
  },
  {
    atBatIndex: 19,
    about: { inning: 2, isTopInning: false },
    result: { event: "Single", isOut: false, rbi: 0, description: "Wuilfredo Antunez singles. Kenedy Corona caught stealing 2nd base." },
    count: { balls: 0, strikes: 1, outs: 2 },
    matchup: {
      batter: { id: 686404, fullName: "Wuilfredo Antunez" },
      pitcher: { id: 683681, fullName: "Jose Gonzalez" },
    },
    runners: [
      { details: { runner: { id: 685744 }, event: "Caught Stealing 2B" }, movement: { start: "1B", end: null, isOut: true, outBase: "2B", outNumber: 2 } },
      { details: { runner: { id: 686404 }, event: "Single" }, movement: { start: null, end: "1B", isOut: false } },
    ],
  },
  // Baja del 4to: cambio de lanzador Jose Guedez reemplaza a Jose Gonzalez ante Corona
  {
    atBatIndex: 37,
    about: { inning: 4, isTopInning: false },
    result: { event: "Walk", isOut: false, rbi: 0, description: "Kenedy Corona walks." },
    count: { balls: 3, strikes: 1, outs: 0 },
    matchup: {
      batter: { id: 685744, fullName: "Kenedy Corona" },
      pitcher: { id: 803247, fullName: "Jose Guedez" },
    },
    runners: [{ details: { runner: { id: 685744 }, event: "Walk" }, movement: { start: null, end: "1B", isOut: false } }],
  },
];

const sc = buildGameScorecard(allRawPlays, boxscore, homeTeam, awayTeam, 9);

const coronaCell = sc.home.batters.find((b) => b.id === 685744)?.innings[2]?.[0];
assert.ok(coronaCell, "Debe existir la celda de Kenedy Corona en el 2do inning");
assert.equal(coronaCell.eventCode, "1B");
assert.equal(coronaCell.diamond.reach1B, true);
assert.equal(coronaCell.diamond.outAt, "2B");
assert.equal(coronaCell.outNumber, 2, "Kenedy Corona debe mostrar el Out #2 tras ser sorprendido en 2B");
assert.equal(coronaCell.outEvent, "CS 2B");
assert.equal(coronaCell.isPitchingChange, undefined, "El abridor no debe marcar cambio de lanzador");

const coronaInn4 = sc.home.batters.find((b) => b.id === 685744)?.innings[4]?.[0];
assert.ok(coronaInn4, "Debe existir la celda de Kenedy Corona en el 4to inning");
assert.equal(coronaInn4.isPitchingChange, true, "Debe marcar cambio de lanzador al entrar Jose Guedez");
assert.equal(coronaInn4.pitchingChangeFrom, "Jose Gonzalez");
assert.equal(coronaInn4.pitchingChangeTo, "Jose Guedez");
assert.equal(sc.home.pitchersUsed?.length, 2);
assert.equal(sc.home.pitchersUsed?.[0].isStarter, true);
assert.equal(sc.home.pitchersUsed?.[1].isStarter, false);
assert.equal(sc.home.pitchersUsed?.[1].inning, 4);

const martinezCell = sc.away.batters.find((b) => b.id === 594021)?.innings[2]?.[0];
const cedrolaCell = sc.away.batters.find((b) => b.id === 661411)?.innings[2]?.[0];
assert.ok(martinezCell && cedrolaCell);
assert.equal(martinezCell.outNumber, 3, "Alberth Martinez debe recibir el Out #3 por Forceout en 2B");
assert.equal(martinezCell.diamond.outAt, "2B");
assert.equal(martinezCell.outEvent, "FO 2B");
assert.equal(cedrolaCell.outNumber, null, "Lorenzo Cedrola llegó a 1B en Forceout, no debe tener outNumber");

console.log("scorecard-base-outs.test.ts: PASS");
