"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  GameCenterTeam,
  GameCenterBoxscoreBatter,
  GameCenterBoxscorePitcher,
} from "@/types/game-center";
import { Users, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface BoxscoreLineupsTabProps {
  gamePk?: number;
  homeTeam: GameCenterTeam;
  awayTeam: GameCenterTeam;
  awayBatters: GameCenterBoxscoreBatter[];
  homeBatters: GameCenterBoxscoreBatter[];
  awayPitchers: GameCenterBoxscorePitcher[];
  homePitchers: GameCenterBoxscorePitcher[];
}

export function BoxscoreLineupsTab({
  gamePk,
  homeTeam,
  awayTeam,
  awayBatters,
  homeBatters,
  awayPitchers,
  homePitchers,
}: BoxscoreLineupsTabProps) {
  // Por defecto seleccionar Leones del Caracas
  const [selectedTeamId, setSelectedTeamId] = useState<number>(
    homeTeam.isLeones ? homeTeam.id : awayTeam.id
  );

  const [expandedBatterKey, setExpandedBatterKey] = useState<string | null>(null);
  const [expandedPitcherId, setExpandedPitcherId] = useState<number | null>(null);

  const isHomeSelected = selectedTeamId === homeTeam.id;
  const currentTeam = isHomeSelected ? homeTeam : awayTeam;
  const rawBatters = isHomeSelected ? homeBatters : awayBatters;
  // Salvaguarda defensiva: excluir lanzadores de la alineación ofensiva
  const currentBatters = rawBatters.filter((b) => b.position !== "P");
  const currentPitchers = isHomeSelected ? homePitchers : awayPitchers;

  // Totales colectivos del equipo
  const teamTotals = currentBatters.reduce(
    (acc, b) => ({
      ab: acc.ab + b.ab,
      r: acc.r + b.r,
      h: acc.h + b.h,
      doubles: acc.doubles + b.doubles,
      triples: acc.triples + b.triples,
      hr: acc.hr + b.hr,
      rbi: acc.rbi + b.rbi,
      bb: acc.bb + b.bb,
      so: acc.so + b.so,
    }),
    { ab: 0, r: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, so: 0 }
  );

  const teamAvg =
    teamTotals.ab > 0
      ? (teamTotals.h / teamTotals.ab).toFixed(3).replace(/^0/, "")
      : ".000";

  const startersCount = currentBatters.filter((b) => !b.isSubstitute).length;
  const subsCount = currentBatters.filter((b) => b.isSubstitute).length;
  const optimizerHref = gamePk
    ? `/bullpen?tab=lineups&subtab=optimizer&gamePk=${gamePk}${
        currentTeam.id !== 695 ? `&teamId=${currentTeam.id}` : ""
      }`
    : null;

  return (
    <div className="space-y-6">
      {/* ── SELECTOR DE EQUIPO (TABS) ── */}
      <div className="flex items-center space-x-2 p-1.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] w-full sm:w-fit">
        <button
          onClick={() => setSelectedTeamId(awayTeam.id)}
          className={cn(
            "flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all active:scale-[0.97]",
            selectedTeamId === awayTeam.id
              ? "bg-[#1E2B4D] text-[#FDB827] shadow-md border border-[#FDB827]/40"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          <div className="w-4 h-4 relative shrink-0">
            <Image
              src={awayTeam.logoUrl}
              alt={awayTeam.name}
              width={16}
              height={16}
              className="object-contain"
            />
          </div>
          <span className="truncate">{awayTeam.name}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            ({awayTeam.abbreviation})
          </span>
        </button>

        <button
          onClick={() => setSelectedTeamId(homeTeam.id)}
          className={cn(
            "flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all active:scale-[0.97]",
            selectedTeamId === homeTeam.id
              ? "bg-[#1E2B4D] text-[#FDB827] shadow-md border border-[#FDB827]/40"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          <div className="w-4 h-4 relative shrink-0">
            <Image
              src={homeTeam.logoUrl}
              alt={homeTeam.name}
              width={16}
              height={16}
              className="object-contain"
            />
          </div>
          <span className="truncate">{homeTeam.name}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            ({homeTeam.abbreviation})
          </span>
        </button>
      </div>

      {/* ── TABLA DE BATEO 1-9 (LINEUP) ── */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#1E2B4D]">
          <div className="flex items-center space-x-2 min-w-0">
            <Users className="w-4 h-4 text-[#FDB827] shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider truncate">
              Alineación Ofensiva · {currentTeam.name}
            </h3>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-[10px] font-mono text-slate-400">
              {currentBatters.length} Bateadores {subsCount > 0 ? `(${startersCount}+${subsCount})` : ""}
            </span>
            {optimizerHref && startersCount >= 9 && (
              <Link
                href={optimizerHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FDB827] hover:bg-[#FDB827]/90 text-[#070B19] font-bold text-xs transition-all active:scale-95 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Optimizar este Lineup</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── VISTA MÓVIL ESENCIAL DE BATEO (< md) ── */}
        <div className="block md:hidden">
          <div className="bg-[#070B19]/80 text-slate-400 font-mono border-b border-[#1E2B4D] text-[10px] grid grid-cols-12 py-2 px-2 text-center">
            <span className="col-span-1">#</span>
            <span className="col-span-5 text-left font-sans font-semibold">Bateador</span>
            <span className="col-span-1">VB</span>
            <span className="col-span-1 text-slate-200 font-bold">C</span>
            <span className="col-span-1 text-[#FDB827] font-bold">H</span>
            <span className="col-span-1 text-[#FDB827] font-bold">HR</span>
            <span className="col-span-1 text-amber-400 font-bold">CI</span>
            <span className="col-span-1">AVG</span>
          </div>

          <div className="divide-y divide-[#1E2B4D]/60 font-mono text-xs">
            {currentBatters.map((b) => {
              const bKey = `m-batter-${b.id}-${b.slot || b.order}-${b.isSubstitute ? "sub" : "main"}`;
              const isExpanded = expandedBatterKey === bKey;

              return (
                <div key={bKey} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setExpandedBatterKey(isExpanded ? null : bKey)}
                    className={cn(
                      "w-full text-left grid grid-cols-12 py-2.5 px-2 items-center text-xs transition-colors active:bg-[#1E2B4D]/40",
                      b.isSubstitute ? "bg-[#091024]/40" : "hover:bg-[#131F3F]/40"
                    )}
                  >
                    <span className="col-span-1 text-slate-400 font-bold text-center text-[11px]">
                      {b.isSubstitute ? "" : (b.slot || b.order)}
                    </span>
                    <div className="col-span-5 flex items-center space-x-1 truncate pr-1">
                      {b.isSubstitute && b.note && (
                        <span className="text-[10px] text-[#FDB827] font-bold">
                          {b.note}
                        </span>
                      )}
                      <span className={cn("truncate text-xs font-sans", b.isSubstitute ? "text-slate-300" : "text-slate-100 font-bold")}>
                        {b.name}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono ml-0.5">
                        {b.position}
                      </span>
                    </div>
                    <span className="col-span-1 text-center text-slate-300">{b.ab}</span>
                    <span className="col-span-1 text-center text-slate-200">{b.r}</span>
                    <span className="col-span-1 text-center font-bold text-[#FDB827]">{b.h}</span>
                    <span className="col-span-1 text-center font-bold text-[#FDB827]">{b.hr}</span>
                    <span className="col-span-1 text-center font-bold text-amber-400">{b.rbi}</span>
                    <div className="col-span-1 flex items-center justify-center space-x-0.5 text-slate-400 text-[10px]">
                      <span>{b.avg}</span>
                      {isExpanded ? <ChevronUp className="w-2.5 h-2.5 text-[#FDB827]" /> : <ChevronDown className="w-2.5 h-2.5 text-slate-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-2.5 bg-[#070B19]/90 border-t border-b border-[#1E2B4D]/60 animate-in fade-in duration-150 grid grid-cols-5 gap-1.5 text-center text-[10px]">
                      <div className="p-1 rounded bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-slate-400">2B</span>
                        <p className="font-bold text-slate-200 mt-0.5">{b.doubles}</p>
                      </div>
                      <div className="p-1 rounded bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-slate-400">3B</span>
                        <p className="font-bold text-slate-200 mt-0.5">{b.triples}</p>
                      </div>
                      <div className="p-1 rounded bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-slate-400">BB</span>
                        <p className="font-bold text-slate-200 mt-0.5">{b.bb}</p>
                      </div>
                      <div className="p-1 rounded bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-slate-400">SO (K)</span>
                        <p className="font-bold text-slate-200 mt-0.5">{b.so}</p>
                      </div>
                      <div className="p-1 rounded bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-slate-400">OPS</span>
                        <p className="font-bold text-[#FDB827] mt-0.5">{b.ops}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Totales Móvil */}
            <div className="grid grid-cols-12 py-2 px-2 bg-[#070B19]/90 border-t-2 border-[#1E2B4D] font-bold text-slate-100 text-center text-xs">
              <span className="col-span-1"></span>
              <span className="col-span-5 text-left font-sans uppercase text-[11px]">Totales</span>
              <span className="col-span-1">{teamTotals.ab}</span>
              <span className="col-span-1">{teamTotals.r}</span>
              <span className="col-span-1 text-[#FDB827]">{teamTotals.h}</span>
              <span className="col-span-1 text-[#FDB827]">{teamTotals.hr}</span>
              <span className="col-span-1 text-amber-400">{teamTotals.rbi}</span>
              <span className="col-span-1 text-slate-300 text-[10px]">{teamAvg}</span>
            </div>
          </div>
        </div>

        {/* ── VISTA DESKTOP COMPLETA DE BATEO (>= md) ── */}
        <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-thumb-[#1E2B4D]">
          <table className="w-full min-w-[620px] text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#1E2B4D] text-slate-400 text-[11px] text-center">
                <th className="py-2.5 px-3 text-left font-sans font-bold w-10">
                  #
                </th>
                <th className="py-2.5 px-3 text-left font-sans font-bold">
                  Bateador
                </th>
                <th className="py-2.5 px-2 font-bold">POS</th>
                <th className="py-2.5 px-2 font-bold text-slate-200">VB</th>
                <th className="py-2.5 px-2 font-bold text-slate-200">C</th>
                <th className="py-2.5 px-2 font-bold text-[#FDB827]">H</th>
                <th className="py-2.5 px-2 font-bold">2B</th>
                <th className="py-2.5 px-2 font-bold">3B</th>
                <th className="py-2.5 px-2 font-bold text-[#FDB827]">HR</th>
                <th className="py-2.5 px-2 font-bold text-amber-400">CI</th>
                <th className="py-2.5 px-2 font-bold">BB</th>
                <th className="py-2.5 px-2 font-bold">SO</th>
                <th className="py-2.5 px-3 font-bold text-slate-400">AVG</th>
                <th className="py-2.5 px-3 font-bold text-slate-400">OPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2B4D]/60 text-slate-200 text-center">
              {currentBatters.map((b) => (
                <tr
                  key={`batter-${b.id}-${b.slot || b.order}-${b.isSubstitute ? "sub" : "main"}`}
                  className={`hover:bg-[#131F3F]/50 transition-colors ${
                    b.isSubstitute ? "bg-[#091024]/40" : ""
                  }`}
                >
                  <td className="py-2 px-3 text-left text-slate-400 font-bold">
                    {b.isSubstitute ? "" : (b.slot || b.order)}
                  </td>
                  <td className="py-2 px-3 text-left font-sans">
                    <div className={`flex items-center ${b.isSubstitute ? "pl-5 sm:pl-7" : ""}`}>
                      {b.isSubstitute && b.note && (
                        <span className="text-[11px] font-mono text-[#FDB827] mr-1.5 font-bold">
                          {b.note}
                        </span>
                      )}
                      <span className={`font-bold ${b.isSubstitute ? "text-slate-300 font-medium text-[11px] sm:text-xs" : "text-slate-100"}`}>
                        {b.name}
                      </span>
                      {b.jersey !== "-" && (
                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                          #{b.jersey}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 font-bold text-slate-300">
                    {b.position}
                  </td>
                  <td className="py-2 px-2">{b.ab}</td>
                  <td className="py-2 px-2">{b.r}</td>
                  <td className="py-2 px-2 font-bold text-[#FDB827]">{b.h}</td>
                  <td className="py-2 px-2 text-slate-400">{b.doubles}</td>
                  <td className="py-2 px-2 text-slate-400">{b.triples}</td>
                  <td className="py-2 px-2 font-bold text-[#FDB827]">{b.hr}</td>
                  <td className="py-2 px-2 font-bold text-amber-400">{b.rbi}</td>
                  <td className="py-2 px-2 text-slate-400">{b.bb}</td>
                  <td className="py-2 px-2 text-slate-400">{b.so}</td>
                  <td className="py-2 px-3 text-slate-400">{b.avg}</td>
                  <td className="py-2 px-3 text-slate-400">{b.ops}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-[#1E2B4D] bg-[#070B19]/80 font-bold text-slate-100 text-center">
              <tr>
                <td className="py-2.5 px-3 text-left"></td>
                <td className="py-2.5 px-3 text-left font-sans tracking-wider uppercase text-xs text-slate-200">
                  Totales
                </td>
                <td className="py-2.5 px-2"></td>
                <td className="py-2.5 px-2 text-slate-100">{teamTotals.ab}</td>
                <td className="py-2.5 px-2 text-slate-100">{teamTotals.r}</td>
                <td className="py-2.5 px-2 text-[#FDB827]">{teamTotals.h}</td>
                <td className="py-2.5 px-2 text-slate-300">{teamTotals.doubles}</td>
                <td className="py-2.5 px-2 text-slate-300">{teamTotals.triples}</td>
                <td className="py-2.5 px-2 text-[#FDB827]">{teamTotals.hr}</td>
                <td className="py-2.5 px-2 text-amber-400">{teamTotals.rbi}</td>
                <td className="py-2.5 px-2 text-slate-300">{teamTotals.bb}</td>
                <td className="py-2.5 px-2 text-slate-300">{teamTotals.so}</td>
                <td className="py-2.5 px-3 text-slate-300">{teamAvg}</td>
                <td className="py-2.5 px-3 text-slate-400">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── TABLA DE PITCHEO ── */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2B4D]">
          <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
            <span>⚾</span>
            <span>Cuerpo de Lanzadores · {currentTeam.name}</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            {currentPitchers.length} Pitchers actuantes
          </span>
        </div>

        {/* ── VISTA MÓVIL ESENCIAL DE PITCHEO (< md) ── */}
        <div className="block md:hidden">
          <div className="bg-[#070B19]/80 text-slate-400 font-mono border-b border-[#1E2B4D] text-[10px] grid grid-cols-12 py-2 px-2 text-center">
            <span className="col-span-5 text-left font-sans font-semibold">Lanzador</span>
            <span className="col-span-2 text-slate-200 font-bold">IP</span>
            <span className="col-span-1">H</span>
            <span className="col-span-1 text-rose-400 font-bold">CL</span>
            <span className="col-span-1 text-emerald-400 font-bold">SO</span>
            <span className="col-span-2">ERA</span>
          </div>

          <div className="divide-y divide-[#1E2B4D]/60 font-mono text-xs">
            {currentPitchers.map((p) => {
              const isExpanded = expandedPitcherId === p.id;

              return (
                <div key={`m-pitcher-${p.id}`} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setExpandedPitcherId(isExpanded ? null : p.id)}
                    className="w-full text-left grid grid-cols-12 py-2.5 px-2 items-center text-xs transition-colors hover:bg-[#131F3F]/40 active:bg-[#1E2B4D]/40"
                  >
                    <div className="col-span-5 flex items-center space-x-1 truncate pr-1">
                      <span className="font-bold text-slate-100 truncate text-xs font-sans">
                        {p.name}
                      </span>
                      {p.jersey !== "-" && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          #{p.jersey}
                        </span>
                      )}
                    </div>
                    <span className="col-span-2 text-center font-bold text-slate-100">{p.ip}</span>
                    <span className="col-span-1 text-center text-slate-300">{p.h}</span>
                    <span className="col-span-1 text-center font-bold text-rose-400">{p.er}</span>
                    <span className="col-span-1 text-center font-bold text-emerald-400">{p.so}</span>
                    <div className="col-span-2 flex items-center justify-center space-x-0.5 text-slate-400 text-[10px]">
                      <span>{p.era}</span>
                      {isExpanded ? <ChevronUp className="w-2.5 h-2.5 text-[#FDB827]" /> : <ChevronDown className="w-2.5 h-2.5 text-slate-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-2.5 bg-[#070B19]/90 border-t border-b border-[#1E2B4D]/60 animate-in fade-in duration-150 grid grid-cols-4 gap-1.5 text-center text-[10px]">
                      <div className="p-1 rounded bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-slate-400">Carreras (C)</span>
                        <p className="font-bold text-slate-200 mt-0.5">{p.r}</p>
                      </div>
                      <div className="p-1 rounded bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-slate-400">Boletos (BB)</span>
                        <p className="font-bold text-slate-200 mt-0.5">{p.bb}</p>
                      </div>
                      <div className="p-1 rounded bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-slate-400">Jonrones (HR)</span>
                        <p className="font-bold text-slate-200 mt-0.5">{p.hr}</p>
                      </div>
                      <div className="p-1 rounded bg-[#0D152B] border border-[#1E2B4D]/60">
                        <span className="text-slate-400">Pitches (P-S)</span>
                        <p className="font-bold text-[#FDB827] mt-0.5">{p.pitches}-{p.strikes}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── VISTA DESKTOP COMPLETA DE PITCHEO (>= md) ── */}
        <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-thumb-[#1E2B4D]">
          <table className="w-full min-w-[620px] text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#1E2B4D] text-slate-400 text-[11px] text-center">
                <th className="py-2.5 px-3 text-left font-sans font-bold">
                  Lanzador
                </th>
                <th className="py-2.5 px-2 font-bold text-slate-200">IP</th>
                <th className="py-2.5 px-2 font-bold text-slate-200">H</th>
                <th className="py-2.5 px-2 font-bold">C</th>
                <th className="py-2.5 px-2 font-bold text-rose-400">CL</th>
                <th className="py-2.5 px-2 font-bold">BB</th>
                <th className="py-2.5 px-2 font-bold text-emerald-400">SO</th>
                <th className="py-2.5 px-2 font-bold">HR</th>
                <th className="py-2.5 px-3 font-bold text-slate-300">P-S</th>
                <th className="py-2.5 px-3 font-bold text-slate-400">ERA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2B4D]/60 text-slate-200 text-center">
              {currentPitchers.map((p) => (
                <tr
                  key={`pitcher-${p.id}`}
                  className="hover:bg-[#131F3F]/50 transition-colors"
                >
                  <td className="py-2 px-3 text-left font-sans">
                    <span className="font-bold text-slate-100">{p.name}</span>
                    {p.jersey !== "-" && (
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                        #{p.jersey}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 font-bold text-slate-100">{p.ip}</td>
                  <td className="py-2 px-2">{p.h}</td>
                  <td className="py-2 px-2">{p.r}</td>
                  <td className="py-2 px-2 font-bold text-rose-400">{p.er}</td>
                  <td className="py-2 px-2 text-slate-400">{p.bb}</td>
                  <td className="py-2 px-2 font-bold text-emerald-400">{p.so}</td>
                  <td className="py-2 px-2 text-slate-400">{p.hr}</td>
                  <td className="py-2 px-3 text-slate-300">
                    {p.pitches}-{p.strikes}
                  </td>
                  <td className="py-2 px-3 text-slate-400">{p.era}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
