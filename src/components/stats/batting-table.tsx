"use client";

import { useState } from "react";
import Image from "next/image";
import { BattingStats } from "@/types/sports";
import { ArrowUpDown } from "lucide-react";

interface BattingTableProps {
  stats: BattingStats[];
}

type SortField = keyof BattingStats;

export function BattingTable({ stats }: BattingTableProps) {
  const [sortField, setSortField] = useState<SortField>("ops");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default desc para stats
    }
  };

  const sortedStats = [...stats].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
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
        No se encontraron registros de bateo con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[780px]">
          <thead>
            <tr className="bg-[#070B19]/70 text-slate-400 font-mono border-b border-[#1E2B4D] text-[11px]">
              <th className="py-3 px-3 text-center w-10">#</th>
              <th
                onClick={() => handleSort("playerName")}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center space-x-1">
                  <span>JUGADOR</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-2 text-center">EQ</th>
              <th
                onClick={() => handleSort("games")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200"
              >
                JJ
              </th>
              <th
                onClick={() => handleSort("atBats")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200"
              >
                VB
              </th>
              <th
                onClick={() => handleSort("runs")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200"
              >
                CA
              </th>
              <th
                onClick={() => handleSort("hits")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200 font-bold text-slate-200"
              >
                H
              </th>
              <th
                onClick={() => handleSort("doubles")}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
              >
                2B
              </th>
              <th
                onClick={() => handleSort("triples")}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
              >
                3B
              </th>
              <th
                onClick={() => handleSort("homeRuns")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-[#FDB827] font-bold text-[#FDB827]"
              >
                HR
              </th>
              <th
                onClick={() => handleSort("rbi")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200"
              >
                CI
              </th>
              <th
                onClick={() => handleSort("walks")}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
              >
                BB
              </th>
              <th
                onClick={() => handleSort("strikeouts")}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
              >
                SO
              </th>
              <th
                onClick={() => handleSort("stolenBases")}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
              >
                BR
              </th>
              <th
                onClick={() => handleSort("avg")}
                className="py-3 px-3 text-center cursor-pointer hover:text-sky-300 font-semibold text-slate-100"
              >
                AVG
              </th>
              <th
                onClick={() => handleSort("obp")}
                className="py-3 px-3 text-center cursor-pointer hover:text-sky-300 text-sky-400 font-semibold"
              >
                OBP
              </th>
              <th
                onClick={() => handleSort("slg")}
                className="py-3 px-3 text-center cursor-pointer hover:text-sky-300 text-sky-400 font-semibold"
              >
                SLG
              </th>
              <th
                onClick={() => handleSort("ops")}
                className="py-3 px-3 text-center cursor-pointer hover:text-[#FDB827] font-bold text-[#FDB827]"
              >
                OPS
              </th>
              <th
                onClick={() => handleSort("iso")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200 text-slate-400"
              >
                ISO
              </th>
              <th
                onClick={() => handleSort("babip")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200 text-slate-400"
              >
                BABIP
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2B4D]/50 font-mono">
            {sortedStats.map((player, idx) => {
              const isCaracas = player.teamId === 695;

              return (
                <tr
                  key={`${player.playerId}-${player.teamId}`}
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
                          src={player.playerAvatar}
                          alt={player.playerName}
                          width={28}
                          height={28}
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <span className={isCaracas ? "text-[#FDB827]" : "text-slate-100"}>
                        {player.playerName}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <div className="w-4 h-4 relative shrink-0">
                        <Image
                          src={player.teamLogo}
                          alt={player.teamAbbr}
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {player.teamAbbr}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 text-center">{player.games}</td>
                  <td className="py-2.5 px-2.5 text-center">{player.atBats}</td>
                  <td className="py-2.5 px-2.5 text-center">{player.runs}</td>
                  <td className="py-2.5 px-2.5 text-center font-bold text-slate-100">
                    {player.hits}
                  </td>
                  <td className="py-2.5 px-2 text-center">{player.doubles}</td>
                  <td className="py-2.5 px-2 text-center">{player.triples}</td>
                  <td className="py-2.5 px-2.5 text-center font-bold text-[#FDB827]">
                    {player.homeRuns}
                  </td>
                  <td className="py-2.5 px-2.5 text-center">{player.rbi}</td>
                  <td className="py-2.5 px-2 text-center">{player.walks}</td>
                  <td className="py-2.5 px-2 text-center text-slate-400">
                    {player.strikeouts}
                  </td>
                  <td className="py-2.5 px-2 text-center text-emerald-400">
                    {player.stolenBases}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-100">
                    {player.avg.toFixed(3).replace(/^0+/, "")}
                  </td>
                  <td className="py-2.5 px-3 text-center text-sky-400 font-semibold">
                    {player.obp.toFixed(3).replace(/^0+/, "")}
                  </td>
                  <td className="py-2.5 px-3 text-center text-sky-400 font-semibold">
                    {player.slg.toFixed(3).replace(/^0+/, "")}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-[#FDB827]">
                    {player.ops.toFixed(3).replace(/^0+/, "")}
                  </td>
                  <td className="py-2.5 px-2.5 text-center text-slate-400">
                    {player.iso.toFixed(3).replace(/^0+/, "")}
                  </td>
                  <td className="py-2.5 px-2.5 text-center text-slate-400">
                    {player.babip.toFixed(3).replace(/^0+/, "")}
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
