import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { IndividualesView } from "@/components/stats/individuales-view";
import { getBattingStats, getPitchingStats, getFieldingStats, getTeamGamesMap } from "@/lib/supabase";
import { getActiveSeason } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Líderes Individuales | República Caraquista",
  description: "Estadísticas individuales de bateo, pitcheo y fildeo de la LVBP y Leones del Caracas.",
};

export default async function IndividualesPage() {
  const activeSeason = await getActiveSeason();
  const [
    initialBattingStats,
    initialPitchingStats,
    initialFieldingStats,
    { teamGamesMap, teamWinPctMap, maxGames },
  ] = await Promise.all([
    getBattingStats(activeSeason, "R", "all", 500, 0),
    getPitchingStats(activeSeason, "R", "all", 500, 0.0),
    getFieldingStats(activeSeason, "R", "all", 1000, 0),
    getTeamGamesMap(activeSeason, "R"),
  ]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Líderes Individuales"
        subtitle="Líderes de Bateo, Pitcheo, Premios y Fildeo • LVBP"
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-[1800px] w-full mx-auto">
        <Suspense
          fallback={
            <div className="p-12 text-center text-slate-400 font-mono text-xs">
              Cargando estadísticas individuales...
            </div>
          }
        >
          <IndividualesView
            initialBattingStats={initialBattingStats}
            initialPitchingStats={initialPitchingStats}
            initialFieldingStats={initialFieldingStats}
            initialSeason={activeSeason}
            initialTeamGamesMap={teamGamesMap}
            initialTeamWinPctMap={teamWinPctMap}
            initialMaxGames={maxGames}
          />
        </Suspense>
      </main>
    </div>
  );
}
