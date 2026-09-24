import { Metadata } from "next";
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
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-100 flex items-center space-x-2">
          <span>ESTADÍSTICAS COLECTIVAS</span>
          <span className="text-[#FDB827]">LVBP</span>
        </h1>
        <p className="text-xs text-slate-400">
          Rendimiento consolidado de los 8 equipos en bateo, rotación monticular y solvencia defensiva.
        </p>
      </div>

      <ColectivasView initialData={stats} season={2025} initialPhase="R" />
    </div>
  );
}
