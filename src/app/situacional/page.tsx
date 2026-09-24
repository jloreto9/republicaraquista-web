import { Metadata } from "next";
import { SituacionalView } from "@/components/situacional/situacional-view";
import { getLeonesSituationalData } from "@/lib/situational-engine";

export const revalidate = 300; // 5 minutos ISR

export const metadata: Metadata = {
  title: "Splits Situacionales & LOB Tracker | República Caraquista",
  description:
    "Rendimiento en RISP, situaciones Clutch con 2 outs, bases llenas, platoon LHP/RHP y tracking de corredores dejados en base (LOB).",
};

export default function SituacionalPage() {
  const initialData = getLeonesSituationalData(2025);

  return (
    <div className="space-y-6">
      <SituacionalView initialData={initialData} />
    </div>
  );
}
