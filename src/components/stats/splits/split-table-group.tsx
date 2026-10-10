"use client";

import React, { useState } from "react";
import { PlayerSplitRow, PitcherSplitRow } from "@/types/player-splits";
import { ArrowUpDown } from "lucide-react";

interface SplitTableGroupProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badgeCount?: number;
  batterRows?: PlayerSplitRow[];
  pitcherRows?: PitcherSplitRow[];
  isPitcher?: boolean;
}

export function SplitTableGroup({
  title,
  subtitle,
  icon,
  badgeCount,
  batterRows = [],
  pitcherRows = [],
  isPitcher = false,
}: SplitTableGroupProps) {
  const [batterSortField, setBatterSortField] = useState<keyof PlayerSplitRow>("opsNum");
  const [pitcherSortField, setPitcherSortField] = useState<keyof PitcherSplitRow>("eraNum");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleBatterSort = (field: keyof PlayerSplitRow) => {
    if (batterSortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setBatterSortField(field);
      setSortAsc(false);
    }
  };

  const handlePitcherSort = (field: keyof PitcherSplitRow) => {
    if (pitcherSortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setPitcherSortField(field);
      setSortAsc(field === "eraNum" || field === "whipNum");
    }
  };

  const sortedBatterRows = [...batterRows].sort((a, b) => {
    const valA = a[batterSortField];
    const valB = b[batterSortField];
    if (typeof valA === "number" && typeof valB === "number") {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const sortedPitcherRows = [...pitcherRows].sort((a, b) => {
    const valA = a[pitcherSortField];
    const valB = b[pitcherSortField];
    if (typeof valA === "number" && typeof valB === "number") {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const isEmpty = isPitcher ? pitcherRows.length === 0 : batterRows.length === 0;

  if (isEmpty) return null;

  return (
    <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden shadow-sm">
      {/* Encabezado del Grupo */}
      <div className="px-4 py-3 bg-[#070B19]/80 border-b border-[#1E2B4D] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          {icon && <div className="text-[#FDB827]">{icon}</div>}
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <span>{title}</span>
              {badgeCount !== undefined && (
                <span className="text-[10px] bg-[#131E3D] text-[#FDB827] px-2 py-0.5 rounded-full border border-[#1E2B4D]">
                  {badgeCount}
                </span>
              )}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabla Desglosada */}
      <div className="overflow-x-auto">
        {!isPitcher ? (
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead>
              <tr className="bg-[#070B19]/50 text-slate-400 font-mono border-b border-[#1E2B4D] text-[10px]">
                <th
                  onClick={() => handleBatterSort("splitName")}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center space-x-1">
                    <span>SPLIT / SITUACIÓN</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleBatterSort("games")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200"
                >
                  J
                </th>
                <th
                  onClick={() => handleBatterSort("pa")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200"
                >
                  PA
                </th>
                <th
                  onClick={() => handleBatterSort("ab")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200"
                >
                  AB
                </th>
                <th
                  onClick={() => handleBatterSort("r")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200"
                >
                  C
                </th>
                <th
                  onClick={() => handleBatterSort("h")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200 font-bold text-slate-200"
                >
                  H
                </th>
                <th
                  onClick={() => handleBatterSort("doubles")}
                  className="py-2.5 px-1.5 text-center cursor-pointer hover:text-slate-200"
                >
                  2B
                </th>
                <th
                  onClick={() => handleBatterSort("triples")}
                  className="py-2.5 px-1.5 text-center cursor-pointer hover:text-slate-200"
                >
                  3B
                </th>
                <th
                  onClick={() => handleBatterSort("hr")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827] font-bold text-[#FDB827]"
                >
                  HR
                </th>
                <th
                  onClick={() => handleBatterSort("rbi")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200"
                >
                  CI
                </th>
                <th
                  onClick={() => handleBatterSort("bb")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200"
                >
                  BB
                </th>
                <th
                  onClick={() => handleBatterSort("so")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200 text-slate-400"
                >
                  SO
                </th>
                <th
                  onClick={() => handleBatterSort("avgNum")}
                  className="py-2.5 px-2.5 text-center cursor-pointer hover:text-sky-300 font-semibold text-slate-100"
                >
                  AVG
                </th>
                <th
                  onClick={() => handleBatterSort("obpNum")}
                  className="py-2.5 px-2.5 text-center cursor-pointer hover:text-sky-300 text-sky-400 font-semibold"
                >
                  OBP
                </th>
                <th
                  onClick={() => handleBatterSort("slgNum")}
                  className="py-2.5 px-2.5 text-center cursor-pointer hover:text-sky-300 text-sky-400 font-semibold"
                >
                  SLG
                </th>
                <th
                  onClick={() => handleBatterSort("opsNum")}
                  className="py-2.5 px-3 text-center cursor-pointer hover:text-[#FDB827] font-bold text-[#FDB827]"
                >
                  OPS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2B4D]/60 font-mono text-[11px]">
              {sortedBatterRows.map((row, idx) => {
                const isHighlight =
                  row.splitName.includes("Total") ||
                  row.splitName.includes("RISP") ||
                  row.splitName.includes("Victorias");

                return (
                  <tr
                    key={`${row.splitName}-${idx}`}
                    className={`hover:bg-[#131E3D]/50 transition-colors ${
                      isHighlight ? "bg-[#131E3D]/30" : ""
                    }`}
                  >
                    <td className="py-2 px-3 font-sans font-medium text-slate-200">
                      <div className="flex items-center space-x-2">
                        <span>{row.splitName}</span>
                        {row.badge && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#070B19] border border-[#1E2B4D] text-[#FDB827]">
                            {row.badge}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center text-slate-400">{row.games ?? "-"}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{row.pa}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{row.ab}</td>
                    <td className="py-2 px-2 text-center text-slate-400">{row.r}</td>
                    <td className="py-2 px-2 text-center font-bold text-slate-100">{row.h}</td>
                    <td className="py-2 px-1.5 text-center text-slate-400">{row.doubles}</td>
                    <td className="py-2 px-1.5 text-center text-slate-400">{row.triples}</td>
                    <td className="py-2 px-2 text-center font-bold text-[#FDB827]">{row.hr}</td>
                    <td className="py-2 px-2 text-center text-slate-200">{row.rbi}</td>
                    <td className="py-2 px-2 text-center text-slate-400">{row.bb}</td>
                    <td className="py-2 px-2 text-center text-slate-400">{row.so}</td>
                    <td className="py-2 px-2.5 text-center font-bold text-slate-100">{row.avg}</td>
                    <td className="py-2 px-2.5 text-center text-sky-400 font-semibold">{row.obp}</td>
                    <td className="py-2 px-2.5 text-center text-sky-400 font-semibold">{row.slg}</td>
                    <td className="py-2 px-3 text-center font-bold text-[#FDB827]">
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          row.opsNum >= 0.900
                            ? "bg-emerald-500/20 text-emerald-400 font-extrabold"
                            : row.opsNum >= 0.750
                            ? "bg-[#FDB827]/20 text-[#FDB827]"
                            : "text-slate-300"
                        }`}
                      >
                        {row.ops}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead>
              <tr className="bg-[#070B19]/50 text-slate-400 font-mono border-b border-[#1E2B4D] text-[10px]">
                <th
                  onClick={() => handlePitcherSort("splitName")}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center space-x-1">
                    <span>SPLIT / SITUACIÓN</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handlePitcherSort("games")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200"
                >
                  J
                </th>
                <th
                  onClick={() => handlePitcherSort("starts")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200"
                >
                  JI
                </th>
                <th
                  onClick={() => handlePitcherSort("ip")}
                  className="py-2.5 px-2.5 text-center cursor-pointer hover:text-slate-200 font-bold text-slate-100"
                >
                  IP
                </th>
                <th
                  onClick={() => handlePitcherSort("h")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200"
                >
                  H
                </th>
                <th
                  onClick={() => handlePitcherSort("r")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200"
                >
                  C
                </th>
                <th
                  onClick={() => handlePitcherSort("er")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200"
                >
                  CL
                </th>
                <th
                  onClick={() => handlePitcherSort("bb")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200"
                >
                  BB
                </th>
                <th
                  onClick={() => handlePitcherSort("so")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827] font-bold text-[#FDB827]"
                >
                  SO
                </th>
                <th
                  onClick={() => handlePitcherSort("hr")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200"
                >
                  HR
                </th>
                <th
                  onClick={() => handlePitcherSort("eraNum")}
                  className="py-2.5 px-3 text-center cursor-pointer hover:text-[#FDB827] font-bold text-[#FDB827]"
                >
                  ERA
                </th>
                <th
                  onClick={() => handlePitcherSort("whipNum")}
                  className="py-2.5 px-2.5 text-center cursor-pointer hover:text-sky-300 text-sky-400 font-semibold"
                >
                  WHIP
                </th>
                <th
                  onClick={() => handlePitcherSort("baa")}
                  className="py-2.5 px-2.5 text-center cursor-pointer hover:text-slate-200 text-slate-300"
                >
                  BAA
                </th>
                <th
                  onClick={() => handlePitcherSort("kPer9")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200 text-slate-400"
                >
                  K/9
                </th>
                <th
                  onClick={() => handlePitcherSort("bbPer9")}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-200 text-slate-400"
                >
                  BB/9
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2B4D]/60 font-mono text-[11px]">
              {sortedPitcherRows.map((row, idx) => {
                const isHighlight =
                  row.splitName.includes("Total") || row.splitName.includes("Victorias");

                return (
                  <tr
                    key={`${row.splitName}-${idx}`}
                    className={`hover:bg-[#131E3D]/50 transition-colors ${
                      isHighlight ? "bg-[#131E3D]/30" : ""
                    }`}
                  >
                    <td className="py-2 px-3 font-sans font-medium text-slate-200">
                      <div className="flex items-center space-x-2">
                        <span>{row.splitName}</span>
                        {row.badge && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#070B19] border border-[#1E2B4D] text-[#FDB827]">
                            {row.badge}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center text-slate-400">{row.games}</td>
                    <td className="py-2 px-2 text-center text-slate-400">{row.starts}</td>
                    <td className="py-2 px-2.5 text-center font-bold text-slate-100">
                      {row.ipDisplay}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-300">{row.h}</td>
                    <td className="py-2 px-2 text-center text-slate-400">{row.r}</td>
                    <td className="py-2 px-2 text-center text-slate-400">{row.er}</td>
                    <td className="py-2 px-2 text-center text-slate-400">{row.bb}</td>
                    <td className="py-2 px-2 text-center font-bold text-[#FDB827]">{row.so}</td>
                    <td className="py-2 px-2 text-center text-slate-400">{row.hr}</td>
                    <td className="py-2 px-3 text-center font-bold text-[#FDB827]">
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          row.eraNum <= 3.00
                            ? "bg-emerald-500/20 text-emerald-400 font-extrabold"
                            : row.eraNum <= 4.50
                            ? "bg-[#FDB827]/20 text-[#FDB827]"
                            : "text-rose-400"
                        }`}
                      >
                        {row.era}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-center text-sky-400 font-semibold">
                      {row.whip}
                    </td>
                    <td className="py-2 px-2.5 text-center text-slate-300">{row.baa}</td>
                    <td className="py-2 px-2 text-center text-slate-400">{row.kPer9}</td>
                    <td className="py-2 px-2 text-center text-slate-400">{row.bbPer9}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
