import { NextRequest, NextResponse } from "next/server";
import { PitcherGameLog } from "@/types/pitching";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

function parseDecision(stat: any): "W" | "L" | "SV" | "HLD" | "" {
  if (!stat) return "";
  if (Number(stat.wins || 0) > 0) return "W";
  if (Number(stat.losses || 0) > 0) return "L";
  if (Number(stat.saves || 0) > 0) return "SV";
  if (Number(stat.holds || 0) > 0) return "HLD";
  return "";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pitcherIdParam = searchParams.get("pitcher_id");
  const seasonParam = searchParams.get("season") || "2025";
  const branch = (searchParams.get("branch") || "lvbp").toLowerCase();
  const phase = searchParams.get("phase") || "all";

  const pitcherId = Number(pitcherIdParam);
  if (!pitcherId) {
    return NextResponse.json({ error: "pitcher_id es requerido" }, { status: 400 });
  }

  const season = Number(seasonParam) || 2025;
  const isLvbp = branch === "lvbp";

  const url = isLvbp
    ? `https://statsapi.mlb.com/api/v1/people/${pitcherId}/stats?stats=gameLog&group=pitching&season=${season}&sportId=17&gameType=R,F,D,L,W`
    : `https://statsapi.mlb.com/api/v1/people/${pitcherId}/stats?stats=gameLog&group=pitching&season=${season}&sportIds=1,11,12`;

  const logs: PitcherGameLog[] = [];

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      const splits = data.stats?.[0]?.splits || [];

      for (const s of splits) {
        const game = s.game || {};
        const stat = s.stat || {};
        const gamePk = Number(game.gamePk) || 0;
        const dateStr = s.date || "";
        const opp = s.opponent?.name || "Rival";
        const gameType = s.gameType || "R";

        // Filtrar por fase si se solicitó
        if (phase && phase !== "all" && gameType !== phase) {
          continue;
        }

        const isStart = Number(stat.gamesStarted || 0) > 0;
        const ip = String(stat.inningsPitched || "0.0");
        const h = Number(stat.hits || 0);
        const r = Number(stat.runs || 0);
        const er = Number(stat.earnedRuns || 0);
        const bb = Number(stat.baseOnBalls || 0);
        const so = Number(stat.strikeOuts || 0);
        const hr = Number(stat.homeRuns || 0);
        const pitches = Number(stat.numberOfPitches || 0);
        const strikes = Number(stat.strikes || 0);
        const era = String(stat.era || "0.00");
        const decision = parseDecision(stat);
        const sportId = s.sport?.id;
        const league: "LVBP" | "MLB" | "MiLB" = isLvbp
          ? "LVBP"
          : sportId === 1
          ? "MLB"
          : "MiLB";

        // Filtrar registros fantasma
        if (ip === "0.0" && h === 0 && r === 0 && er === 0 && bb === 0 && so === 0 && pitches === 0) {
          continue;
        }

        logs.push({
          gamePk,
          date: dateStr,
          opponent: opp,
          isStarter: isStart,
          role: isStart ? "Abridor" : "Relevista",
          gameType,
          phase: gameType,
          ip,
          h,
          r,
          er,
          bb,
          so,
          hr,
          pitches,
          strikes,
          era,
          decision,
          league,
        });
      }
    }
  } catch (err) {
    console.error("Error fetching pitcher game logs:", err);
  }

  // Ordenar de más reciente a más antiguo
  logs.sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({
    pitcherId,
    season,
    branch,
    phase,
    count: logs.length,
    logs,
  });
}
