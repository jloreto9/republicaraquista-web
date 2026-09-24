import { Header } from "@/components/layout/header";
import { IndividualesView } from "@/components/stats/individuales-view";
import { getBattingStats, getPitchingStats } from "@/lib/supabase";

export const revalidate = 300; // ISR cada 5 minutos

export const metadata = {
  title: "Líderes Individuales | República Caraquista",
  description: "Estadísticas individuales de bateo y pitcheo de la LVBP y Leones del Caracas.",
};

export default async function IndividualesPage() {
  const [initialBattingStats, initialPitchingStats] = await Promise.all([
    getBattingStats(2025, "R", "all", 60),
    getPitchingStats(2025, "R", "all", 60),
  ]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Líderes Individuales"
        subtitle="Estadísticas Tradicionales & Sabermetría • LVBP"
        season={2025}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        <IndividualesView
          initialBattingStats={initialBattingStats}
          initialPitchingStats={initialPitchingStats}
        />
      </main>
    </div>
  );
}
