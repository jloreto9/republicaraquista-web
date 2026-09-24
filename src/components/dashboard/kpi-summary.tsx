import { SeasonKPIs } from "@/types/sports";
import { Trophy, TrendingUp, Sun, Moon, Flame } from "lucide-react";

interface KPISummaryProps {
  kpis: SeasonKPIs;
}

export function KPISummary({ kpis }: KPISummaryProps) {
  const cards = [
    {
      title: "Récord Global",
      value: `${kpis.caracasWins}-${kpis.caracasLosses}`,
      subtext: `PCT ${(kpis.caracasPct).toFixed(3).replace(/^0+/, "")}`,
      icon: Trophy,
      highlight: true,
    },
    {
      title: "Posición en la Tabla",
      value: `${kpis.caracasPosition}° Lugar`,
      subtext: "Clasificación Round Robin",
      icon: TrendingUp,
      highlight: false,
    },
    {
      title: "Diferencial de Carreras",
      value: kpis.caracasRunDiff > 0 ? `+${kpis.caracasRunDiff}` : `${kpis.caracasRunDiff}`,
      subtext: "Carreras a Favor vs En Contra",
      icon: Flame,
      highlight: false,
    },
    {
      title: "Racha Actual",
      value: kpis.caracasStreak,
      subtext: "Últimos encuentros",
      icon: Flame,
      highlight: false,
    },
    {
      title: "Día vs Noche",
      value: `${kpis.dayWins}-${kpis.dayLosses} / ${kpis.nightWins}-${kpis.nightLosses}`,
      subtext: "Día (Sol) / Noche (Luz)",
      icon: Sun,
      highlight: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`p-4 rounded-xl border transition-all ${
              card.highlight
                ? "bg-[#0D152B] border-[#FDB827]/40 shadow-[0_0_20px_-5px_rgba(253,184,39,0.15)]"
                : "bg-[#0D152B]/80 border-[#1E2B4D] hover:border-[#1E2B4D]/80"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>{card.title}</span>
              <Icon
                className={`w-4 h-4 ${
                  card.highlight ? "text-[#FDB827]" : "text-slate-400"
                }`}
              />
            </div>
            <div className="text-xl font-bold tracking-tight text-slate-100 font-mono">
              {card.value}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              {card.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
}
