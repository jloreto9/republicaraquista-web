"use client";

import Image from "next/image";
import { BatterLeaderItem, PitcherLeaderItem } from "@/types/leones-stats";
import { Award, Zap } from "lucide-react";

interface TeamLeadersTabProps {
  batters: BatterLeaderItem[];
  pitchers: PitcherLeaderItem[];
}

export function TeamLeadersTab({ batters, pitchers }: TeamLeadersTabProps) {
  const topBatter = batters[0];
  const topPitcher = pitchers[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── BATEO: LÍDERES OFENSIVOS ── */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2B4D]">
            <div className="flex items-center space-x-2">
              <span className="text-base sm:text-lg">🏏</span>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wider">
                Líderes de Bateo
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-[#070B19] px-2 py-0.5 rounded border border-[#1E2B4D]">
              Ordenados por OPS (mín. 10 AB)
            </span>
          </div>

          <div className="overflow-x-auto scrollbar-none mb-4">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1E2B4D] text-slate-400">
                  <th className="py-2 px-2">Jugador</th>
                  <th className="py-2 px-2 text-center">AVG</th>
                  <th className="py-2 px-2 text-center">HR</th>
                  <th className="py-2 px-2 text-center">RBI</th>
                  <th className="py-2 px-2 text-center">OPS</th>
                  <th className="py-2 px-2 text-right">H/AB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2B4D]/50 text-slate-200">
                {batters.map((b, idx) => (
                  <tr
                    key={b.playerId || idx}
                    className={`hover:bg-[#131E3D]/40 transition-colors ${
                      idx === 0 ? "bg-[#FDB827]/10" : ""
                    }`}
                  >
                    <td className="py-2 px-2 flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-[#070B19] border border-[#1E2B4D] overflow-hidden relative shrink-0">
                        <Image
                          src={b.avatarUrl}
                          alt={b.playerName}
                          width={28}
                          height={28}
                          className="object-cover"
                        />
                      </div>
                      <span className="font-semibold text-slate-100 truncate max-w-[130px]">
                        {b.playerName}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center text-slate-300">{b.avg}</td>
                    <td className="py-2 px-2 text-center text-[#FDB827] font-bold">{b.hr}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{b.rbi}</td>
                    <td className="py-2 px-2 text-center font-bold text-amber-400">{b.ops}</td>
                    <td className="py-2 px-2 text-right text-slate-400">
                      {b.h}/{b.ab}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {topBatter && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-[#131E3D] to-[#0D152B] border-l-4 border-[#FDB827] flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#FDB827]" />
              <span className="font-bold text-[#FDB827]">👑 Líder OPS:</span>
              <span className="text-slate-100 font-semibold">{topBatter.playerName}</span>
            </div>
            <span className="font-mono font-bold text-[#FDB827]">{topBatter.ops} OPS</span>
          </div>
        )}
      </div>

      {/* ── PITCHEO: LÍDERES EN LA LOMITA ── */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2B4D]">
            <div className="flex items-center space-x-2">
              <span className="text-base sm:text-lg">⚾</span>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wider">
                Líderes de Pitcheo
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-[#070B19] px-2 py-0.5 rounded border border-[#1E2B4D]">
              Ordenados por ERA (mín. 5 IP)
            </span>
          </div>

          <div className="overflow-x-auto scrollbar-none mb-4">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1E2B4D] text-slate-400">
                  <th className="py-2 px-2">Lanzador</th>
                  <th className="py-2 px-2 text-center">ERA</th>
                  <th className="py-2 px-2 text-center">WHIP</th>
                  <th className="py-2 px-2 text-center">IP</th>
                  <th className="py-2 px-2 text-center">SO</th>
                  <th className="py-2 px-2 text-right">BB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2B4D]/50 text-slate-200">
                {pitchers.map((p, idx) => (
                  <tr
                    key={p.playerId || idx}
                    className={`hover:bg-[#131E3D]/40 transition-colors ${
                      idx === 0 ? "bg-[#FDB827]/10" : ""
                    }`}
                  >
                    <td className="py-2 px-2 flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-[#070B19] border border-[#1E2B4D] overflow-hidden relative shrink-0">
                        <Image
                          src={p.avatarUrl}
                          alt={p.playerName}
                          width={28}
                          height={28}
                          className="object-cover"
                        />
                      </div>
                      <span className="font-semibold text-slate-100 truncate max-w-[130px]">
                        {p.playerName}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-emerald-400">{p.era}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{p.whip}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{p.ip}</td>
                    <td className="py-2 px-2 text-center font-bold text-[#FDB827]">{p.so}</td>
                    <td className="py-2 px-2 text-right text-slate-400">{p.bb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {topPitcher && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-[#131E3D] to-[#0D152B] border-l-4 border-[#FDB827] flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[#FDB827]" />
              <span className="font-bold text-[#FDB827]">👑 Líder ERA:</span>
              <span className="text-slate-100 font-semibold">{topPitcher.playerName}</span>
            </div>
            <span className="font-mono font-bold text-emerald-400">{topPitcher.era} ERA</span>
          </div>
        )}
      </div>
    </div>
  );
}
