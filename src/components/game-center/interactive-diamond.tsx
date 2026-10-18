"use client";

import { GameCenterBases, GameCenterPlayerMatchup } from "@/types/game-center";
import { User } from "lucide-react";

interface InteractiveDiamondProps {
  bases: GameCenterBases;
  batter: GameCenterPlayerMatchup | null;
  pitcher: GameCenterPlayerMatchup | null;
}

export function InteractiveDiamond({
  bases,
  batter,
  pitcher,
}: InteractiveDiamondProps) {
  const is1BOccupied = bases.first.occupied;
  const is2BOccupied = bases.second.occupied;
  const is3BOccupied = bases.third.occupied;

  return (
    <div className="relative flex flex-col items-center justify-center p-4 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl overflow-hidden min-h-[300px]">
      {/* Fondo Diamante SVG */}
      <svg
        viewBox="0 0 300 260"
        className="w-full max-w-[280px] sm:max-w-[320px] h-auto drop-shadow-md select-none"
      >
        <defs>
          <radialGradient id="fieldGradient" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#121D3D" />
            <stop offset="100%" stopColor="#080E21" />
          </radialGradient>
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Abanico exterior del campo */}
        <path
          d="M 150 230 L 30 110 A 170 170 0 0 1 270 110 Z"
          fill="url(#fieldGradient)"
          stroke="#1E2B4D"
          strokeWidth="1.5"
          opacity="0.8"
        />

        {/* Arco del Infield (tierra) */}
        <path
          d="M 150 230 L 70 150 A 110 110 0 0 1 230 150 Z"
          fill="#162347"
          stroke="#263866"
          strokeWidth="1.5"
        />

        {/* Cuadro interior (Líneas de foul y basepaths) */}
        <path
          d="M 150 225 L 220 155 L 150 85 L 80 155 Z"
          fill="#0D1630"
          stroke="#3B4F80"
          strokeWidth="2"
          strokeDasharray="4 2"
        />

        {/* Líneas de foul hacia los jardines */}
        <line x1="150" y1="225" x2="35" y2="110" stroke="#4A6199" strokeWidth="1.5" />
        <line x1="150" y1="225" x2="265" y2="110" stroke="#4A6199" strokeWidth="1.5" />

        {/* Montículo del lanzador */}
        <circle cx="150" cy="155" r="14" fill="#1C2B54" stroke="#415891" strokeWidth="1.5" />
        <rect x="145" y="153" width="10" height="4" fill="#E2E8F0" rx="1" />

        {/* Plato de Home (Home Plate) */}
        <polygon
          points="150,229 155,223 155,217 145,217 145,223"
          fill="#F8FAFC"
          stroke="#94A3B8"
          strokeWidth="1"
        />

        {/* ── 2DA BASE (Top Center: 150, 85) ── */}
        <g transform="translate(150, 85) rotate(45)">
          <rect
            x="-9"
            y="-9"
            width="18"
            height="18"
            rx="2"
            fill={is2BOccupied ? "#FDB827" : "#1A2542"}
            stroke={is2BOccupied ? "#FFF" : "#475569"}
            strokeWidth={is2BOccupied ? "2" : "1.5"}
            filter={is2BOccupied ? "url(#goldGlow)" : undefined}
          />
        </g>

        {/* ── 3RA BASE (Left: 80, 155) ── */}
        <g transform="translate(80, 155) rotate(45)">
          <rect
            x="-9"
            y="-9"
            width="18"
            height="18"
            rx="2"
            fill={is3BOccupied ? "#FDB827" : "#1A2542"}
            stroke={is3BOccupied ? "#FFF" : "#475569"}
            strokeWidth={is3BOccupied ? "2" : "1.5"}
            filter={is3BOccupied ? "url(#goldGlow)" : undefined}
          />
        </g>

        {/* ── 1RA BASE (Right: 220, 155) ── */}
        <g transform="translate(220, 155) rotate(45)">
          <rect
            x="-9"
            y="-9"
            width="18"
            height="18"
            rx="2"
            fill={is1BOccupied ? "#FDB827" : "#1A2542"}
            stroke={is1BOccupied ? "#FFF" : "#475569"}
            strokeWidth={is1BOccupied ? "2" : "1.5"}
            filter={is1BOccupied ? "url(#goldGlow)" : undefined}
          />
        </g>
      </svg>

      {/* Badges de Corredores en Base (Superpuestos con posiciones absolutas) */}
      {/* 2B Runner */}
      {is2BOccupied && bases.second.runnerName && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#FDB827] text-[#070B19] font-bold text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-amber-300 flex items-center space-x-1 whitespace-nowrap animate-pulse">
          <span>2B:</span>
          <span>{bases.second.runnerName}</span>
        </div>
      )}

      {/* 3B Runner */}
      {is3BOccupied && bases.third.runnerName && (
        <div className="absolute top-[48%] left-2 bg-[#FDB827] text-[#070B19] font-bold text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-amber-300 flex items-center space-x-1 whitespace-nowrap animate-pulse">
          <span>3B:</span>
          <span className="truncate max-w-[90px]">{bases.third.runnerName}</span>
        </div>
      )}

      {/* 1B Runner */}
      {is1BOccupied && bases.first.runnerName && (
        <div className="absolute top-[48%] right-2 bg-[#FDB827] text-[#070B19] font-bold text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-amber-300 flex items-center space-x-1 whitespace-nowrap animate-pulse">
          <span>1B:</span>
          <span className="truncate max-w-[90px]">{bases.first.runnerName}</span>
        </div>
      )}

      {/* Identificación de Bateador & Lanzador al pie del Diamante */}
      <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#1E2B4D]/60 text-xs">
        {/* Lanzador en el montículo */}
        <div className="flex items-center space-x-2 bg-[#070B19]/60 p-2 rounded-xl border border-[#1E2B4D]/50">
          <div className="w-6 h-6 rounded-full bg-[#1E2B4D] flex items-center justify-center text-slate-300">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="overflow-hidden">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1">
              <span>PITCHER</span>
              <span className="text-[#FDB827]">({pitcher?.side || "D"})</span>
            </div>
            <p className="font-semibold text-slate-100 truncate text-[11px]">
              {pitcher?.name || "En espera"}
            </p>
          </div>
        </div>

        {/* Bateador al bate */}
        <div className="flex items-center space-x-2 bg-[#070B19]/60 p-2 rounded-xl border border-[#1E2B4D]/50">
          <div className="w-6 h-6 rounded-full bg-[#1E2B4D] flex items-center justify-center text-[#FDB827]">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="overflow-hidden">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1">
              <span>AL BATE</span>
              <span className="text-[#FDB827]">({batter?.side || "D"})</span>
            </div>
            <p className="font-semibold text-slate-100 truncate text-[11px]">
              {batter?.name || "En espera"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
