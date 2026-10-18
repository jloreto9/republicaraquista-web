"use client";

import React, { useState, useMemo } from "react";
import { Search, ShieldAlert, CheckCircle2 } from "lucide-react";
import {
  RosterPlayer,
  LEONES_WEEKLY_ROSTER,
  LEONES_RESERVE_PLAYERS,
} from "@/data/roster-data";
import { cn } from "@/lib/utils";
import { getPlayerHeadshotUrl } from "@/lib/constants";

export function ExtendedRosterTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const allPlayers = useMemo(() => {
    return [...LEONES_WEEKLY_ROSTER, ...LEONES_RESERVE_PLAYERS];
  }, []);

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter((player) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = player.name.toLowerCase().includes(query);
        const matchesPos = player.position.toLowerCase().includes(query);
        const matchesLevel = player.level.toLowerCase().includes(query);
        if (!matchesName && !matchesPos && !matchesLevel) return false;
      }

      if (statusFilter === "active" && !player.isWeeklyActive) return false;
      if (statusFilter === "reserve" && player.isWeeklyActive) return false;

      return true;
    });
  }, [allPlayers, searchQuery, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-3 rounded-2xl bg-[#0D152B]/60 border border-[#1E2B4D]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en el plantel general..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#FDB827]/50"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { id: "all", label: `Todos (${allPlayers.length})` },
            { id: "active", label: `Activos (34)` },
            { id: "reserve", label: `En Reserva (${LEONES_RESERVE_PLAYERS.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                statusFilter === tab.id
                  ? "bg-[#FDB827] text-[#070B19] font-bold shadow-[0_0_10px_rgba(253,184,39,0.25)]"
                  : "bg-[#070B19] text-slate-300 hover:text-slate-100 border border-[#1E2B4D]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Peloteros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPlayers.map((player) => (
          <div
            key={`ext-${player.name}-${player.number}`}
            className={cn(
              "p-3.5 rounded-xl border transition-all flex items-center justify-between",
              player.isWeeklyActive
                ? "bg-[#0D152B]/70 border-[#1E2B4D] hover:border-[#FDB827]/40"
                : "bg-[#070B19]/80 border-[#1E2B4D]/50 opacity-80 hover:opacity-100"
            )}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#070B19] border border-[#1E2B4D] shrink-0">
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
                  <span>{player.level}</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 text-right ml-2">
              {player.isWeeklyActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-2.5 h-2.5" /> 34 ACTIVO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  RESERVA
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
