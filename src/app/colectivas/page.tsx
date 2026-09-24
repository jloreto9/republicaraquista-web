import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { getCollectiveStats } from "@/lib/collective";
import { ColectivasView } from "@/components/colectivas/colectivas-view";

export const metadata: Metadata = {
  title: "Estadísticas Colectivas (8 Equipos LVBP) — República Caraquista",
  description:
    "Comparativa completa de ofensiva, pitcheo y fildeo entre las 8 franquicias de la LVBP con tablas de líderes y gráficos comparativos.",
};

export const revalidate = 300;

export default async function ColectivasPage() {
  const stats = await getCollectiveStats(2025, "R");

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Estadísticas Colectivas"
        subtitle="Comparativa de los 8 Equipos • Bateo, Pitcheo y Fildeo LVBP"
        season={2025}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        <ColectivasView initialData={stats} season={2025} initialPhase="R" />
      </main>
    </div>
  );
}
