"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PitchingStats } from "@/types/sports";
import { ArrowUpDown } from "lucide-react";
import { getMlbFallbackHeadshotUrl } from "@/lib/constants";

interface PitchingTableProps {
  stats: PitchingStats[];
  onSelectPlayerForSplits?: (playerId: number) => void;
}

type SortField = keyof PitchingStats;
type ColumnView = "all" | "traditional" | "advanced";

const COLUMN_VIEW_OPTIONS: Array<{ id: ColumnView; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "traditional", label: "Tradicionales" },
  { id: "advanced", label: "Avanzadas & Stats+" },
];

const PITCHING_PLUS_COLUMNS: Array<{
  field: "eraPlus" | "whipPlus" | "fipPlus";
  label: string;
  title: string;
}> = [
  {
    field: "eraPlus",
    label: "ERA+",
    title: "Índice ajustado de Efectividad (>100 es mejor, 100 = Promedio LVBP)",
  },
  {
    field: "whipPlus",
    label: "WHIP+",
    title: "Índice ajustado de WHIP (>100 es mejor, 100 = Promedio LVBP)",
  },
  {
    field: "fipPlus",
    label: "FIP+",
    title: "Índice ajustado de FIP (>100 es mejor, 100 = Promedio LVBP)",
  },
];

function getPlusBadgeClass(value: number): string {
  if (value >= 130) {
    return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold";
  }
  if (value >= 110) {
    return "bg-[#FDB827]/15 text-[#FDB827] border-[#FDB827]/35 font-semibold";
  }
  if (value >= 91) {
    return "bg-slate-800/80 text-slate-200 border-slate-700";
  }
  return "bg-rose-500/15 text-rose-300 border-rose-500/30";
}

