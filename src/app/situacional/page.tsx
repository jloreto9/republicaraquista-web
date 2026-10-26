import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { SituacionalView } from "@/components/situacional/situacional-view";
import { getLeonesSituationalData } from "@/lib/situational-engine";
import { getDynamicSituationalData } from "@/lib/game-feed-service";
import { getActiveSeason } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Splits Situacionales & LOB Tracker | República Caraquista",
  description:
    "Rendimiento en RISP, situaciones Clutch con 2 outs, bases llenas, platoon LHP/RHP y tracking de corredores dejados en base (LOB).",
};

export default async function SituacionalPage() {
  const activeSeason = await getActiveSeason();
  const initialData =
    activeSeason >= 2026
      ? await getDynamicSituationalData(activeSeason)
      : getLeonesSituationalData(activeSeason);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Splits Situacionales & LOB Tracker"
        subtitle="Rendimiento en Presión (RISP, Clutch, Bases Llenas) • Dejados en Base • BvP"
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-[1800px] w-full mx-auto">
        <SituacionalView initialData={initialData} season={activeSeason} />
      </main>
    </div>
  );
}
