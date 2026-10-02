import { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { ProbabilidadesView } from "@/components/probabilidades/probabilidades-view";
import { ACTIVE_SEASON } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Líneas & Probabilidades Sabermétricas | REPUBLICARAQUISTAPP",
  description:
    "Proyecciones multi-factor de partidos LVBP, Cuotas Justas (Fair Odds), comparador de casas de apuestas (JuegaEnLínea, Betcris, SellaTuParley, Apuestas Royal), detección de cuotas desfasadas (+EV) y Criterio de Kelly.",
};

export const revalidate = 300; // ISR cada 5 minutos

export default function ProbabilidadesPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Líneas & Probabilidades"
        subtitle="Proyecciones Sabermétricas • Cuotas de Mercado • Detección +EV"
        season={ACTIVE_SEASON}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
        <Suspense
          fallback={
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#FDB827] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs uppercase tracking-wider font-bold">
                Sincronizando Calendario y Líneas Sabermétricas...
              </span>
            </div>
          }
        >
          <ProbabilidadesView />
        </Suspense>
      </main>
    </div>
  );
}
