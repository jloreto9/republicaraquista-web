import { Header } from "@/components/layout/header";
import { StandingsView } from "@/components/standings/standings-view";
import { getStandings, getScheduledGames } from "@/lib/supabase";
import { runMonteCarloSimulation } from "@/lib/monte-carlo";
import { getActiveSeason } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Posiciones | REPUBLICARAQUISTAPP",
  description: "Tabla de posiciones oficial y simulador de clasificación de la LVBP.",
};

export default async function StandingsPage() {
  const activeSeason = await getActiveSeason();
  const [standings, remainingGames] = await Promise.all([
    getStandings(activeSeason, "regular"),
    getScheduledGames(activeSeason),
  ]);
  const initialSimulation = runMonteCarloSimulation(
    standings,
    "actual",
    3000,
    remainingGames
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Posiciones"
        subtitle="Tabla Oficial • Expectativa Pitagórica • Simulador de Clasificación"
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-[1800px] w-full mx-auto">
        <StandingsView
          standings={standings}
          initialSimulation={initialSimulation}
          remainingGames={remainingGames}
        />
      </main>
    </div>
  );
}
