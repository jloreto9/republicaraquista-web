"use client";

import { useState } from "react";
import Image from "next/image";
import { TeamStanding } from "@/types/sports";
import { Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StandingsTableProps {
  standings: TeamStanding[];
  showPythagorean?: boolean;
}

function getStreakBadgeClass(streak: string): string {
  const s = (streak || "").trim().toUpperCase();
  if (s.startsWith("G") || s.startsWith("W") || s.endsWith("W") || s.endsWith("G")) {
    return "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40";
  }
  if (s.startsWith("P") || s.startsWith("L") || s.endsWith("L") || s.endsWith("P")) {
    return "bg-rose-950/80 text-rose-400 border border-rose-800/40";
  }
  return "bg-slate-800/80 text-slate-400 border border-slate-700/40";
}

export function StandingsTable({
  standings,
  showPythagorean = true,
}: StandingsTableProps) {
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);

  if (!standings || standings.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-slate-400 text-xs">
        No se encontraron registros de tabla de posiciones.
      </div>
    );
  }

  const toggleExpand = (teamId: number) => {
    setExpandedTeamId((prev) => (prev === teamId ? null : teamId));
  };

  return (
    <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden shadow-xl">
      <div className="p-3.5 sm:p-4 border-b border-[#1E2B4D] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-[#FDB827]" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider">
            Tabla de Posiciones Oficial
          </h2>
        </div>
        <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
          Top 5 avanzan al Round Robin
        </span>
      </div>

      {/* ── VISTA MÓVIL ESENCIAL + FILA EXPANDIBLE (< sm) ── */}
      <div className="block sm:hidden">
        <div className="bg-[#070B19]/80 text-slate-400 font-mono border-b border-[#1E2B4D] text-[10px] grid grid-cols-12 py-2 px-3 text-center">
          <span className="col-span-1">#</span>
          <span className="col-span-5 text-left font-sans font-semibold">EQUIPO</span>
          <span className="col-span-1">JJ</span>
          <span className="col-span-1 text-slate-200 font-bold">G</span>
          <span className="col-span-1 text-slate-200 font-bold">P</span>
          <span className="col-span-2 text-[#FDB827] font-bold">PCT</span>
          <span className="col-span-1">DIF</span>
        </div>

        <div className="divide-y divide-[#1E2B4D]/50 font-mono text-xs">
          {standings.map((team, idx) => {
            const isCaracas = team.teamId === 695;
            const isClassified = idx < 5;
            const isExpanded = expandedTeamId === team.teamId;

            return (
              <div key={team.teamId} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleExpand(team.teamId)}
                  className={cn(
                    "w-full text-left grid grid-cols-12 py-3 px-3 items-center transition-all text-xs active:bg-[#1E2B4D]/40",
                    isCaracas
                      ? "bg-[#002D62]/35 text-slate-100 font-semibold"
                      : "text-slate-300 hover:bg-[#131E3D]/40",
                    idx === 4 && standings.length > 5 ? "border-b border-[#FDB827]/40" : ""
                  )}
                >
                  {/* Posición */}
                  <span className="col-span-1 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold",
                        isClassified ? "bg-[#1E2B4D] text-[#FDB827]" : "text-slate-400"
                      )}
                    >
                      {idx + 1}
                    </span>
                  </span>

                  {/* Equipo */}
                  <div className="col-span-5 flex items-center space-x-2 truncate pr-1">
                    <div className="w-5 h-5 relative shrink-0">
                      <Image
                        src={team.logoUrl}
                        alt={team.teamName}
                        width={20}
                        height={20}
                        className="object-contain"
                      />
                    </div>
                    <span className={cn("truncate text-xs font-sans", isCaracas ? "text-[#FDB827] font-bold" : "text-slate-200")}>
                      {team.teamName}
                    </span>
                  </div>

                  {/* Métricas Principales */}
                  <span className="col-span-1 text-center text-slate-400 text-[11px]">{team.gamesPlayed}</span>
                  <span className="col-span-1 text-center font-bold text-slate-100">{team.wins}</span>
                  <span className="col-span-1 text-center text-slate-300">{team.losses}</span>
                  <span className="col-span-2 text-center font-bold text-[#FDB827]">
                    {team.pct.toFixed(3).replace(/^0+/, "")}
                  </span>
                  <div className="col-span-1 flex items-center justify-center space-x-0.5 text-slate-400 text-[11px]">
                    <span>{team.gamesBack}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3 text-[#FDB827]" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    )}
                  </div>
                </button>

                {/* Sub-tarjeta de Detalles al Expandir */}
                {isExpanded && (
                  <div className="p-3 bg-[#070B19]/90 border-t border-b border-[#1E2B4D]/60 animate-in fade-in duration-200 space-y-2 text-[11px]">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-[10px] text-slate-400 uppercase font-sans">Récord Local/Visita</span>
                        <p className="text-slate-200 font-bold mt-0.5">
                          Casa: {team.homeRecord} · Visita: {team.awayRecord}
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-[10px] text-slate-400 uppercase font-sans">Racha & L10</span>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span
                            className={cn(
                              "px-1.5 py-0.2 rounded text-[10px] font-bold",
                              getStreakBadgeClass(team.streak)
                            )}
                          >
                            {team.streak}
                          </span>
                          <span className="text-slate-200 font-bold">L10: {team.last10}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-1.5 rounded-lg bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-[9px] text-slate-400">Anotadas (CA)</span>
                        <p className="font-bold text-slate-200">{team.runsScored}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-[9px] text-slate-400">Permitidas (CP)</span>
                        <p className="font-bold text-slate-200">{team.runsAllowed}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-[9px] text-slate-400">Diferencial</span>
                        <p
                          className={cn(
                            "font-bold",
                            team.runDifferential > 0
                              ? "text-emerald-400"
                              : team.runDifferential < 0
                              ? "text-rose-400"
                              : "text-slate-400"
                          )}
                        >
                          {team.runDifferential > 0 ? `+${team.runDifferential}` : team.runDifferential}
                        </p>
                      </div>
                    </div>

                    {showPythagorean && (
                      <div className="p-2 rounded-lg bg-[#002D62]/20 border border-sky-500/30 flex items-center justify-between text-sky-300">
                        <span>Pitagórico Esperado (xW-xL):</span>
                        <span className="font-bold font-mono">
                          {team.expectedWins}-{team.expectedLosses} ({team.pythagoreanPct.toFixed(3).replace(/^0+/, "")})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── VISTA DESKTOP COMPLETA 16 COLUMNAS (>= sm) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[720px]">
          <thead>
            <tr className="bg-[#070B19]/60 text-slate-400 font-mono border-b border-[#1E2B4D] text-[11px]">
              <th className="py-3 px-4 font-semibold text-center w-12">POS</th>
              <th className="py-3 px-4 font-semibold">EQUIPO</th>
              <th className="py-3 px-3 font-semibold text-center">JJ</th>
              <th className="py-3 px-3 font-semibold text-center text-slate-200">G</th>
              <th className="py-3 px-3 font-semibold text-center text-slate-200">P</th>
              <th className="py-3 px-3 font-semibold text-center text-[#FDB827]">PCT</th>
              <th className="py-3 px-3 font-semibold text-center">DIF</th>
              <th className="py-3 px-3 font-semibold text-center">CA</th>
              <th className="py-3 px-3 font-semibold text-center">CP</th>
              <th className="py-3 px-3 font-semibold text-center">+/-</th>
              <th className="py-3 px-3 font-semibold text-center">CASA</th>
              <th className="py-3 px-3 font-semibold text-center">VISITA</th>
              <th className="py-3 px-3 font-semibold text-center">RACHA</th>
              <th className="py-3 px-3 font-semibold text-center">L10</th>
              {showPythagorean && (
                <>
                  <th className="py-3 px-3 font-semibold text-center text-sky-400">
                    xPCT
                  </th>
                  <th className="py-3 px-3 font-semibold text-center text-sky-400">
                    xW-xL
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2B4D]/50">
            {standings.map((team, idx) => {
              const isCaracas = team.teamId === 695;
              const isClassified = idx < 5;

              return (
                <tr
                  key={team.teamId}
                  className={cn(
                    "transition-colors font-mono",
                    isCaracas
                      ? "bg-[#002D62]/30 hover:bg-[#002D62]/45 font-semibold text-slate-100"
                      : "hover:bg-[#131E3D]/50 text-slate-300",
                    idx === 4 && standings.length > 5 ? "border-b-2 border-[#FDB827]/40" : ""
                  )}
                >
                  <td className="py-3 px-4 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold",
                        isClassified ? "bg-[#1E2B4D] text-[#FDB827]" : "text-slate-400"
                      )}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans font-semibold">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 relative shrink-0">
                        <Image
                          src={team.logoUrl}
                          alt={team.teamName}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      </div>
                      <span className={isCaracas ? "text-[#FDB827]" : "text-slate-100"}>
                        {team.teamName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">{team.gamesPlayed}</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-100">
                    {team.wins}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300">
                    {team.losses}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-[#FDB827]">
                    {team.pct.toFixed(3).replace(/^0+/, "")}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300">
                    {team.gamesBack}
                  </td>
                  <td className="py-3 px-3 text-center">{team.runsScored}</td>
                  <td className="py-3 px-3 text-center">{team.runsAllowed}</td>
                  <td
                    className={cn(
                      "py-3 px-3 text-center font-semibold",
                      team.runDifferential > 0
                        ? "text-emerald-400"
                        : team.runDifferential < 0
                        ? "text-rose-400"
                        : "text-slate-400"
                    )}
                  >
                    {team.runDifferential > 0
                      ? `+${team.runDifferential}`
                      : team.runDifferential}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300">
                    {team.homeRecord}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300">
                    {team.awayRecord}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold",
                        getStreakBadgeClass(team.streak)
                      )}
                    >
                      {team.streak}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300">
                    {team.last10}
                  </td>
                  {showPythagorean && (
                    <>
                      <td className="py-3 px-3 text-center text-sky-400 font-semibold">
                        {team.pythagoreanPct.toFixed(3).replace(/^0+/, "")}
                      </td>
                      <td className="py-3 px-3 text-center text-sky-300">
                        {team.expectedWins}-{team.expectedLosses}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
