"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTIVE_SEASON, formatSeason } from "@/lib/constants";
import { ShareButton } from "./share-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { navigationGroups } from "./nav-data";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const closeDrawer = () => setIsOpen(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener("toggle-mobile-drawer", handleToggle);
    window.addEventListener("open-mobile-drawer", handleOpen);
    window.addEventListener("close-mobile-drawer", handleClose);

    return () => {
      window.removeEventListener("toggle-mobile-drawer", handleToggle);
      window.removeEventListener("open-mobile-drawer", handleOpen);
      window.removeEventListener("close-mobile-drawer", handleClose);
    };
  }, []);

  return (
    <>
      {/* ── Barra Superior Móvil (Visible solo en < lg) ── */}
      <header className="lg:hidden h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] landscape-compact-header bg-[#070B19]/95 backdrop-blur-md border-b border-[#1E2B4D] px-4 px-safe flex items-center justify-between sticky top-0 z-40 shrink-0">
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="relative w-8 h-8 logo-container rounded-lg overflow-hidden border border-[#FDB827]/40 bg-[#0D152B] p-0.5 flex items-center justify-center shrink-0">
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

        <div className="flex items-center space-x-1.5">
          <NotificationBell className="p-2 rounded-lg bg-[#0D152B] border border-[#1E2B4D] text-slate-300 hover:text-[#FDB827]" />
          <ShareButton compact />
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Abrir Menú de Navegación"
            className="p-2 rounded-lg bg-[#0D152B] border border-[#1E2B4D] text-slate-300 hover:text-[#FDB827] focus:outline-none"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
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
        <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] border-b border-[#1E2B4D] flex items-center justify-between">
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
                Menú <span className="text-[#FDB827]">Principal</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">LVBP · Caracas</span>
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

        {/* Lista de Navegación por Categorías */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {navigationGroups.map((group, groupIdx) => (
            <div key={group.category} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                <span>{group.category}</span>
                <span className="text-[9px] text-slate-500 font-mono">0{groupIdx + 1}</span>
              </div>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeDrawer}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all min-h-[40px]",
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
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded font-mono border",
                        item.badge === "LIVE"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse"
                          : "bg-[#FDB827]/15 text-[#FDB827] border-[#FDB827]/30"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer del Drawer con Créditos */}
        <div className="p-4 border-t border-[#1E2B4D] bg-[#0D152B]/40 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Temporada {formatSeason(ACTIVE_SEASON)}</span>
            <span className="text-[#FDB827]">REPUBLICARAQUISTAPP</span>
          </div>
          <div className="pt-2 border-t border-[#1E2B4D]/60 flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium">
              Desarrollado y modelado por:
            </span>
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FDB827]"></span>
              Jorge Leonardo Loreto
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono">
              <a
                href="https://x.com/JorgeLoreto"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FDB827] hover:underline"
                title="Cuenta personal de Jorge Leonardo Loreto en X"
              >
                @JorgeLoreto
              </a>
              <span className="text-[#FDB827]/50">·</span>
              <a
                href="https://x.com/RepubCaraquista"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FDB827] hover:underline"
                title="Comunidad República Caraquista en X"
              >
                @RepubCaraquista
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
