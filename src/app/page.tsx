import Link from "next/link";
import { Header } from "@/components/layout/header";
import { KPISummary } from "@/components/dashboard/kpi-summary";
import { Scoreboard } from "@/components/dashboard/scoreboard";
import { StandingsTable } from "@/components/standings/standings-table";
import { getSeasonKPIs, getRecentGames, getStandings } from "@/lib/supabase";
import { ArrowRight, Trophy } from "lucide-react";

export const revalidate = 300; // ISR cada 5 minutos en Edge de Vercel

export default async function DashboardPage() {
  const [kpis, recentGames, standings] = await Promise.all([
    getSeasonKPIs(2025),
    getRecentGames(2025, 6),
    getStandings(2025, "regular"),
  ]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Centro de Mando"
        subtitle="Temporada Regular LVBP • Leones del Caracas"
        season={2025}
      />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Resumen de Temporada (KPIs) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Resumen de Temporada
            </h2>
            <span className="text-[11px] text-[#FDB827] font-mono">
              Fórmula Pitagórica (1.83)
            </span>
          </div>
          <KPISummary kpis={kpis} />
        </section>

        {/* Scoreboard Cara a Cara */}
        <section>
          <Scoreboard games={recentGames} />
        </section>

        {/* Standings Preview */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-[#FDB827]" />
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Posiciones de Campeonato
              </h2>
            </div>
            <Link
              href="/standings"
              className="text-xs text-[#FDB827] hover:text-[#FDB827]/80 flex items-center space-x-1 font-mono transition-colors"
            >
              <span>Ver tabla completa y ELO</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <StandingsTable standings={standings.slice(0, 5)} showPythagorean={false} />
        </section>
      </main>
    </div>
  );
}
