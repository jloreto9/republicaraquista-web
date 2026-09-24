import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { SituacionalView } from "@/components/situacional/situacional-view";
import { getLeonesSituationalData } from "@/lib/situational-engine";

export const revalidate = 300; // 5 minutos ISR

export const metadata: Metadata = {
  title: "Splits Situacionales & LOB Tracker | República Caraquista",
  description:
    "Rendimiento en RISP, situaciones Clutch con 2 outs, bases llenas, platoon LHP/RHP y tracking de corredores dejados en base (LOB).",
};

export default function SituacionalPage() {
  const initialData = getLeonesSituationalData();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Splits Situacionales & LOB Tracker"
        subtitle="Rendimiento en Presión (RISP, Clutch, Bases Llenas) • Dejados en Base • BvP"
        season={2025}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        <SituacionalView initialData={initialData} />
      </main>
    </div>
  );
}
