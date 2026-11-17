import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { getActiveSeason } from "@/lib/constants";
import { getParkFactorsData } from "@/lib/park-factors-service";
import { ParkFactorsView } from "@/components/park-factors/park-factors-view";

export const metadata: Metadata = {
  title: "Factores de Parque (Estadios LVBP) — República Caraquista",
  description:
    "Factores de parque empíricos por estadio y evento (Carreras, Jonrones, Hits, Dobles, Triples, Boletos y Ponches) en la LVBP.",
};

export const dynamic = "force-dynamic";

export default async function ParkFactorsPage() {
  const [activeSeason, initialData] = await Promise.all([
    getActiveSeason(),
    getParkFactorsData("multi"),
  ]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Factores de Parque"
        subtitle="Impacto Empírico por Estadio LVBP • Carreras, Jonrones, Hits y Pitcheo (2024–2026)"
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-[1800px] w-full mx-auto">
        <ParkFactorsView initialData={initialData} />
      </main>
    </div>
  );
}
