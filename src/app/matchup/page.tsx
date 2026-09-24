import { Metadata } from "next";
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
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-100 flex items-center space-x-2">
          <span>MATCHUP 360</span>
          <span className="text-[#FDB827]">HEAD-TO-HEAD</span>
        </h1>
        <p className="text-xs text-slate-400">
          Enfrenta directamente a cualquier toletero o lanzador de la LVBP en 8 dimensiones sabermétricas con percentiles y desglose métrica a métrica.
        </p>
      </div>

      <MatchupView
        initialBatters={batters}
        initialPitchers={pitchers}
        season={2025}
      />
    </div>
  );
}
