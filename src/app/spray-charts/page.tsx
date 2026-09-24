import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { SprayView } from "@/components/spray/spray-view";
import {
  getPlayerBattedBalls,
  computeSprayStats,
  getPlayerStrikeZoneData,
  LEONES_SPRAY_PLAYERS,
} from "@/lib/spray-engine";

export const revalidate = 300; // 5 minutos ISR

export const metadata: Metadata = {
  title: "Spray Charts & Strike Zone | República Caraquista",
  description:
    "Gráficos espaciales en diamante geométrico con modelo determinístico BIS de dureza y análisis de disciplina en zona de strike 3x3.",
};

export default function SprayChartsPage() {
  const initialPlayerId = LEONES_SPRAY_PLAYERS[0].id;
  const initialBalls = getPlayerBattedBalls(initialPlayerId);
  const initialStats = computeSprayStats(initialBalls);
  const { pitches: initialPitches, metrics: initialMetrics } = getPlayerStrikeZoneData(initialPlayerId);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Spray Charts & Strike Zone"
        subtitle="Geometría Espacial en Diamante • Modelo BIS de Dureza • Zona 3x3"
        season={2025}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        <SprayView
          initialPlayerId={initialPlayerId}
          initialBalls={initialBalls}
          initialStats={initialStats}
          initialPitches={initialPitches}
          initialMetrics={initialMetrics}
          players={LEONES_SPRAY_PLAYERS}
        />
      </main>
    </div>
  );
}
