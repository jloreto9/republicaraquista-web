"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FieldingStats } from "@/types/sports";
import { ArrowUpDown, Search, Zap } from "lucide-react";
import { getMlbFallbackHeadshotUrl } from "@/lib/constants";

interface FieldingTableProps {
  stats: FieldingStats[];
  onSelectPlayerForSplits?: (playerId: number) => void;
}

type SortField = keyof FieldingStats;

const POSITION_FILTERS = [
  { id: "ALL", label: "Todas" },
  { id: "C", label: "C" },
  { id: "1B", label: "1B" },
  { id: "2B", label: "2B" },
  { id: "3B", label: "3B" },
  { id: "SS", label: "SS" },
  { id: "IF", label: "Infield" },
  { id: "LF", label: "LF" },
  { id: "CF", label: "CF" },
  { id: "RF", label: "RF" },
  { id: "OF", label: "Outfield" },
  { id: "P", label: "P" },
];

const INFIELD_POSITIONS = new Set(["1B", "2B", "3B", "SS"]);
const OUTFIELD_POSITIONS = new Set(["LF", "CF", "RF", "OF"]);

export function FieldingTable({
  stats,
  onSelectPlayerForSplits,
}: FieldingTableProps) {
  const [positionFilter, setPositionFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("totalChances");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const isCatcherView = positionFilter === "C";

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "errors");
    }
  };

  const filteredStats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (stats || []).filter((row) => {
      if (positionFilter === "IF") {
        if (!INFIELD_POSITIONS.has(row.position)) return false;
      } else if (positionFilter === "OF") {
        if (!OUTFIELD_POSITIONS.has(row.position)) return false;
      } else if (positionFilter !== "ALL") {
        if (row.position !== positionFilter) return false;
      }

      if (q && !row.playerName.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [stats, positionFilter, searchQuery]);

  const sortedStats = useMemo(() => {
    return [...filteredStats].sort((a, b) => {
      let valA: unknown = a[sortField];
      let valB: unknown = b[sortField];

      if (sortField === "innings") {
        valA = a.inningsDecimal ?? 0;
        valB = b.inningsDecimal ?? 0;
      }

      if (typeof valA === "number" && typeof valB === "number") {
        if (valA !== valB) return sortAsc ? valA - valB : valB - valA;
        return b.totalChances - a.totalChances;
      }
      if (valA === undefined || valB === undefined) {
        const numA = Number(valA ?? 0);
        const numB = Number(valB ?? 0);
        if (numA !== numB) return sortAsc ? numA - numB : numB - numA;
        return b.totalChances - a.totalChances;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredStats, sortField, sortAsc]);

  if (!stats || stats.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-slate-400 text-xs">
        No se encontraron registros de fildeo con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Barra de filtros por posición y búsqueda rápida */}
      <div className="p-3 rounded-xl bg-[#0D152B] border border-[#1E2B4D] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {POSITION_FILTERS.map((pos) => {
            const active = positionFilter === pos.id;
            return (
              <button
                key={pos.id}
                type="button"
                onClick={() => setPositionFilter(pos.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                  active
                    ? "bg-[#FDB827] text-[#070B19] font-bold"
                    : "bg-[#070B19] text-slate-300 hover:text-slate-100 border border-[#1E2B4D]"
                }`}
              >
                {pos.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar defensor por nombre..."
            className="w-full bg-[#070B19] text-xs text-slate-100 placeholder:text-slate-400 border border-[#1E2B4D] rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#FDB827]"
          />
        </div>
      </div>

      {sortedStats.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-slate-300 text-xs space-y-2">
          <p>No hay jugadores que coincidan con la posición o búsqueda actual.</p>
          <button
            type="button"
            onClick={() => {
              setPositionFilter("ALL");
              setSearchQuery("");
            }}
            className="px-3 py-1.5 rounded-lg bg-[#1E2B4D] hover:bg-[#FDB827] text-[#FDB827] hover:text-[#070B19] text-xs font-semibold transition-colors"
          >
            Restablecer filtro de posición
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[820px]">
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
                    onClick={() => handleSort("position")}
                    className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
                  >
                    POS
                  </th>
                  <th
                    onClick={() => handleSort("games")}
                    className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
                    title="Juegos Jugados a la Defensiva"
                  >
                    JJ
                  </th>
                  <th
                    onClick={() => handleSort("gamesStarted")}
                    className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
                    title="Juegos Iniciados en la Posición"
                  >
                    JI
                  </th>
                  <th
                    onClick={() => handleSort("innings")}
                    className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200"
                    title="Entradas Jugadas en la Posición"
                  >
                    INN
                  </th>
                  <th
                    onClick={() => handleSort("totalChances")}
                    className="py-3 px-2.5 text-center cursor-pointer hover:text-[#FDB827] font-bold text-[#FDB827]"
                    title="Lances Totales (PO + A + E)"
                  >
                    TC
                  </th>
                  <th
                    onClick={() => handleSort("putouts")}
                    className="py-3 px-2 text-center cursor-pointer hover:text-slate-200 font-semibold text-slate-200"
                    title="Outs Realizados (Putouts)"
                  >
                    PO
                  </th>
                  <th
                    onClick={() => handleSort("assists")}
                    className="py-3 px-2 text-center cursor-pointer hover:text-slate-200 font-semibold text-slate-200"
                    title="Asistencias"
                  >
                    A
                  </th>
                  <th
                    onClick={() => handleSort("errors")}
                    className="py-3 px-2 text-center cursor-pointer hover:text-rose-300 text-rose-400"
                    title="Errores Cometidos"
                  >
                    E
                  </th>
                  <th
                    onClick={() => handleSort("doublePlays")}
                    className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
                    title="Doble Plays Participados"
                  >
                    DP
                  </th>
                  <th
                    onClick={() => handleSort("fieldingPct")}
                    className="py-3 px-3 text-center cursor-pointer hover:text-sky-300 text-sky-400 font-bold"
                    title="Porcentaje de Fildeo ((PO + A) / TC)"
                  >
                    FPCT
                  </th>
                  <th
                    onClick={() => handleSort("rangeFactorPer9")}
                    className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200 text-slate-300"
                    title="Factor de Alcance por 9 Entradas"
                  >
                    RF/9
                  </th>
                  {isCatcherView && (
                    <>
                      <th
                        onClick={() => handleSort("caughtStealing")}
                        className="py-3 px-2 text-center cursor-pointer hover:text-[#FDB827] text-[#FDB827]"
                        title="Corredores Atrapados Robando"
                      >
                        CS
                      </th>
                      <th
                        onClick={() => handleSort("stolenBases")}
                        className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
                        title="Bases Robadas Permitidas"
                      >
                        SB
                      </th>
                      <th
                        onClick={() => handleSort("caughtStealingPct")}
                        className="py-3 px-2.5 text-center cursor-pointer hover:text-sky-300 text-sky-400 font-semibold"
                        title="Porcentaje de Atrapados Robando"
                      >
                        CS%
                      </th>
                      <th
                        onClick={() => handleSort("passedBalls")}
                        className="py-3 px-2 text-center cursor-pointer hover:text-slate-200"
                        title="Passed Balls"
                      >
                        PB
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2B4D]/50 font-mono">
                {sortedStats.map((player, idx) => {
                  const isCaracas = player.teamId === 695;
                  return (
                    <tr
                      key={`${player.playerId}-${player.teamId}-${player.position}`}
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
                                if (
                                  target.src !== mlbFallback &&
                                  !target.src.includes("mlbstatic.com")
                                ) {
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
                                type="button"
                                onClick={() => onSelectPlayerForSplits(player.playerId)}
                                title={`Ver splits de ${player.playerName}`}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#070B19] hover:bg-[#FDB827] text-slate-400 hover:text-[#070B19] border border-[#1E2B4D] transition-colors"
                              >
                                <Zap className="w-2.5 h-2.5" />
                                <span>Splits</span>
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
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-[#070B19] text-[#FDB827] text-[10px] font-bold border border-[#1E2B4D]">
                          {player.position}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">{player.games}</td>
                      <td className="py-2.5 px-2 text-center">{player.gamesStarted ?? 0}</td>
                      <td className="py-2.5 px-2.5 text-center">{player.innings ?? "0.0"}</td>
                      <td className="py-2.5 px-2.5 text-center font-bold text-[#FDB827]">
                        {player.totalChances}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-100">
                        {player.putouts}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-100">
                        {player.assists}
                      </td>
                      <td className="py-2.5 px-2 text-center text-rose-400 font-semibold">
                        {player.errors}
                      </td>
                      <td className="py-2.5 px-2 text-center">{player.doublePlays}</td>
                      <td className="py-2.5 px-3 text-center text-sky-400 font-bold">
                        {player.fieldingPct.toFixed(3).replace(/^0/, "")}
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        {(player.rangeFactorPer9 ?? 0).toFixed(2)}
                      </td>
                      {isCatcherView && (
                        <>
                          <td className="py-2.5 px-2 text-center text-[#FDB827] font-bold">
                            {player.caughtStealing ?? 0}
                          </td>
                          <td className="py-2.5 px-2 text-center">{player.stolenBases ?? 0}</td>
                          <td className="py-2.5 px-2.5 text-center text-sky-400 font-semibold">
                            {(player.caughtStealingPct ?? 0).toFixed(3).replace(/^0/, "")}
                          </td>
                          <td className="py-2.5 px-2 text-center">{player.passedBalls ?? 0}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
