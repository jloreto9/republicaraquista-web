import { Header } from "@/components/layout/header";
import { StandingsView } from "@/components/standings/standings-view";
import { getStandings } from "@/lib/supabase";
import { runMonteCarloSimulation } from "@/lib/monte-carlo";

export const revalidate = 300; // ISR en Vercel

export const metadata = {
  title: "Posiciones & ELO | REPUBLICARAQUISTAPP",
  description: "Tabla de posiciones oficial, simulador de clasificación y Power Rankings ELO.",
};

export default async function StandingsPage() {
  const standings = await getStandings(2025, "regular");
  const initialSimulation = runMonteCarloSimulation(standings, "actual", 3000);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Posiciones & ELO"
        subtitle="Expectativa Pitagórica • Simulador de Clasificación • Power Rankings"
        season={2025}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        <StandingsView
          standings={standings}
          initialSimulation={initialSimulation}
        />
      </main>
    </div>
  );
}
