"use client";

import Image from "next/image";
import { getTeam } from "@/lib/constants";

interface HeaderProps {
  title: string;
  subtitle?: string;
  season?: number;
}

export function Header({
  title,
  subtitle = "Analítica Avanzada & Sabermetría LVBP",
  season = 2025,
}: HeaderProps) {
  const caracas = getTeam(695);

  return (
    <header className="h-16 border-b border-[#1E2B4D] bg-[#070B19]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <div>
          <h1 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-400 font-normal">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Status Pill */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-[#0D152B] border border-[#1E2B4D] text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-mono text-[11px]">
            Temporada {season} (2025-26)
          </span>
        </div>

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
