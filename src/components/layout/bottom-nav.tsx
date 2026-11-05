"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Tv,
  Trophy,
  Calendar,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  isAction?: boolean;
}

const bottomNavItems: BottomNavItem[] = [
  { name: "Inicio", href: "/", icon: LayoutDashboard },
  { name: "Game Center", href: "/game-center", icon: Tv },
  { name: "Posiciones", href: "/standings", icon: Trophy },
  { name: "Calendario", href: "/calendario", icon: Calendar },
  { name: "Más", href: "#menu", icon: Menu, isAction: true },
];

export function BottomNav() {
  const pathname = usePathname();

  const handleOpenDrawer = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toggle-mobile-drawer"));
    }
  };

  return (
    <nav
      aria-label="Navegación inferior móvil"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070B19]/95 backdrop-blur-lg border-t border-[#1E2B4D] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_25px_rgba(0,0,0,0.6)]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {bottomNavItems.map((item) => {
          const isActive = !item.isAction && pathname === item.href;
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <button
                key={item.name}
                type="button"
                onClick={handleOpenDrawer}
                aria-label="Abrir menú de categorías completo"
                className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl text-slate-400 hover:text-slate-100 active:scale-[0.92] transition-all group"
              >
                <div className="relative flex items-center justify-center p-1 rounded-lg group-hover:bg-[#0D152B]">
                  <Icon className="w-5 h-5 transition-colors group-hover:text-[#FDB827]" />
                </div>
                <span className="text-[10px] font-mono tracking-tight mt-0.5 text-slate-400 group-hover:text-slate-200">
                  {item.name}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl active:scale-[0.92] transition-all relative group",
                isActive
                  ? "text-[#FDB827]"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {/* Barra indicadora superior para item activo */}
              {isActive && (
                <span className="absolute -top-1.5 w-7 h-0.5 rounded-full bg-[#FDB827] shadow-[0_0_8px_#FDB827]" />
              )}
              <div
                className={cn(
                  "relative flex items-center justify-center p-1 rounded-lg transition-colors",
                  isActive
                    ? "bg-[#FDB827]/10"
                    : "group-hover:bg-[#0D152B]"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-[#FDB827]" : "text-slate-400 group-hover:text-slate-200"
                  )}
                />
                {/* Badge en vivo sutil para Game Center */}
                {item.href === "/game-center" && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-mono tracking-tight mt-0.5",
                  isActive
                    ? "font-bold text-[#FDB827]"
                    : "text-slate-400 group-hover:text-slate-200"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
