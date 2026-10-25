"use client";

import { useState } from "react";
import Image from "next/image";
import {
  GameCenterTeam,
  GameCenterBoxscoreBatter,
  GameCenterBoxscorePitcher,
} from "@/types/game-center";
import { Users } from "lucide-react";

interface BoxscoreLineupsTabProps {
  homeTeam: GameCenterTeam;
  awayTeam: GameCenterTeam;
  awayBatters: GameCenterBoxscoreBatter[];
  homeBatters: GameCenterBoxscoreBatter[];
  awayPitchers: GameCenterBoxscorePitcher[];
  homePitchers: GameCenterBoxscorePitcher[];
}

export function BoxscoreLineupsTab({
  homeTeam,
  awayTeam,
  awayBatters,
  homeBatters,
  awayPitchers,
  homePitchers,
}: BoxscoreLineupsTabProps) {
  // Por defecto seleccionar Leones del Caracas
  const [selectedTeamId, setSelectedTeamId] = useState<number>(
    homeTeam.isLeones ? homeTeam.id : awayTeam.id
  );

  const isHomeSelected = selectedTeamId === homeTeam.id;
  const currentTeam = isHomeSelected ? homeTeam : awayTeam;
  const rawBatters = isHomeSelected ? homeBatters : awayBatters;
  // Salvaguarda defensiva: excluir lanzadores de la alineación ofensiva
  const currentBatters = rawBatters.filter((b) => b.position !== "P");
  const currentPitchers = isHomeSelected ? homePitchers : awayPitchers;

  // Totales colectivos del equipo
  const teamTotals = currentBatters.reduce(
    (acc, b) => ({
      ab: acc.ab + b.ab,
      r: acc.r + b.r,
      h: acc.h + b.h,
      doubles: acc.doubles + b.doubles,
      triples: acc.triples + b.triples,
      hr: acc.hr + b.hr,
      rbi: acc.rbi + b.rbi,
      bb: acc.bb + b.bb,
      so: acc.so + b.so,
    }),
    { ab: 0, r: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, so: 0 }
  );

  const teamAvg =
    teamTotals.ab > 0
      ? (teamTotals.h / teamTotals.ab).toFixed(3).replace(/^0/, "")
      : ".000";

  const startersCount = currentBatters.filter((b) => !b.isSubstitute).length;
  const subsCount = currentBatters.filter((b) => b.isSubstitute).length;

  return (
    <div className="space-y-6">
      {/* ── SELECTOR DE EQUIPO (TABS) ── */}
      <div className="flex items-center space-x-2 p-1.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] w-fit">
        <button
          onClick={() => setSelectedTeamId(awayTeam.id)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
            selectedTeamId === awayTeam.id
              ? "bg-[#1E2B4D] text-[#FDB827] shadow-md border border-[#FDB827]/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="w-4 h-4 relative shrink-0">
            <Image
              src={awayTeam.logoUrl}
              alt={awayTeam.name}
              width={16}
              height={16}
              className="object-contain"
            />
          </div>
          <span>{awayTeam.name}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            ({awayTeam.abbreviation})
          </span>
        </button>

        <button
          onClick={() => setSelectedTeamId(homeTeam.id)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
            selectedTeamId === homeTeam.id
              ? "bg-[#1E2B4D] text-[#FDB827] shadow-md border border-[#FDB827]/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="w-4 h-4 relative shrink-0">
            <Image
              src={homeTeam.logoUrl}
              alt={homeTeam.name}
              width={16}
              height={16}
              className="object-contain"
            />
          </div>
          <span>{homeTeam.name}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            ({homeTeam.abbreviation})
          </span>
        </button>
      </div>

      {/* ── TABLA DE BATEO 1-9 (LINEUP) ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2B4D]">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-[#FDB827]" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
              Alineación Ofensiva • {currentTeam.name}
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {currentBatters.length} Bateadores {subsCount > 0 ? `(${startersCount} titulares + ${subsCount} suplente${subsCount > 1 ? "s" : ""})` : "registrados"}
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#1E2B4D]">
          <table className="w-full min-w-[620px] text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#1E2B4D] text-slate-400 text-[11px] text-center">
                <th className="py-2.5 px-3 text-left font-sans font-bold w-10">
                  #
                </th>
                <th className="py-2.5 px-3 text-left font-sans font-bold">
                  Bateador
                </th>
                <th className="py-2.5 px-2 font-bold">POS</th>
                <th className="py-2.5 px-2 font-bold text-slate-200">VB</th>
                <th className="py-2.5 px-2 font-bold text-slate-200">C</th>
                <th className="py-2.5 px-2 font-bold text-[#FDB827]">H</th>
                <th className="py-2.5 px-2 font-bold">2B</th>
                <th className="py-2.5 px-2 font-bold">3B</th>
                <th className="py-2.5 px-2 font-bold text-[#FDB827]">HR</th>
                <th className="py-2.5 px-2 font-bold text-amber-400">CI</th>
                <th className="py-2.5 px-2 font-bold">BB</th>
                <th className="py-2.5 px-2 font-bold">SO</th>
                <th className="py-2.5 px-3 font-bold text-slate-400">AVG</th>
                <th className="py-2.5 px-3 font-bold text-slate-400">OPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2B4D]/60 text-slate-200 text-center">
              {currentBatters.map((b) => (
                <tr
                  key={`batter-${b.id}-${b.slot || b.order}-${b.isSubstitute ? "sub" : "main"}`}
                  className={`hover:bg-[#131F3F]/50 transition-colors ${
                    b.isSubstitute ? "bg-[#091024]/40" : ""
                  }`}
                >
                  <td className="py-2 px-3 text-left text-slate-400 font-bold">
                    {b.isSubstitute ? "" : (b.slot || b.order)}
                  </td>
                  <td className="py-2 px-3 text-left font-sans">
                    <div className={`flex items-center ${b.isSubstitute ? "pl-5 sm:pl-7" : ""}`}>
                      {b.isSubstitute && b.note && (
                        <span className="text-[11px] font-mono text-[#FDB827] mr-1.5 font-bold">
                          {b.note}
                        </span>
                      )}
                      <span className={`font-bold ${b.isSubstitute ? "text-slate-300 font-medium text-[11px] sm:text-xs" : "text-slate-100"}`}>
                        {b.name}
                      </span>
                      {b.jersey !== "-" && (
                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                          #{b.jersey}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 font-bold text-slate-300">
                    {b.position}
                  </td>
                  <td className="py-2 px-2">{b.ab}</td>
                  <td className="py-2 px-2">{b.r}</td>
                  <td className="py-2 px-2 font-bold text-[#FDB827]">{b.h}</td>
                  <td className="py-2 px-2 text-slate-400">{b.doubles}</td>
                  <td className="py-2 px-2 text-slate-400">{b.triples}</td>
                  <td className="py-2 px-2 font-bold text-[#FDB827]">{b.hr}</td>
                  <td className="py-2 px-2 font-bold text-amber-400">{b.rbi}</td>
                  <td className="py-2 px-2 text-slate-400">{b.bb}</td>
                  <td className="py-2 px-2 text-slate-400">{b.so}</td>
                  <td className="py-2 px-3 text-slate-400">{b.avg}</td>
                  <td className="py-2 px-3 text-slate-400">{b.ops}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-[#1E2B4D] bg-[#070B19]/80 font-bold text-slate-100 text-center">
              <tr>
                <td className="py-2.5 px-3 text-left"></td>
                <td className="py-2.5 px-3 text-left font-sans tracking-wider uppercase text-xs text-slate-200">
                  Totales
                </td>
                <td className="py-2.5 px-2"></td>
                <td className="py-2.5 px-2 text-slate-100">{teamTotals.ab}</td>
                <td className="py-2.5 px-2 text-slate-100">{teamTotals.r}</td>
                <td className="py-2.5 px-2 text-[#FDB827]">{teamTotals.h}</td>
                <td className="py-2.5 px-2 text-slate-300">{teamTotals.doubles}</td>
                <td className="py-2.5 px-2 text-slate-300">{teamTotals.triples}</td>
                <td className="py-2.5 px-2 text-[#FDB827]">{teamTotals.hr}</td>
                <td className="py-2.5 px-2 text-amber-400">{teamTotals.rbi}</td>
                <td className="py-2.5 px-2 text-slate-300">{teamTotals.bb}</td>
                <td className="py-2.5 px-2 text-slate-300">{teamTotals.so}</td>
                <td className="py-2.5 px-3 text-slate-300">{teamAvg}</td>
                <td className="py-2.5 px-3 text-slate-400">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── TABLA DE PITCHEO ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2B4D]">
          <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
            <span>⚾</span>
            <span>Cuerpo de Lanzadores • {currentTeam.name}</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            {currentPitchers.length} Pitchers actuantes
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#1E2B4D]">
          <table className="w-full min-w-[620px] text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#1E2B4D] text-slate-400 text-[11px] text-center">
                <th className="py-2.5 px-3 text-left font-sans font-bold">
                  Lanzador
                </th>
                <th className="py-2.5 px-2 font-bold text-slate-200">IP</th>
                <th className="py-2.5 px-2 font-bold text-slate-200">H</th>
                <th className="py-2.5 px-2 font-bold">C</th>
                <th className="py-2.5 px-2 font-bold text-rose-400">CL</th>
                <th className="py-2.5 px-2 font-bold">BB</th>
                <th className="py-2.5 px-2 font-bold text-emerald-400">SO</th>
                <th className="py-2.5 px-2 font-bold">HR</th>
                <th className="py-2.5 px-3 font-bold text-slate-300">P-S</th>
                <th className="py-2.5 px-3 font-bold text-slate-400">ERA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2B4D]/60 text-slate-200 text-center">
              {currentPitchers.map((p) => (
                <tr
                  key={`pitcher-${p.id}`}
                  className="hover:bg-[#131F3F]/50 transition-colors"
                >
                  <td className="py-2 px-3 text-left font-sans">
                    <span className="font-bold text-slate-100">{p.name}</span>
                    {p.jersey !== "-" && (
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                        #{p.jersey}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 font-bold text-slate-100">{p.ip}</td>
                  <td className="py-2 px-2">{p.h}</td>
                  <td className="py-2 px-2">{p.r}</td>
                  <td className="py-2 px-2 font-bold text-rose-400">{p.er}</td>
                  <td className="py-2 px-2 text-slate-400">{p.bb}</td>
                  <td className="py-2 px-2 font-bold text-emerald-400">{p.so}</td>
                  <td className="py-2 px-2 text-slate-400">{p.hr}</td>
                  <td className="py-2 px-3 text-slate-300">
                    {p.pitches}-{p.strikes}
                  </td>
                  <td className="py-2 px-3 text-slate-400">{p.era}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
