"use client";

import Image from "next/image";
import { TrendGameItem } from "@/types/leones-stats";
import { TrendingUp } from "lucide-react";

interface TrendsTabProps {
  trends: TrendGameItem[];
}

export function TrendsTab({ trends }: TrendsTabProps) {
  const wins = trends.filter((t) => t.won).length;
  const losses = trends.length - wins;

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E2B4D] pb-3">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-[#FDB827]" />
          <h3 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wider">
            Tendencias • Últimos 10 Juegos
          </h3>
        </div>
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-slate-400">Balance:</span>
          <span className="font-bold text-slate-100 bg-[#070B19] px-2.5 py-1 rounded-lg border border-[#1E2B4D]">
            {wins}G - {losses}P (.{Math.round((wins / (trends.length || 1)) * 1000)})
          </span>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-[#1E2B4D] text-slate-400">
              <th className="py-2.5 px-3">Fecha</th>
              <th className="py-2.5 px-3">Rival</th>
              <th className="py-2.5 px-3 text-center">Condición</th>
              <th className="py-2.5 px-3 text-center">Resultado</th>
              <th className="py-2.5 px-3 text-right">Marcador</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2B4D]/50 text-slate-200">
            {trends.map((game, idx) => (
              <tr
                key={game.id || idx}
                className="hover:bg-[#131E3D]/40 transition-colors"
              >
                <td className="py-2.5 px-3 font-semibold text-slate-300">
                  {game.fecha}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#070B19] border border-[#1E2B4D] flex items-center justify-center p-0.5 shrink-0 overflow-hidden relative">
                      <Image
                        src={game.rivalLogo}
                        alt={game.rivalName}
                        width={20}
                        height={20}
                        className="object-contain"
                      />
                    </div>
                    <span className="font-bold text-slate-100">
                      {game.rivalName}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center text-slate-400">
                  {game.isHome ? "vs (Local)" : "@ (Visita)"}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-6 rounded-md font-bold text-xs ${
                      game.won
                        ? "bg-[#196F3D]/25 text-emerald-400 border border-[#196F3D]/50"
                        : "bg-[#922B21]/25 text-rose-400 border border-[#922B21]/50"
                    }`}
                  >
                    {game.won ? "W" : "L"}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-extrabold text-slate-100">
                  {game.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
