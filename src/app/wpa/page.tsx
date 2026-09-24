import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { WpaView } from "@/components/wpa/wpa-view";
import { processGameWpa, getSeasonWpaLeaders, LEONES_ALL_GAMES } from "@/lib/wpa-engine";

export const revalidate = 300; // 5 minutos ISR

export const metadata: Metadata = {
  title: "Win Expectancy & WPA | República Caraquista",
  description:
    "Curvas de probabilidad de victoria por encuentro, matriz Tango RE24 de 24 estados, apalancamiento (Leverage Index) y líderes de Clutch de Leones del Caracas.",
};

export default async function WpaPage() {
  const initialGameData = await processGameWpa(LEONES_ALL_GAMES[0].id);
  const seasonLeaders = getSeasonWpaLeaders();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Win Expectancy & WPA"
        subtitle="Probabilidad de Victoria • Matriz Tango RE24 • Apalancamiento (Leverage Index)"
        season={2025}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        <WpaView
          initialGameData={initialGameData}
          seasonLeaders={seasonLeaders}
          games={LEONES_ALL_GAMES}
        />
      </main>
    </div>
  );
}
