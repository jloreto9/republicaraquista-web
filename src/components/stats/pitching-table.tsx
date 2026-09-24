"use client";

import { useState } from "react";
import Image from "next/image";
import { PitchingStats } from "@/types/sports";
import { ArrowUpDown } from "lucide-react";

interface PitchingTableProps {
  stats: PitchingStats[];
}

type SortField = keyof PitchingStats;

export function PitchingTable({ stats }: PitchingTableProps) {
  const [sortField, setSortField] = useState<SortField>("era");
  const [sortAsc, setSortAsc] = useState<boolean>(true); // Menor ERA es mejor

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // Para ERA y WHIP, menor es mejor (ascendente)
      setSortAsc(field === "era" || field === "whip");
    }
  };

  const sortedStats = [...stats].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === "inningsDisplay") {
      valA = a.inningsPitched;
      valB = b.inningsPitched;
    }

    if (typeof valA === "number" && typeof valB === "number") {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  if (!stats || stats.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-slate-400 text-xs">
        No se encontraron registros de pitcheo con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[760px]">
          <thead>
            <tr className="bg-[#070B19]/70 text-slate-400 font-mono border-b border-[#1E2B4D] text-[11px]">
              <th className="py-3 px-3 text-center w-10">#</th>
              <th
                onClick={() => handleSort("playerName")}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center space-x-1">
                  <span>LANZADOR</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-2 text-center">EQ</th>
              <th
                onClick={() => handleSort("games")}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
              >
                JJ
              </th>
              <th
                onClick={() => handleSort("gamesStarted")}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
              >
                JI
              </th>
              <th
                onClick={() => handleSort("inningsPitched")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200 font-bold text-slate-200"
              >
                IP
              </th>
              <th
                onClick={() => handleSort("hits")}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
              >
                H
              </th>
              <th
                onClick={() => handleSort("runs")}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
              >
                C
              </th>
              <th
                onClick={() => handleSort("earnedRuns")}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
              >
                CL
              </th>
              <th
                onClick={() => handleSort("walks")}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
              >
                BB
              </th>
              <th
                onClick={() => handleSort("strikeouts")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-[#FDB827] font-bold text-[#FDB827]"
              >
                SO
              </th>
              <th
                onClick={() => handleSort("homeRuns")}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
              >
                HR
              </th>
              <th
                onClick={() => handleSort("era")}
                className="py-3 px-3 text-center cursor-pointer hover:text-[#FDB827] font-bold text-[#FDB827]"
              >
                ERA
              </th>
              <th
                onClick={() => handleSort("whip")}
                className="py-3 px-3 text-center cursor-pointer hover:text-sky-300 text-sky-400 font-semibold"
              >
                WHIP
              </th>
              <th
                onClick={() => handleSort("kPer9")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200 text-slate-300"
              >
                K/9
              </th>
              <th
                onClick={() => handleSort("bbPer9")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200 text-slate-300"
              >
                BB/9
              </th>
              <th
                onClick={() => handleSort("kToBb")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200 text-slate-300"
              >
                K/BB
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2B4D]/50 font-mono">
            {sortedStats.map((pitcher, idx) => {
              const isCaracas = pitcher.teamId === 695;

              return (
                <tr
                  key={`${pitcher.playerId}-${pitcher.teamId}`}
                  className={`transition-colors ${
                    isCaracas
                      ? "bg-[#002D62]/30 hover:bg-[#002D62]/45 font-semibold text-slate-100"
                      : "hover:bg-[#131E3D]/50 text-slate-300"
                  }`}
                >
                  <td className="py-2.5 px-3 text-center text-slate-400 text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-4 font-sans font-semibold">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-[#070B19] border border-[#1E2B4D] relative shrink-0">
                        <Image
                          src={pitcher.playerAvatar}
                          alt={pitcher.playerName}
                          width={28}
                          height={28}
                          className="object-cover"
                          unoptimized
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src !== pitcher.teamLogo) {
                              target.src = pitcher.teamLogo;
                            }
                          }}
                        />
                      </div>
                      <span className={isCaracas ? "text-[#FDB827]" : "text-slate-100"}>
                        {pitcher.playerName}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <div className="w-4 h-4 relative shrink-0">
                        <Image
                          src={pitcher.teamLogo}
                          alt={pitcher.teamAbbr}
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {pitcher.teamAbbr}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center">{pitcher.games}</td>
                  <td className="py-2.5 px-2 text-center">{pitcher.gamesStarted}</td>
                  <td className="py-2.5 px-2.5 text-center font-bold text-slate-100">
                    {pitcher.inningsDisplay}
                  </td>
                  <td className="py-2.5 px-2 text-center">{pitcher.hits}</td>
                  <td className="py-2.5 px-2 text-center">{pitcher.runs}</td>
                  <td className="py-2.5 px-2 text-center">{pitcher.earnedRuns}</td>
                  <td className="py-2.5 px-2 text-center">{pitcher.walks}</td>
                  <td className="py-2.5 px-2.5 text-center font-bold text-[#FDB827]">
                    {pitcher.strikeouts}
                  </td>
                  <td className="py-2.5 px-2 text-center">{pitcher.homeRuns}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-[#FDB827]">
                    {pitcher.era.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center text-sky-400 font-semibold">
                    {pitcher.whip.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2.5 text-center text-slate-300">
                    {pitcher.kPer9.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-2.5 text-center text-slate-300">
                    {pitcher.bbPer9.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-2.5 text-center text-slate-300">
                    {pitcher.kToBb.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
