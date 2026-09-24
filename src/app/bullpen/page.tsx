import { Metadata } from "next";
import { getBullpenAndLineups } from "@/lib/bullpen";
import { BullpenView } from "@/components/bullpen/bullpen-view";

export const metadata: Metadata = {
  title: "Bullpen & Tracker de Alineaciones — República Caraquista",
  description:
    "Efectividad en herencia de corredores (IR/IRS) del cuerpo de relevistas y optimización del orden al bate 1-9 de Leones del Caracas.",
};

export const revalidate = 300;

export default async function BullpenPage() {
  const data = getBullpenAndLineups(2025, 695);

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-100 flex items-center space-x-2">
          <span>BULLPEN & TRACKER</span>
          <span className="text-[#FDB827]">LINEUPS 1-9</span>
        </h1>
        <p className="text-xs text-slate-400">
          Analítica de corredores heredados (IR/IRS) y seguimiento sistemático de combinaciones titulares y orden al bate.
        </p>
      </div>

      <BullpenView initialData={data} season={2025} />
    </div>
  );
}
