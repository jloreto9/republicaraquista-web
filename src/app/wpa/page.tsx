import { Metadata } from "next";
import { WpaView } from "@/components/wpa/wpa-view";
import { processGameWpa, getSeasonWpaLeaders, LEONES_KEY_GAMES } from "@/lib/wpa-engine";

export const revalidate = 300; // 5 minutos ISR

export const metadata: Metadata = {
  title: "Win Expectancy & WPA | República Caraquista",
  description:
    "Curvas de probabilidad de victoria por encuentro, matriz Tango RE24 de 24 estados, apalancamiento (Leverage Index) y líderes de Clutch de Leones del Caracas.",
};

export default async function WpaPage() {
  const initialGameData = await processGameWpa(LEONES_KEY_GAMES[0].id);
  const seasonLeaders = getSeasonWpaLeaders();

  return (
    <div className="space-y-6">
      <WpaView initialGameData={initialGameData} seasonLeaders={seasonLeaders} />
    </div>
  );
}
