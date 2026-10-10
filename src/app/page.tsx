import Link from "next/link";
import { Header } from "@/components/layout/header";
import { KPISummary } from "@/components/dashboard/kpi-summary";
import { Scoreboard } from "@/components/dashboard/scoreboard";
import { StandingsTable } from "@/components/standings/standings-table";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { getSeasonKPIs, getRecentGames, getStandings } from "@/lib/supabase";
import { getDashboardTabsData } from "@/lib/leones-stats-service";
import { getActiveSeason, SEASON_LABELS } from "@/lib/constants";
import { ArrowRight, Trophy, Calendar } from "lucide-react";

export const revalidate = 300; // ISR cada 5 minutos en Edge de Vercel

export default async function DashboardPage() {
  const activeSeason = await getActiveSeason();
  const [kpis, recentGames, standings, tabsData] = await Promise.all([
    getSeasonKPIs(activeSeason),
    getRecentGames(activeSeason, 6),
    getStandings(activeSeason, "regular"),
    getDashboardTabsData(activeSeason),
  ]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Centro de Mando"
        subtitle={`Temporada Regular LVBP • Leones del Caracas`}
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        {/* Banner Temporada Oficial 2026-2027 */}
        <section className="p-4 rounded-2xl bg-gradient-to-r from-[#0D152B] via-[#131E3D] to-[#0D152B] border border-[#FDB827]/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDB827]/10 border border-[#FDB827]/30 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-[#FDB827]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#FDB827] font-semibold">
                  Temporada LVBP 2026-2027
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                ¡Calendario Oficial Disponible!
              </h3>
              <p className="text-[11px] text-slate-400">
                Inicia el 13 de Octubre en Maracaibo vs. Águilas del Zulia.
              </p>
            </div>
          </div>
          <Link
            href="/calendario"
            className="flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-[#FDB827] text-[#070B19] text-xs font-bold hover:bg-[#FDB827]/90 transition-all shrink-0 shadow-md font-mono"
          >
            <span>Ver Calendario & Sincronizar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
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

        {/* Suite de Pestañas: Último Juego, Tendencias, Líderes del Equipo y Leones Stats */}
        <DashboardTabs
          data={tabsData}
          seasonLabel={SEASON_LABELS[activeSeason] || `${activeSeason}-${(activeSeason + 1).toString().slice(-2)}`}
          defaultTab="leones-stats"
        />

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
