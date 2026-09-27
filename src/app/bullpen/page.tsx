import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { getBullpenAndLineups } from "@/lib/bullpen";
import { BullpenView } from "@/components/bullpen/bullpen-view";
import { ACTIVE_SEASON } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Bullpen & Tracker de Alineaciones — República Caraquista",
  description:
    "Efectividad en herencia de corredores (IR/IRS) del cuerpo de relevistas y optimización del orden al bate 1-9 de Leones del Caracas.",
};

export const revalidate = 300;

export default async function BullpenPage() {
  const data = getBullpenAndLineups(ACTIVE_SEASON, 695);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Bullpen & Lineups"
        subtitle="Herencia de Corredores (IR/IRS) • Dugout Scorecard 1-9 • Matriz de Alineaciones"
        season={ACTIVE_SEASON}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        <BullpenView initialData={data} season={ACTIVE_SEASON} />
      </main>
    </div>
  );
}
