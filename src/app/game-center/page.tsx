import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { GameCenterView } from "@/components/game-center/game-center-view";
import { getGameCenterData } from "@/lib/game-center-service";
import { getActiveSeason } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Game Center • En Vivo | REPUBLICARAQUISTAPP",
  description:
    "Segunda pantalla oficial de Leones del Caracas en la LVBP: marcador en vivo, diamante interactivo, conteo, duelo en el plato y jugada a jugada.",
};

export default async function GameCenterPage() {
  const activeSeason = await getActiveSeason();
  const initialData = await getGameCenterData(undefined, activeSeason);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Game Center • En Vivo"
        subtitle="Segunda Pantalla • Conteo, Corredores, Duelo & Jugada a Jugada"
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        {initialData ? (
          <GameCenterView initialData={initialData} />
        ) : (
          <div className="p-8 text-center rounded-2xl bg-[#0D152B] border border-[#1E2B4D] text-slate-400">
            No hay información disponible del Game Center en este momento.
          </div>
        )}
      </main>
    </div>
  );
}
