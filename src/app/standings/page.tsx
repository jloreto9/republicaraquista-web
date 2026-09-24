import { Header } from "@/components/layout/header";
import { StandingsTable } from "@/components/standings/standings-table";
import { EloCard } from "@/components/standings/elo-card";
import { getStandings } from "@/lib/supabase";

export const revalidate = 300; // ISR en Vercel

export default async function StandingsPage() {
  const standings = await getStandings(2025, "regular");

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Posiciones & ELO"
        subtitle="Expectativa Pitagórica (xW/xL) • Power Rankings de Franquicias"
        season={2025}
      />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabla de Posiciones Principal */}
          <div className="lg:col-span-2 space-y-4">
            <StandingsTable standings={standings} showPythagorean={true} />
            <div className="p-3.5 rounded-lg bg-[#0D152B]/60 border border-[#1E2B4D] text-[11px] text-slate-400 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                <strong className="text-slate-200">xPCT:</strong> Expectativa Pitagórica = CA^1.83 / (CA^1.83 + CP^1.83)
              </span>
              <span className="text-[#FDB827]">
                Tango Sabermetrics Standard
              </span>
            </div>
          </div>

          {/* Tarjeta de ELO Power Rankings */}
          <div className="lg:col-span-1">
            <EloCard standings={standings} />
          </div>
        </div>
      </main>
    </div>
  );
}
