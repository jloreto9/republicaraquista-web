"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ACTIVE_SEASON, formatSeason } from "@/lib/constants";
import { navigationGroups } from "./nav-data";

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
            Leones del Caracas & LVBP
          </span>
        </div>
      </div>

      {/* Navigation List Organized by Categories */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
        {navigationGroups.map((group, groupIdx) => (
          <div key={group.category} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
              <span>{group.category}</span>
              <span className="text-[9px] text-slate-500 font-mono">0{groupIdx + 1}</span>
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const isPending = Boolean(item.isPending);

              return (
                <Link
                  key={item.name}
                  href={isPending ? "#" : item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                    isActive
                      ? "bg-[#0D152B] text-[#FDB827] border border-[#FDB827]/30 shadow-[0_0_12px_rgba(253,184,39,0.1)] font-semibold"
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

      {/* Footer Info & Credits */}
      <div className="p-4 border-t border-[#1E2B4D] bg-[#070B19]/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Temporada LVBP</span>
          <span className="font-mono text-[#FDB827] font-semibold">
            {formatSeason(ACTIVE_SEASON)}
          </span>
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
    </aside>
  );
}
