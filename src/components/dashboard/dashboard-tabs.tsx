"use client";

import { useState } from "react";
import { DashboardTabsData } from "@/types/leones-stats";
import { LastGameTab } from "./tabs/last-game-tab";
import { TrendsTab } from "./tabs/trends-tab";
import { TeamLeadersTab } from "./tabs/team-leaders-tab";
import { LeonesStatsTab } from "./tabs/leones-stats-tab";
import { Calendar, TrendingUp, Trophy, Sparkles } from "lucide-react";

interface DashboardTabsProps {
  data: DashboardTabsData;
  seasonLabel?: string;
  defaultTab?: "last-game" | "trends" | "leaders" | "leones-stats";
}

export function DashboardTabs({
  data,
  seasonLabel = "25-26",
  defaultTab = "leones-stats",
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<
    "last-game" | "trends" | "leaders" | "leones-stats"
  >(defaultTab);

  const tabs = [
    {
      id: "last-game" as const,
      label: "Último Juego",
      icon: Calendar,
      badge: "Final",
    },
    {
      id: "trends" as const,
      label: "Tendencias",
      icon: TrendingUp,
      badge: "U10J",
    },
    {
      id: "leaders" as const,
      label: "Líderes del Equipo",
      icon: Trophy,
      badge: "OPS & ERA",
    },
    {
      id: "leones-stats" as const,
      label: "Leones Stats",
      icon: Sparkles,
      badge: "Situacional",
      highlight: true,
    },
  ];

  return (
    <section className="space-y-4">
      {/* ── BARRA DE PESTAÑAS INTERACTIVAS ── */}
      <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-2.5 overflow-x-auto scrollbar-none gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.3)] font-bold"
                    : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#070B19]" : "text-[#FDB827]"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive
                        ? "bg-[#070B19]/20 text-[#070B19] font-bold"
                        : "bg-[#070B19] text-slate-400 border border-[#1E2B4D]"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <span className="hidden md:inline-flex text-[11px] font-mono text-slate-400 shrink-0">
          Temporada Regular LVBP
        </span>
      </div>

      {/* ── CONTENIDO REACTIVO DE LA PESTAÑA ACTIVA ── */}
      <div className="transition-all duration-200">
        {activeTab === "last-game" && <LastGameTab lastGame={data.lastGame} />}
        {activeTab === "trends" && <TrendsTab trends={data.trends} />}
        {activeTab === "leaders" && (
          <TeamLeadersTab
            batters={data.leaders.batters}
            pitchers={data.leaders.pitchers}
          />
        )}
        {activeTab === "leones-stats" && (
          <LeonesStatsTab
            stats={data.advancedStats}
            weeklyRecords={data.weeklyRecords}
            channelRecords={data.channelRecords}
            seasonLabel={seasonLabel}
          />
        )}
      </div>
    </section>
  );
}
