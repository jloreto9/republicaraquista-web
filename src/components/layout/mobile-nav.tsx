"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Menu,
  X,
  LayoutDashboard,
  Trophy,
  Users,
  BarChart3,
  GitCompare,
  PieChart,
  Target,
  Shield,
  Activity,
  Layers,
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

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const closeDrawer = () => setIsOpen(false);

  return (
    <>
      {/* ── Barra Superior Móvil (Visible solo en < lg) ── */}
      <header className="lg:hidden h-14 bg-[#070B19]/95 backdrop-blur-md border-b border-[#1E2B4D] px-4 flex items-center justify-between sticky top-0 z-40 shrink-0">
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#FDB827]/40 bg-[#0D152B] p-0.5 flex items-center justify-center shrink-0">
            <Image
              src="/assets/logo.png"
              alt="República Caraquista"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
          <span className="font-bold text-xs tracking-wider text-slate-100 uppercase">
            República <span className="text-[#FDB827]">Caraquista</span>
          </span>
        </Link>

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir Menú de Navegación"
          className="p-2 rounded-lg bg-[#0D152B] border border-[#1E2B4D] text-slate-300 hover:text-[#FDB827] focus:outline-none"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* ── Backdrop Oscuro ── */}
      {isOpen && (
        <div
          onClick={closeDrawer}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden transition-opacity"
        />
      )}

      {/* ── Slide-Over Drawer Lateral para Móvil / Tablet ── */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 w-72 bg-[#070B19] border-l border-[#1E2B4D] z-[60] flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Cabecera del Drawer */}
        <div className="p-4 border-b border-[#1E2B4D] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#FDB827]/40 bg-[#0D152B] p-0.5 flex items-center justify-center shrink-0">
              <Image
                src="/assets/logo.png"
                alt="República Caraquista"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs text-slate-100 uppercase">
                Menú <span className="text-[#FDB827]">Sabermétrico</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">LVBP • Caracas</span>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            aria-label="Cerrar Menú"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#131E3D]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Navegación Completa */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeDrawer}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all min-h-[44px]",
                  isActive
                    ? "bg-[#1E2B4D] text-[#FDB827] font-semibold border border-[#FDB827]/30 shadow-[0_0_15px_rgba(253,184,39,0.15)]"
                    : "text-slate-300 hover:text-slate-100 hover:bg-[#0D152B]"
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0",
                      isActive ? "text-[#FDB827]" : "text-slate-400"
                    )}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#131E3D] text-slate-400 border border-[#1E2B4D]">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer del Drawer */}
        <div className="p-4 border-t border-[#1E2B4D] bg-[#0D152B]/40">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Temporada 2025-26</span>
            <span className="text-[#FDB827]">PWA App</span>
          </div>
        </div>
      </div>

      {/* ── Barra de Navegación Inferior (Bottom Bar Móvil) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#070B19]/95 backdrop-blur-lg border-t border-[#1E2B4D] px-2 flex items-center justify-around z-30 pb-safe">
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname === "/" ? "text-[#FDB827]" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Mando</span>
        </Link>

        <Link
          href="/standings"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname === "/standings" ? "text-[#FDB827]" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Trophy className="w-5 h-5 mb-0.5" />
          <span>Posiciones</span>
        </Link>

        <Link
          href="/individuales"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname === "/individuales" ? "text-[#FDB827]" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Líderes</span>
        </Link>

        <button
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium text-slate-400 hover:text-[#FDB827] transition-colors"
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span>Más Vistas</span>
        </button>
      </div>
    </>
  );
}
