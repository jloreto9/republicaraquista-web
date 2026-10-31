import { NextRequest, NextResponse } from "next/server";
import { PitchingBranch } from "@/types/pitching";
import { fetchSeasonGameLogsWithRealTelemetry } from "@/lib/pitch-parser";
import { getActiveSeason, getAvailableSeasons } from "@/lib/season-service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pitcherIdParam = searchParams.get("pitcher_id");
  const activeSeason = await getActiveSeason();
  const seasonParam = searchParams.get("season");
  const branchRaw = (searchParams.get("branch") || "lvbp").toLowerCase();
  const branch: PitchingBranch = branchRaw === "mlb" ? "mlb" : "lvbp";
  const phase = searchParams.get("phase") || "all";

  const pitcherId = Number(pitcherIdParam);
  if (!pitcherId) {
    return NextResponse.json({ error: "pitcher_id es requerido" }, { status: 400 });
  }

  const season = seasonParam ? Number(seasonParam) || activeSeason : activeSeason;

  let effectiveSeason = season;
  let fallbackUsed = false;
  let { logs } = await fetchSeasonGameLogsWithRealTelemetry(
    pitcherId,
    season,
    branch,
    phase
  );

  if (logs.length === 0 && phase === "all") {
    const available = await getAvailableSeasons();
    const fallbackCandidates =
      branch === "mlb"
        ? [2025, 2024, 2023].filter((s) => s !== season)
        : available.filter((s) => s !== season);

    for (const fallbackS of fallbackCandidates) {
      const candidate = await fetchSeasonGameLogsWithRealTelemetry(
        pitcherId,
        fallbackS,
        branch,
        phase
      );
      if (candidate.logs.length > 0) {
        logs = candidate.logs;
        effectiveSeason = fallbackS;
        fallbackUsed = true;
        break;
      }
    }
  }

  return NextResponse.json({
    pitcherId,
    season,
    effectiveSeason,
    fallbackUsed,
    fallbackMessage: fallbackUsed
      ? `No se encontraron salidas registradas en la temporada ${season} para esta rama. Mostrando la última temporada disponible (${effectiveSeason}).`
      : undefined,
    branch,
    phase,
    count: logs.length,
    logs,
  });
}
