import type { Metadata } from "next";
import { RosterView } from "@/components/roster/roster-view";

export const metadata: Metadata = {
  title: "Roster Semanal Oficial y Coaching Staff • REPUBLICARAQUISTAPP",
  description:
    "Roster oficial de 34 jugadores de Leones del Caracas en la LVBP 2026-2027, desglose de Criollos e Importados, cuerpo técnico oficial y boletín semanal en PDF.",
  openGraph: {
    title: "Roster Semanal Oficial y Coaching Staff · Leones del Caracas",
    description:
      "Consulta los 34 peloteros habilitados por la LVBP, cuerpo técnico de Lipso Nava y descarga el boletín oficial en PDF.",
  },
};

export default function RosterPage() {
  return <RosterView />;
}
