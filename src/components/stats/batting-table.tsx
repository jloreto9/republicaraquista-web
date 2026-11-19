"use client";

import { useState } from "react";
import Image from "next/image";
import { BattingStats } from "@/types/sports";
import { ArrowUpDown } from "lucide-react";
import { getMlbFallbackHeadshotUrl } from "@/lib/constants";

interface BattingTableProps {
  stats: BattingStats[];
  onSelectPlayerForSplits?: (playerId: number) => void;
}

type SortField = keyof BattingStats;
type ColumnView = "all" | "traditional" | "advanced";

const COLUMN_VIEW_OPTIONS: Array<{ id: ColumnView; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "traditional", label: "Tradicionales" },
  { id: "advanced", label: "Avanzadas & Stats+" },
];

const BATTING_PLUS_COLUMNS: Array<{
  field: "avgPlus" | "obpPlus" | "slgPlus" | "opsPlus" | "wobaPlus" | "wrcPlus";
  label: string;
  title: string;
}> = [
  {
    field: "avgPlus",
    label: "AVG+",
    title: "Índice ajustado de Promedio de Bateo (100 = Promedio LVBP)",
  },
  {
    field: "obpPlus",
    label: "OBP+",
    title: "Índice ajustado de Embasado (100 = Promedio LVBP)",
  },
  {
    field: "slgPlus",
    label: "SLG+",
    title: "Índice ajustado de Slugging (100 = Promedio LVBP)",
  },
  {
    field: "opsPlus",
    label: "OPS+",
    title: "Índice ajustado de OPS (100 = Promedio LVBP)",
  },
  {
    field: "wobaPlus",
    label: "wOBA+",
    title: "Índice ajustado de wOBA (100 = Promedio LVBP)",
  },
  {
    field: "wrcPlus",
    label: "wRC+",
    title: "Carreras Creadas Ponderadas Ajustadas (100 = Promedio LVBP)",
  },
];

function formatRate3NoZero(val?: number): string {
  if (typeof val !== "number" || !Number.isFinite(val)) return "--";
  return val.toFixed(3).replace(/^0(?=\.)/, "");
}

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

export function BattingTable({ stats, onSelectPlayerForSplits }: BattingTableProps) {
  const [sortField, setSortField] = useState<SortField>("ops");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [columnView, setColumnView] = useState<ColumnView>("all");

  const showTraditional = columnView === "all" || columnView === "traditional";
  const showAdvanced = columnView === "all" || columnView === "advanced";

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default desc para stats
    }
  };

  const sortedStats = [...stats].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === "plateAppearances") {
      valA = a.plateAppearances ?? a.pa ?? (a.atBats + a.walks);
      valB = b.plateAppearances ?? b.pa ?? (b.atBats + b.walks);
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
        No se encontraron registros de bateo con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden">
      <div className="px-3.5 py-2.5 bg-[#070B19]/80 border-b border-[#1E2B4D] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div
          role="group"
          aria-label="Vista de columnas de bateo"
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
            columnView === "all" ? "min-w-[1180px]" : "min-w-[780px]"
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
                onClick={() => handleSort("plateAppearances")}
                className="py-3 px-2.5 text-center cursor-pointer hover:text-[#FDB827] font-semibold text-slate-200"
                title="Apariciones al Plato (VB + BB + HBP + SF + SH)"
              >
                AP
              </th>
              {showTraditional && (
                <>
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
                    onClick={() => handleSort("gidp")}
                    className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
                    title="Bateo para Doble Play (GIDP)"
                  >
                    GIDP
                  </th>
                  <th
                    onClick={() => handleSort("stolenBases")}
                    className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
                  >
                    BR
                  </th>
                </>
              )}
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
              {showAdvanced && (
                <>
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
                  <th
                    onClick={() => handleSort("woba")}
                    className="py-3 px-2.5 text-center cursor-pointer hover:text-sky-300 text-sky-300 font-semibold"
                    title="Promedio Ponderado en Base (wOBA, constantes LVBP 2025-2026)"
                  >
                    wOBA
                  </th>
                  {BATTING_PLUS_COLUMNS.map((col) => (
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
                          onError={(e) => {
                            const target = e.currentTarget;
                            const mlbFallback = getMlbFallbackHeadshotUrl(player.playerId);
                            if (target.src !== mlbFallback && !target.src.includes("mlbstatic.com")) {
                              target.src = mlbFallback;
                            } else if (target.src !== player.teamLogo) {
                              target.src = player.teamLogo;
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className={isCaracas ? "text-[#FDB827]" : "text-slate-100"}>
                          {player.playerName}
                        </span>
                        {onSelectPlayerForSplits && (
                          <button
                            onClick={() => onSelectPlayerForSplits(player.playerId)}
                            title={`Ver splits de ${player.playerName}`}
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
                  <td className="py-2.5 px-2.5 text-center font-semibold text-slate-100">
                    {player.plateAppearances ?? player.pa ?? (player.atBats + player.walks)}
                  </td>
                  {showTraditional && (
                    <>
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
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {player.gidp ?? 0}
                      </td>
                      <td className="py-2.5 px-2 text-center text-emerald-400">
                        {player.stolenBases}
                      </td>
                    </>
                  )}
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
                  {showAdvanced && (
                    <>
                      <td className="py-2.5 px-2.5 text-center text-slate-400">
                        {player.iso.toFixed(3).replace(/^0+/, "")}
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-slate-400">
                        {player.babip.toFixed(3).replace(/^0+/, "")}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-semibold text-sky-300">
                        {typeof player.woba === "number" && Number.isFinite(player.woba) ? (
                          formatRate3NoZero(player.woba)
                        ) : (
                          <span className="text-slate-500">--</span>
                        )}
                      </td>
                      {BATTING_PLUS_COLUMNS.map((col) => (
                        <td key={col.field} className="py-2.5 px-2 text-center">
                          <PlusStatBadge value={player[col.field]} />
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
