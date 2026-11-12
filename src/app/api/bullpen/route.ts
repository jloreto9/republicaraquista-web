import { NextRequest, NextResponse } from "next/server";
import { getBullpenAndLineups } from "@/lib/bullpen";
import {
  getDynamicBullpenAndLineups,
  getRequestedGameLineupAndStats,
} from "@/lib/game-feed-service";
import { getBullpenBudget } from "@/lib/bullpen-budget";
import { getActiveSeason } from "@/lib/season-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activeSeason = await getActiveSeason();
  const seasonParam = searchParams.get("season");
  const parsedSeason = seasonParam ? parseInt(seasonParam, 10) : NaN;
  const season = Number.isFinite(parsedSeason) ? parsedSeason : activeSeason;

  const teamIdParam = searchParams.get("teamId");
  const parsedTeamId = teamIdParam ? parseInt(teamIdParam, 10) : NaN;
  const teamId = Number.isFinite(parsedTeamId) && parsedTeamId > 0 ? parsedTeamId : 695;

  const gamePkParam = searchParams.get("gamePk");
  const parsedGamePk = gamePkParam ? parseInt(gamePkParam, 10) : NaN;
  const targetGamePk =
    Number.isFinite(parsedGamePk) && parsedGamePk > 0 ? parsedGamePk : undefined;

  try {
    const [baseData, bullpenBudget, fallbackRequested] = await Promise.all([
      season >= activeSeason
        ? getDynamicBullpenAndLineups(season, { targetGamePk, teamId })
        : Promise.resolve(getBullpenAndLineups(season, teamId)),
      getBullpenBudget(season, teamId),
      season < activeSeason && targetGamePk
        ? getRequestedGameLineupAndStats(targetGamePk, season, teamId)
        : Promise.resolve(null),
    ]);

    const enrichedLineups = fallbackRequested
      ? {
          ...baseData.lineups,
          requestedLineup: fallbackRequested.requestedLineup,
          playerStatsMap: fallbackRequested.playerStatsMap,
        }
      : baseData.lineups;

    const data = {
      ...baseData,
      lineups: enrichedLineups,
      bullpenBudget,
    };

    return NextResponse.json({
      success: true,
      season,
      teamId,
      data,
    });
  } catch (error) {
    console.error("API error in /api/bullpen:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error processing bullpen data",
      },
      { status: 500 }
    );
  }
}
