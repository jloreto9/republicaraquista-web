import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { getBattingStats, getPitchingStats } from "@/lib/supabase";
import { MatchupView } from "@/components/matchup/matchup-view";

export const metadata: Metadata = {
  title: "Matchup 360 (H2H) — República Caraquista",
  description:
    "Comparador sabermétrico Head-to-Head entre dos jugadores de la LVBP con radar polar multidimensional y veredicto automatizado.",
};

export const revalidate = 300;

export default async function MatchupPage() {
  const [batters, pitchers] = await Promise.all([
    getBattingStats(2025, "R", "all", 200, 0),
    getPitchingStats(2025, "R", "all", 200, 0),
  ]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Matchup 360 (H2H)"
        subtitle="Comparador Sabermétrico Cara a Cara • Radar Polar 8D • LVBP"
        season={2025}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        <MatchupView
          initialBatters={batters}
          initialPitchers={pitchers}
          season={2025}
        />
      </main>
    </div>
  );
}
