import { Suspense } from "react";
import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { PlayerSplitsView } from "@/components/stats/splits/player-splits-view";
import { getActiveSeason, AVAILABLE_SEASONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buscador de Jugadores | República Caraquista",
  description:
    "Perfil integral de jugadores de la LVBP: estadísticas multi-temporada, resumen defensivo, bitácora de juegos, splits avanzados y rendimiento por presión (LI).",
};

interface JugadoresPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function JugadoresPage({ searchParams }: JugadoresPageProps) {
  const [resolvedParams, activeSeason] = await Promise.all([
    searchParams,
    getActiveSeason(),
  ]);

  const seasonRaw =
    typeof resolvedParams.season === "string"
      ? parseInt(resolvedParams.season, 10)
      : NaN;
  const season =
    Number.isFinite(seasonRaw) && AVAILABLE_SEASONS.includes(seasonRaw)
      ? seasonRaw
      : activeSeason;

  const playerRaw =
    typeof resolvedParams.player === "string"
      ? parseInt(resolvedParams.player, 10)
      : NaN;
  const initialPlayerId =
    Number.isFinite(playerRaw) && playerRaw > 0 ? playerRaw : undefined;

  const initialType: "batter" | "pitcher" =
    resolvedParams.type === "pitcher" ? "pitcher" : "batter";

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Buscador de Jugadores"
        subtitle="Perfil Multi-Temporada, Splits Situacionales, Presión (LI) y Bitácora • LVBP"
        season={season}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-[1800px] w-full mx-auto">
        <Suspense
          fallback={
            <div className="p-12 text-center text-slate-400 font-mono text-xs rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
              Cargando buscador de jugadores...
            </div>
          }
        >
          <PlayerSplitsView
            initialPlayerId={initialPlayerId}
            initialType={initialType}
            season={season}
            syncUrl={true}
          />
        </Suspense>
      </main>
    </div>
  );
}
