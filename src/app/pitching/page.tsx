import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { PitchingView } from "@/components/pitching/pitching-view";
import { getActiveSeason } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pitching Summary & Telemetría | República Caraquista",
  description:
    "Buscador universal de lanzadores, telemetría Hawk-Eye (MLB) y analítica Play-by-Play adaptada para Leones del Caracas con exportación de tarjetas HD.",
};

export default async function PitchingPage() {
  const activeSeason = await getActiveSeason();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Pitching Summary & Telemetría"
        subtitle="Telemetría Hawk-Eye (MLB) • Play-by-Play Leones del Caracas • Tarjetas HD Thomas Nestico"
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        <PitchingView initialSeason={activeSeason} />
      </main>
    </div>
  );
}
