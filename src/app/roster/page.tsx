import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { RosterView } from "@/components/roster/roster-view";
import { getActiveSeason } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Roster Oficial & Coaching Staff | REPUBLICARAQUISTAPP",
  description:
    "Roster oficial semanal (tope 34 plazas) de Leones del Caracas en la LVBP, cuerpo técnico oficial de Lipso Nava y boletín en PDF.",
};

export default async function RosterPage() {
  const activeSeason = await getActiveSeason();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Roster & Coaching Staff"
        subtitle="Roster Oficial Semanal (Tope 34) • Cuerpo Técnico • Boletín LVBP"
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        <RosterView />
      </main>
    </div>
  );
}
