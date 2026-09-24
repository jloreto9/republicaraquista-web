import { Metadata } from "next";
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
    <div className="space-y-6">
      <SprayView
        initialPlayerId={initialPlayerId}
        initialBalls={initialBalls}
        initialStats={initialStats}
        initialPitches={initialPitches}
        initialMetrics={initialMetrics}
      />
    </div>
  );
}
