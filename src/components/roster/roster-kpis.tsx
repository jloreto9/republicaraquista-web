"use client";

import React from "react";
import { Users, Shield, Globe, Award } from "lucide-react";
import { WeeklyRosterMeta, RosterPlayer } from "@/data/roster-data";

interface RosterKpisProps {
  meta: WeeklyRosterMeta;
  players: RosterPlayer[];
}

export function RosterKpis({ meta, players }: RosterKpisProps) {
  const totalPitchers = players.filter((p) => p.positionCategory === "pitcher").length;
  const totalCatchers = players.filter((p) => p.positionCategory === "catcher").length;
  const totalInfielders = players.filter((p) => p.positionCategory === "infielder").length;
  const totalOutfielders = players.filter(
    (p) => p.positionCategory === "outfielder" || p.positionCategory === "utility"
  ).length;

  const criollos = players.filter((p) => p.origin === "criollo").length;
  const importados = players.filter((p) => p.origin === "importado").length;
  const rhp = players.filter((p) => p.positionCategory === "pitcher" && p.batsThrows.endsWith("D")).length;
  const lhp = players.filter((p) => p.positionCategory === "pitcher" && p.batsThrows.endsWith("Z")).length;
  const mlbCount = players.filter((p) => p.level === "MLB").length;
  const aaaCount = players.filter((p) => p.level === "AAA").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Plazas Habilitadas */}
      <div className="p-3.5 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-mono font-medium uppercase tracking-wider">
            Plazas Semanales
          </span>
          <Users className="w-4 h-4 text-[#FDB827]" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-slate-100 font-mono">
            {meta.totalActive}
          </span>
          <span className="text-xs text-slate-400 font-mono">/ {meta.maxLimit}</span>
          <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            COMPLETO
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 truncate">
          Semana {meta.weekNumber} · {meta.officialDate}
        </p>
      </div>

      {/* 2. Origen: Criollos vs Importados */}
      <div className="p-3.5 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-mono font-medium uppercase tracking-wider">
            Origen Plantilla
          </span>
          <Globe className="w-4 h-4 text-sky-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-black text-slate-100 font-mono">{criollos}</span>
            <span className="text-[10px] text-slate-400 ml-1">Criollos</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-[#FDB827] font-mono">{importados}</span>
            <span className="text-[10px] text-[#FDB827]/80 ml-1">Importados</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Cuota de extranjeros al 100% (8 permitidos)
        </p>
      </div>

      {/* 3. Staff Monticular: RHP vs LHP */}
      <div className="p-3.5 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-mono font-medium uppercase tracking-wider">
            Cuerpo de Pitcheo
          </span>
          <Shield className="w-4 h-4 text-[#FDB827]" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-black text-slate-100 font-mono">{totalPitchers}</span>
            <span className="text-[10px] text-slate-400 ml-1">Pitchers</span>
          </div>
          <div className="text-right text-[11px] font-mono text-slate-300">
            <span className="text-slate-100 font-bold">{rhp}</span> RHP ·{" "}
            <span className="text-[#FDB827] font-bold">{lhp}</span> LHP
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          {totalCatchers} C · {totalInfielders} IF · {totalOutfielders} OF/UT
        </p>
      </div>

      {/* 4. Jerarquía y Nivel */}
      <div className="p-3.5 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-mono font-medium uppercase tracking-wider">
            Experiencia y Nivel
          </span>
          <Award className="w-4 h-4 text-purple-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-black text-slate-100 font-mono">{mlbCount}</span>
            <span className="text-[10px] text-slate-400">MLB</span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-black text-[#FDB827] font-mono">{aaaCount}</span>
            <span className="text-[10px] text-slate-400">AAA</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 truncate">
          Sosa, Arias, Kent en róster activo
        </p>
      </div>
    </div>
  );
}
