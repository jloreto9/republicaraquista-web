"use client";

import Image from "next/image";
import { GameCenterLinescore, GameCenterTeam } from "@/types/game-center";

interface LinescoreTableProps {
  linescore: GameCenterLinescore;
  homeTeam: GameCenterTeam;
  awayTeam: GameCenterTeam;
}

export function LinescoreTable({
  linescore,
  homeTeam,
  awayTeam,
}: LinescoreTableProps) {
  const innings = linescore.innings;
  const currentInning = linescore.currentInning;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl overflow-hidden">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E2B4D]">
        <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
          <span>📊</span>
          <span>Marcador Entrada por Entrada</span>
        </h3>
        <span className="text-[10px] font-mono text-slate-400">
          Oficial MLB Winter Leagues
        </span>
      </div>

      <div className="overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[#1E2B4D]">
        <table className="w-full min-w-[500px] border-collapse text-center text-xs font-mono">
          <thead>
            <tr className="border-b border-[#1E2B4D] text-slate-400 text-[11px]">
              <th className="py-2 px-3 text-left w-32 font-sans font-bold">
                Equipo
              </th>
              {innings.map((inn) => {
                const isCurrent = inn.num === currentInning;
                return (
                  <th
                    key={`th-inn-${inn.num}`}
                    className={`py-2 px-2.5 font-bold ${
                      isCurrent
                        ? "text-[#FDB827] bg-[#FDB827]/10 rounded-t"
                        : "text-slate-400"
                    }`}
                  >
                    {inn.num}
                  </th>
                );
              })}
              <th className="py-2 px-3 font-bold text-slate-100 border-l border-[#1E2B4D] bg-[#070B19]/50">
                C
              </th>
              <th className="py-2 px-3 font-bold text-slate-100 bg-[#070B19]/50">
                H
              </th>
              <th className="py-2 px-3 font-bold text-slate-100 bg-[#070B19]/50">
                E
              </th>
              <th className="py-2 px-3 font-bold text-slate-400 bg-[#070B19]/50">
                QOB
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2B4D]/60 text-slate-200">
            {/* ── VISITANTE (AWAY) ── */}
            <tr className="hover:bg-[#131F3F]/50 transition-colors">
              <td className="py-2.5 px-3 text-left font-sans flex items-center space-x-2">
                <div className="w-5 h-5 relative shrink-0">
                  <Image
                    src={awayTeam.logoUrl}
                    alt={awayTeam.name}
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </div>
                <span className="font-bold text-slate-100 text-xs">
                  {awayTeam.abbreviation}
                </span>
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                  (Visita)
                </span>
              </td>
              {innings.map((inn) => {
                const isCurrent = inn.num === currentInning;
                return (
                  <td
                    key={`away-inn-${inn.num}`}
                    className={`py-2.5 px-2.5 ${
                      isCurrent
                        ? "font-bold text-[#FDB827] bg-[#FDB827]/10"
                        : ""
                    }`}
                  >
                    {inn.away !== null ? inn.away : "-"}
                  </td>
                );
              })}
              <td className="py-2.5 px-3 font-extrabold text-[#FDB827] text-sm border-l border-[#1E2B4D] bg-[#070B19]/50">
                {awayTeam.score}
              </td>
              <td className="py-2.5 px-3 font-semibold text-slate-200 bg-[#070B19]/50">
                {awayTeam.hits}
              </td>
              <td className="py-2.5 px-3 font-semibold text-slate-300 bg-[#070B19]/50">
                {awayTeam.errors}
              </td>
              <td className="py-2.5 px-3 text-slate-400 bg-[#070B19]/50">
                {awayTeam.lob}
              </td>
            </tr>

            {/* ── LOCAL (HOME) ── */}
            <tr className="hover:bg-[#131F3F]/50 transition-colors">
              <td className="py-2.5 px-3 text-left font-sans flex items-center space-x-2">
                <div className="w-5 h-5 relative shrink-0">
                  <Image
                    src={homeTeam.logoUrl}
                    alt={homeTeam.name}
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </div>
                <span className="font-bold text-slate-100 text-xs">
                  {homeTeam.abbreviation}
                </span>
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                  (Local)
                </span>
              </td>
              {innings.map((inn) => {
                const isCurrent = inn.num === currentInning;
                return (
                  <td
                    key={`home-inn-${inn.num}`}
                    className={`py-2.5 px-2.5 ${
                      isCurrent
                        ? "font-bold text-[#FDB827] bg-[#FDB827]/10"
                        : ""
                    }`}
                  >
                    {inn.home !== null ? inn.home : "-"}
                  </td>
                );
              })}
              <td className="py-2.5 px-3 font-extrabold text-[#FDB827] text-sm border-l border-[#1E2B4D] bg-[#070B19]/50">
                {homeTeam.score}
              </td>
              <td className="py-2.5 px-3 font-semibold text-slate-200 bg-[#070B19]/50">
                {homeTeam.hits}
              </td>
              <td className="py-2.5 px-3 font-semibold text-slate-300 bg-[#070B19]/50">
                {homeTeam.errors}
              </td>
              <td className="py-2.5 px-3 text-slate-400 bg-[#070B19]/50">
                {homeTeam.lob}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
