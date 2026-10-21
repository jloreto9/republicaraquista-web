"use client";

import Image from "next/image";
import { getTeam, ACTIVE_SEASON, formatSeason } from "@/lib/constants";
import { useSeason } from "@/context/season-context";
import { ChevronDown } from "lucide-react";
import { ShareButton } from "./share-button";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface HeaderProps {
  title: string;
  subtitle?: string;
  season?: number;
}

export function Header({
  title,
  subtitle = "Estadísticas y Seguimiento en Vivo • LVBP",
  season: initialSeason = ACTIVE_SEASON,
}: HeaderProps) {
  const { season, setSeason, availableSeasons } = useSeason();
  const caracas = getTeam(695);

  return (
    <header className="min-h-14 sm:h-16 border-b border-[#1E2B4D] bg-[#070B19]/90 backdrop-blur-md px-4 sm:px-6 py-2.5 sm:py-0 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center space-x-3">
        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-400 font-normal line-clamp-1">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Interactive Season Selector Dropdown */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#0D152B] border border-[#1E2B4D] text-xs shadow-sm hover:border-[#FDB827]/40 transition-colors">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="relative flex items-center">
            <select
              value={season}
              onChange={(e) => setSeason(Number(e.target.value))}
              aria-label="Seleccionar temporada LVBP"
              className="appearance-none bg-transparent text-slate-200 font-mono text-[11px] font-bold pr-5 pl-1 py-0.5 focus:outline-none cursor-pointer"
            >
              <option value={2026} className="bg-[#070B19] text-slate-200">
                2026-27 (En Curso)
              </option>
              <option value={2025} className="bg-[#070B19] text-slate-200">
                2025-26
              </option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 pointer-events-none opacity-80" />
          </div>
        </div>

        {/* Share Button */}
        <ShareButton
          title={`${title} • REPUBLICARAQUISTAPP`}
          text={`¡Sigue a los Leones del Caracas en ${title} en REPUBLICARAQUISTAPP! 🦁⚾`}
        />

        {/* Notifications Bell */}
        <NotificationBell />

        {/* Leones Mini Badge */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-[#002D62]/40 border border-[#FDB827]/30">
          <div className="w-5 h-5 relative">
            <Image
              src={caracas.logoUrl}
              alt="Leones"
              width={20}
              height={20}
              className="object-contain"
            />
          </div>
          <span className="text-xs font-bold text-[#FDB827]">CAR</span>
        </div>
      </div>
    </header>
  );
}
