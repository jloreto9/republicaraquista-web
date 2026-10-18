"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Search, Filter, FileText, Download, UserCheck } from "lucide-react";
import { RosterPlayer, PlayerPositionCategory, PlayerOrigin } from "@/data/roster-data";
import { cn } from "@/lib/utils";
import { getPlayerHeadshotUrl } from "@/lib/constants";

interface WeeklyRosterTabProps {
  players: RosterPlayer[];
  onOpenPdf: () => void;
}

export function WeeklyRosterTab({ players, onOpenPdf }: WeeklyRosterTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = player.name.toLowerCase().includes(query);
        const matchesNumber = player.number.toString().includes(query);
        const matchesPlace = player.birthPlace.toLowerCase().includes(query);
        const matchesLevel = player.level.toLowerCase().includes(query);
        if (!matchesName && !matchesNumber && !matchesPlace && !matchesLevel) {
          return false;
        }
      }

      // Filtro de posición
      if (positionFilter !== "all") {
        if (positionFilter === "outfielder") {
          if (
            player.positionCategory !== "outfielder" &&
            player.positionCategory !== "utility"
          ) {
            return false;
          }
        } else if (player.positionCategory !== positionFilter) {
          return false;
        }
      }

      // Filtro de origen
      if (originFilter !== "all" && player.origin !== originFilter) {
        return false;
      }

      return true;
    });
  }, [players, searchQuery, positionFilter, originFilter]);

  return (
    <div className="space-y-4">
      {/* ── Barra de Controles y Filtros ── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3 rounded-2xl bg-[#0D152B]/60 border border-[#1E2B4D]">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar jugador, número, ciudad, nivel..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#FDB827]/50"
          />
        </div>

        {/* Botones de Filtro por Posición */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "Todos (34)" },
            { id: "pitcher", label: "Lanzadores (21)" },
            { id: "catcher", label: "Receptores (2)" },
            { id: "infielder", label: "Infielders (6)" },
            { id: "outfielder", label: "Outfield/UT (5)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPositionFilter(tab.id)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                positionFilter === tab.id
                  ? "bg-[#FDB827] text-[#070B19] font-bold shadow-[0_0_10px_rgba(253,184,39,0.25)]"
                  : "bg-[#070B19] text-slate-300 hover:text-slate-100 border border-[#1E2B4D]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filtro Origen + Botón PDF */}
        <div className="flex items-center gap-2">
          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-xs text-slate-300 focus:outline-none focus:border-[#FDB827]/50"
          >
            <option value="all">Todo Origen</option>
            <option value="criollo">Criollos (26)</option>
            <option value="importado">Importados (8)</option>
          </select>

          <button
            onClick={onOpenPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2B4D] hover:bg-[#253660] text-slate-100 text-xs font-semibold border border-[#FDB827]/30 transition-colors"
            title="Ver boletín oficial en PDF"
          >
            <FileText className="w-3.5 h-3.5 text-[#FDB827]" />
            <span className="hidden sm:inline">Boletín</span> PDF
          </button>
        </div>
      </div>

      {/* ── Tabla Desktop (md+) ── */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#1E2B4D] bg-[#0D152B]/40">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#1E2B4D] bg-[#070B19]/80 text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
              <th className="py-3 px-3 w-12 text-center">#</th>
              <th className="py-3 px-3 w-12">Foto</th>
              <th className="py-3 px-4">Pelotero</th>
              <th className="py-3 px-3 text-center">Pos</th>
              <th className="py-3 px-3 text-center">B/L</th>
              <th className="py-3 px-3 text-center">Talla</th>
              <th className="py-3 px-3 text-center">Peso</th>
              <th className="py-3 px-3 text-center">Edad</th>
              <th className="py-3 px-4">Lugar de Nacimiento</th>
              <th className="py-3 px-3 text-center">Nivel</th>
              <th className="py-3 px-3 text-center">Origen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2B4D]/60">
            {filteredPlayers.map((player) => (
              <tr
                key={`${player.number}-${player.name}`}
                className="hover:bg-[#1E2B4D]/30 transition-colors group"
              >
                {/* Número */}
                <td className="py-2.5 px-3 text-center font-mono font-bold text-[#FDB827]">
                  {player.number}
                </td>

                {/* Avatar / Foto */}
                <td className="py-2.5 px-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#070B19] border border-[#1E2B4D] flex items-center justify-center shrink-0">
                    <img
                      src={
                        player.mlbId
                          ? getPlayerHeadshotUrl(player.mlbId)
                          : "https://cdn.tujonron.net/public_photos/no_picture.png"
                      }
                      alt={player.name}
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://cdn.tujonron.net/public_photos/no_picture.png";
                      }}
                    />
                  </div>
                </td>

                {/* Nombre */}
                <td className="py-2.5 px-4 font-semibold text-slate-100 group-hover:text-[#FDB827] transition-colors">
                  {player.name}
                </td>

                {/* Posición */}
                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-300">
                  {player.position}
                </td>

                {/* Batea / Lanza */}
                <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                  {player.batsThrows}
                </td>

                {/* Talla */}
                <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                  {player.height}
                </td>

                {/* Peso */}
                <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                  {player.weight}
                </td>

                {/* Edad */}
                <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                  {player.age}
                </td>

                {/* Lugar Nacimiento */}
                <td className="py-2.5 px-4 text-slate-400 truncate max-w-[200px]">
                  {player.birthPlace}
                </td>

                {/* Nivel */}
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold",
                      player.level === "MLB"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                        : player.level === "AAA"
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        : player.level.includes("A")
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-slate-800 text-slate-400"
                    )}
                  >
                    {player.level}
                  </span>
                </td>

                {/* Origen */}
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase",
                      player.origin === "importado"
                        ? "bg-[#FDB827]/15 text-[#FDB827] border border-[#FDB827]/40"
                        : "bg-slate-800 text-slate-300 border border-slate-700"
                    )}
                  >
                    {player.origin}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Cuadrícula Móvil (< md) ── */}
      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredPlayers.map((player) => (
          <div
            key={`mob-${player.number}-${player.name}`}
            className="p-3 rounded-xl bg-[#0D152B]/70 border border-[#1E2B4D] flex items-center justify-between"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#070B19] border border-[#1E2B4D] shrink-0">
                <img
                  src={
                    player.mlbId
                      ? getPlayerHeadshotUrl(player.mlbId)
                      : "https://cdn.tujonron.net/public_photos/no_picture.png"
                  }
                  alt={player.name}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://cdn.tujonron.net/public_photos/no_picture.png";
                  }}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-100 truncate">
                    {player.name}
                  </span>
                  <span className="font-mono text-[10px] text-[#FDB827] font-bold shrink-0">
                    #{player.number}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                  <span>{player.position}</span>
                  <span>•</span>
                  <span>{player.batsThrows}</span>
                  <span>•</span>
                  <span>{player.age}a</span>
                  <span>•</span>
                  <span>{player.level}</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 text-right ml-2">
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase",
                  player.origin === "importado"
                    ? "bg-[#FDB827]/15 text-[#FDB827] border border-[#FDB827]/40"
                    : "bg-slate-800 text-slate-300 border border-slate-700"
                )}
              >
                {player.origin}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredPlayers.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-[#0D152B]/40 border border-[#1E2B4D] text-slate-400 text-xs">
          No se encontraron peloteros con los filtros seleccionados.
        </div>
      )}
    </div>
  );
}
