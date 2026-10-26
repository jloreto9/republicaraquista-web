import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { getBattingStats, getPitchingStats } from "@/lib/supabase";
import { MatchupView } from "@/components/matchup/matchup-view";
import { getActiveSeason } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Matchup 360 (H2H) — República Caraquista",
  description:
    "Comparador Head-to-Head entre dos jugadores de la LVBP con radar multidimensional y veredicto automatizado.",
};

export const dynamic = "force-dynamic";

export default async function MatchupPage() {
  const activeSeason = await getActiveSeason();
  const [batters, pitchers] = await Promise.all([
    getBattingStats(activeSeason, "R", "all", 200, 0),
    getPitchingStats(activeSeason, "R", "all", 200, 0),
  ]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Matchup 360 (H2H)"
        subtitle="Comparador Cara a Cara • Radar 8D • LVBP"
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-[1800px] w-full mx-auto">
        <MatchupView
          initialBatters={batters}
          initialPitchers={pitchers}
          season={activeSeason}
        />
      </main>
    </div>
  );
}
