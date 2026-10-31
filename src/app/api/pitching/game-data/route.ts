import { NextRequest, NextResponse } from "next/server";
import { PitchGameDataResponse, PitchingBranch } from "@/types/pitching";
import { fetchAndParseGameTelemetryCached } from "@/lib/pitch-parser";
import { getMlbFallbackHeadshotUrl } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gamePkParam = searchParams.get("game_pk");
  const pitcherIdParam = searchParams.get("pitcher_id");
  const isLvbpParam = searchParams.get("is_lvbp");
  const branchParam = searchParams.get("branch");

  const gamePk = Number(gamePkParam);
  const pitcherId = Number(pitcherIdParam);

  if (!gamePk || !pitcherId) {
    return NextResponse.json(
      { error: "game_pk y pitcher_id son requeridos" },
      { status: 400 }
    );
  }

  const branch: PitchingBranch =
    branchParam === "mlb" || isLvbpParam === "false" ? "mlb" : "lvbp";

  const parsed = await fetchAndParseGameTelemetryCached(gamePk, pitcherId, branch);

  if (!parsed) {
    return NextResponse.json(
      { error: `No se pudo obtener el feed oficial del juego ${gamePk}` },
      { status: 502 }
    );
  }

  const bx = parsed.boxExtract;
  const isStarter = bx?.isStarter ?? false;
  const decision = bx?.decision ?? "";
  const pitchesCount = bx?.pitches || parsed.totalPitches;
  const strikesCount = bx?.strikes || parsed.strikesCount;
  const strikePctStr =
    pitchesCount > 0 ? `${((strikesCount / pitchesCount) * 100).toFixed(1)}%` : "0.0%";

  const bf =
    bx?.bf ??
    parsed.situationalSplits
      .filter((s) => s.key === "vsLhb" || s.key === "vsRhb")
      .reduce((acc, s) => acc + s.bf, 0);
  const so = bx?.so ?? 0;
  const bb = bx?.bb ?? 0;
  const kPctNum = bf > 0 ? (so / bf) * 100 : 0;
  const bbPctNum = bf > 0 ? (bb / bf) * 100 : 0;

  const response: PitchGameDataResponse = {
    gamePk,
    pitcherId,
    timeMode: "game",
    isStarter,
    role: isStarter ? "Abridor" : "Relevista",
    decision,
    totalPitches: pitchesCount,
    hasStatcast: parsed.hasStatcast,
    mlbPhotoUrl: getMlbFallbackHeadshotUrl(pitcherId),
    boxscore: {
      ip: bx?.ip || "0.0",
      outs: bx?.outs ?? 0,
      bf,
      ab: bx?.ab ?? 0,
      h: bx?.h ?? 0,
      r: bx?.r ?? 0,
      er: bx?.er ?? 0,
      bb,
      ibb: bx?.ibb ?? 0,
      so,
      hr: bx?.hr ?? 0,
      hbp: bx?.hbp ?? 0,
      wp: bx?.wp ?? 0,
      pitches: pitchesCount,
      strikes: strikesCount,
      strikePct: strikePctStr,
      cswPct: parsed.cswPctStr,
      whiffPct: parsed.whiffPctStr,
      fStrikePct: parsed.pbpKpis.fpsPct,
      swStrPct: parsed.pbpKpis.swStrPct,
      putAwayPct: parsed.pbpKpis.putAwayPct,
      kPct: bf > 0 ? `${kPctNum.toFixed(1)}%` : "0.0%",
      bbPct: bf > 0 ? `${bbPctNum.toFixed(1)}%` : "0.0%",
      kMinusBbPct: bf > 0 ? `${(kPctNum - bbPctNum).toFixed(1)}%` : "0.0%",
      go: bx?.go ?? 0,
      ao: bx?.ao ?? 0,
      ir: bx?.ir ?? 0,
      irs: bx?.irs ?? 0,
      gsv2: bx?.gsv2 ?? null,
      isQS: bx?.isQS ?? false,
    },
    contextMetrics: parsed.contextMetrics,
    contactProfile: parsed.contactProfile,
    situationalSplits: parsed.situationalSplits,
    ttoSplits: parsed.ttoSplits,
    statcastTable: parsed.statcastTable,
    pbpTable: parsed.pbpTable,
    pbpKpis: parsed.pbpKpis,
    inningsWorkload: parsed.inningsWorkload,
    splitsPlatoon: parsed.splitsPlatoon,
    pitches: parsed.pitches,
  };

  return NextResponse.json(response);
}
