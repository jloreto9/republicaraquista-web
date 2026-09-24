"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Trophy,
  Users,
  BarChart3,
  GitCompare,
  PieChart,
  Target,
  Shield,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { name: "Centro de Mando", href: "/", icon: LayoutDashboard },
  { name: "Posiciones & ELO", href: "/standings", icon: Trophy },
  { name: "Líderes Individuales", href: "/individuales", icon: Users },
  { name: "Estadísticas Colectivas", href: "/colectivas", icon: BarChart3, badge: "Fase 4" },
  { name: "Matchup 360 (H2H)", href: "/matchup", icon: GitCompare, badge: "Fase 3" },
  { name: "Win Expectancy & WPA", href: "/wpa", icon: Activity, badge: "Fase 5" },
  { name: "Splits Situacionales", href: "/situacional", icon: PieChart, badge: "Fase 5" },
  { name: "Spray Charts", href: "/spray-charts", icon: Target, badge: "Fase 5" },
  { name: "Bullpen & Lineups", href: "/bullpen", icon: Shield, badge: "Fase 4" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 bg-[#070B19] border-r border-[#1E2B4D] flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1E2B4D] flex items-center space-x-3">
        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#FDB827]/40 bg-[#0D152B] p-1 flex items-center justify-center shrink-0">
          <Image
            src="/assets/logo.png"
            alt="República Caraquista"
            width={36}
            height={36}
            className="object-contain"
          />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-wider text-slate-100 uppercase">
            República <span className="text-[#FDB827]">Caraquista</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
            Plataforma Sabermétrica
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Menú Principal
        </div>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const isPending = Boolean(item.badge);

          return (
            <Link
              key={item.name}
              href={isPending ? "#" : item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group",
                isActive
                  ? "bg-[#0D152B] text-[#FDB827] border border-[#FDB827]/30 shadow-[0_0_12px_rgba(253,184,39,0.1)]"
                  : "text-slate-300 hover:text-slate-100 hover:bg-[#0D152B]/60",
                isPending && "opacity-60 cursor-not-allowed hover:bg-transparent hover:text-slate-400"
              )}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? "text-[#FDB827]"
                      : "text-slate-400 group-hover:text-slate-200"
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1E2B4D] text-slate-300 font-mono">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info & Credits */}
      <div className="p-4 border-t border-[#1E2B4D] bg-[#070B19]/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Temporada LVBP</span>
          <span className="font-mono text-[#FDB827] font-semibold">2025-26</span>
        </div>
        <div className="pt-2 border-t border-[#1E2B4D]/60 flex flex-col">
          <span className="text-[10px] text-slate-400 font-medium">
            Desarrollado y modelado por:
          </span>
          <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FDB827]"></span>
            Jorge Leonardo Loreto
          </span>
          <span className="text-[10px] text-[#FDB827]/80 font-mono mt-0.5">
            @republicaraquista
          </span>
        </div>
      </div>
    </aside>
  );
}
