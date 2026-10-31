import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { PitchingView } from "@/components/pitching/pitching-view";
import { getActiveSeason } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pitching Summary & Telemetría | República Caraquista",
  description:
    "Buscador integral de lanzadores LVBP (8 equipos) y MLB, telemetría Hawk-Eye, analítica Play-by-Play y exportación de reportes HD 3:4 (2400×3200 px).",
};

export const dynamic = "force-dynamic";

export default async function PitchingPage() {
  const activeSeason = await getActiveSeason();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Pitching Summary & Telemetría"
        subtitle="Telemetría Hawk-Eye (MLB) • Play-by-Play LVBP (8 Equipos) • Reportes HD 3:4 Thomas Nestico"
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-[1800px] w-full mx-auto">
        <PitchingView initialSeason={activeSeason} />
      </main>
    </div>
  );
}
