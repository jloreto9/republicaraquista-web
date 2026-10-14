import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { WpaView } from "@/components/wpa/wpa-view";
import {
  processGameWpa,
  getSeasonWpaLeaders,
  getLeonesGamesList,
} from "@/lib/wpa-engine";
import { getActiveSeason } from "@/lib/constants";

export const revalidate = 300; // 5 minutos ISR

export const metadata: Metadata = {
  title: "Win Expectancy & WPA | República Caraquista",
  description:
    "Curvas de probabilidad de victoria por encuentro, matriz Tango RE24 de 24 estados, apalancamiento (Leverage Index) y líderes de Clutch de Leones del Caracas.",
};

export default async function WpaPage() {
  const activeSeason = await getActiveSeason();
  const games = getLeonesGamesList(activeSeason);
  const initialGameId = games[0]?.id || 870090;
  const initialGameData = await processGameWpa(initialGameId);
  const seasonLeaders = getSeasonWpaLeaders(activeSeason);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Win Expectancy & WPA"
        subtitle="Probabilidad de Victoria • Matriz Tango RE24 • Apalancamiento (Leverage Index)"
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        <WpaView
          initialGameData={initialGameData}
          seasonLeaders={seasonLeaders}
          games={games}
          season={activeSeason}
        />
      </main>
    </div>
  );
}