function PlusStatBadge({ value }: { value?: number }) {
  const rounded =
    typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
  if (rounded <= 0) {
    return <span className="text-slate-500 font-mono">--</span>;
  }
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[2.25rem] px-1.5 py-0.5 rounded border text-[11px] font-mono tabular-nums ${getPlusBadgeClass(
        rounded
      )}`}
    >
      {rounded}
    </span>
  );
}

export function PitchingTable({ stats, onSelectPlayerForSplits }: PitchingTableProps) {
  const [sortField, setSortField] = useState<SortField>("era");
  const [sortAsc, setSortAsc] = useState<boolean>(true); // Menor ERA es mejor
  const [columnView, setColumnView] = useState<ColumnView>("all");

  const showTraditional = columnView === "all" || columnView === "traditional";
  const showAdvanced = columnView === "all" || columnView === "advanced";

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // Para ERA, WHIP y FIP, menor es mejor (ascendente)
      setSortAsc(field === "era" || field === "whip" || field === "fip");
    }
  };

  const sortedStats = [...stats].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === "inningsDisplay") {
      valA = a.inningsPitched;
      valB = b.inningsPitched;
    }

    if (typeof valA === "string" || typeof valB === "string") {
      return sortAsc
        ? String(valA ?? "").localeCompare(String(valB ?? ""))
        : String(valB ?? "").localeCompare(String(valA ?? ""));
    }

    const numA = Number(valA ?? 0);
    const numB = Number(valB ?? 0);
    const safeA = Number.isFinite(numA) ? numA : 0;
    const safeB = Number.isFinite(numB) ? numB : 0;
    return sortAsc ? safeA - safeB : safeB - safeA;
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
      <div className="px-3.5 py-2.5 bg-[#070B19]/80 border-b border-[#1E2B4D] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div
          role="group"
          aria-label="Vista de columnas de pitcheo"
          className="inline-flex flex-wrap items-center gap-1 bg-[#0D152B] p-1 rounded-lg border border-[#1E2B4D] self-start"
        >
          {COLUMN_VIEW_OPTIONS.map((option) => {
            const active = columnView === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setColumnView(option.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827] ${
                  active
                    ? "bg-[#FDB827] text-[#070B19] font-bold"
                    : "text-slate-300 hover:text-slate-100 hover:bg-[#131E3D]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
          <span className="text-slate-300 font-semibold mr-1">
            100 = Promedio LVBP
          </span>
          <span className="px-1.5 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold">
            ≥130 Élite
          </span>
          <span className="px-1.5 py-0.5 rounded border bg-[#FDB827]/15 text-[#FDB827] border-[#FDB827]/35 font-semibold">
            110–129 Sobre prom.
          </span>
          <span className="px-1.5 py-0.5 rounded border bg-slate-800/80 text-slate-200 border-slate-700">
            91–109 Promedio
          </span>
          <span className="px-1.5 py-0.5 rounded border bg-rose-500/15 text-rose-300 border-rose-500/30">
            1–90 Bajo prom.
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table
          className={`w-full text-left text-xs ${
            columnView === "all" ? "min-w-[980px]" : "min-w-[760px]"
          }`}
        >
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
              {showTraditional && (
                <>
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
                    onClick={() => handleSort("gidp")}
                    className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
                    title="Doble Plays Inducidos (GIDP)"
                  >
                    GIDP
                  </th>
                </>
              )}
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
              {showAdvanced && (
                <>
                  <th
                    onClick={() => handleSort("fip")}
                    className={`py-3 px-2.5 text-center cursor-pointer hover:text-sky-300 font-semibold ${
                      sortField === "fip" ? "text-[#FDB827]" : "text-sky-300"
                    }`}
                    title="Pitcheo Independiente de Fildeo (FIP, ajustado a ERA de la liga)"
                  >
                    FIP
                  </th>
                  {PITCHING_PLUS_COLUMNS.map((col) => (
                    <th
                      key={col.field}
                      onClick={() => handleSort(col.field)}
                      title={col.title}
                      className={`py-3 px-2 text-center cursor-pointer hover:text-[#FDB827] whitespace-nowrap ${
                        sortField === col.field
                          ? "text-[#FDB827] font-bold"
                          : "text-slate-300 font-semibold"
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </>
              )}
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
                            const mlbFallback = getMlbFallbackHeadshotUrl(pitcher.playerId);
                            if (target.src !== mlbFallback && !target.src.includes("mlbstatic.com")) {
                              target.src = mlbFallback;
                            } else if (target.src !== pitcher.teamLogo) {
                              target.src = pitcher.teamLogo;
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Link
                          href="/pitching"
                          title={`Ver Pitching Summary de ${pitcher.playerName}`}
                          className={`hover:underline flex items-center gap-1 group ${
                            isCaracas ? "text-[#FDB827]" : "text-slate-100"
                          }`}
                        >
                          <span>{pitcher.playerName}</span>
                          <span className="text-[10px] text-slate-400 opacity-50 group-hover:opacity-100 group-hover:text-[#FDB827]">
                            ↗
                          </span>
                        </Link>
                        {onSelectPlayerForSplits && (
                          <button
                            onClick={() => onSelectPlayerForSplits(pitcher.playerId)}
                            title={`Ver splits de ${pitcher.playerName}`}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#070B19] hover:bg-[#FDB827] text-slate-400 hover:text-[#070B19] border border-[#1E2B4D] transition-colors"
                          >
                            <span>⚡ Splits</span>
                          </button>
                        )}
                      </div>
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
                  {showTraditional && (
                    <>
                      <td className="py-2.5 px-2 text-center">{pitcher.hits}</td>
                      <td className="py-2.5 px-2 text-center">{pitcher.runs}</td>
                      <td className="py-2.5 px-2 text-center">{pitcher.earnedRuns}</td>
                      <td className="py-2.5 px-2 text-center">{pitcher.walks}</td>
                      <td className="py-2.5 px-2.5 text-center font-bold text-[#FDB827]">
                        {pitcher.strikeouts}
                      </td>
                      <td className="py-2.5 px-2 text-center">{pitcher.homeRuns}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">
                        {pitcher.gidp ?? 0}
                      </td>
                    </>
                  )}
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
                  {showAdvanced && (
                    <>
                      <td className="py-2.5 px-2.5 text-center font-semibold text-sky-300">
                        {typeof pitcher.fip === "number" && Number.isFinite(pitcher.fip) ? (
                          pitcher.fip.toFixed(2)
                        ) : (
                          <span className="text-slate-500">--</span>
                        )}
                      </td>
                      {PITCHING_PLUS_COLUMNS.map((col) => (
                        <td key={col.field} className="py-2.5 px-2 text-center">
                          <PlusStatBadge value={pitcher[col.field]} />
                        </td>
                      ))}
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
