"use client";

import React from "react";
import { PitcherGameLog } from "@/types/pitching";
import { Calendar, Shield, Award } from "lucide-react";

interface PitchingGameLogsTableProps {
  gameLogs: PitcherGameLog[];
  selectedGamePk?: number;
  onSelectGamePk?: (pk: number) => void;
  title?: string;
  maxRows?: number;
}

export function PitchingGameLogsTable({
  gameLogs,
  selectedGamePk,
  onSelectGamePk,
  title = "Historial de Salidas (Últimos 10 Juegos)",
  maxRows = 10,
}: PitchingGameLogsTableProps) {
  if (!gameLogs || gameLogs.length === 0) {
    return null;
  }

  // Ordenar cronológicamente descendente (más reciente primero) y tomar hasta maxRows
  const recentLogs = [...gameLogs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxRows);

  return (
    <div className="w-full max-w-4xl bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#002D62] text-[#FDB827] border border-[#FDB827]/30">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>📋 {title}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/30">
                {recentLogs.length} Salidas
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Haz clic en cualquier salida para cargar su telemetría y tarjeta oficial
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1E2B4D]/70 bg-[#070B19]">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="bg-[#0F172A] text-[#FDB827] font-bold border-b border-[#1E2B4D]">
              <th className="py-2.5 px-3 text-left">Fecha</th>
              <th className="py-2.5 px-3 text-left">Rival</th>
              <th className="py-2.5 px-3">Rol</th>
              <th className="py-2.5 px-2">Dec.</th>
              <th className="py-2.5 px-2">IP</th>
              <th className="py-2.5 px-2">H</th>
              <th className="py-2.5 px-2">C</th>
              <th className="py-2.5 px-2">CL</th>
              <th className="py-2.5 px-2">BB</th>
              <th className="py-2.5 px-2">K</th>
              <th className="py-2.5 px-3">Pitcheos (S-B)</th>
              <th className="py-2.5 px-2 text-[#FDB827]">CSW%</th>
              <th className="py-2.5 px-2 text-blue-400">Whiff%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2B4D]/50 text-slate-200 font-mono">
            {recentLogs.map((log) => {
              const isSelected = selectedGamePk === log.gamePk;
              const strikes = log.strikes || Math.round((log.pitches || 0) * 0.62);
              const balls = Math.max(0, (log.pitches || 0) - strikes);

              // Decisión badge
              const decColor =
                log.decision === "W"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : log.decision === "L"
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                  : log.decision === "SV"
                  ? "bg-[#FDB827]/20 text-[#FDB827] border-[#FDB827]/30"
                  : "text-slate-400";

              // Rol badge
              const isStarter = log.isStarter || log.role === "Abridor";

              return (
                <tr
                  key={log.gamePk}
                  onClick={() => onSelectGamePk?.(log.gamePk)}
                  className={`transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#002D62]/40 border-l-4 border-l-[#FDB827] text-slate-100 font-bold"
                      : "hover:bg-[#0D152B]/80"
                  }`}
                >
                  <td className="py-2.5 px-3 text-left text-slate-300 font-medium">
                    {log.date}
                  </td>
                  <td className="py-2.5 px-3 text-left font-semibold text-slate-200">
                    {log.opponent}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        isStarter
                          ? "bg-[#002D62] text-[#FDB827] border border-[#FDB827]/40"
                          : "bg-[#1E2B4D] text-slate-300 border border-slate-600/40"
                      }`}
                    >
                      {log.role || (isStarter ? "Abridor" : "Relevista")}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    {log.decision ? (
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black border ${decColor}`}
                      >
                        {log.decision}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-[#FDB827] font-bold">{log.ip}</td>
                  <td className="py-2.5 px-2">{log.h}</td>
                  <td className="py-2.5 px-2 text-slate-400">{log.r}</td>
                  <td className="py-2.5 px-2">{log.er}</td>
                  <td className="py-2.5 px-2">{log.bb}</td>
                  <td className="py-2.5 px-2 text-emerald-400 font-bold">{log.so}</td>
                  <td className="py-2.5 px-3">
                    <span>{log.pitches}</span>
                    <span className="text-[10px] text-slate-400 ml-1">
                      ({strikes}-{balls})
                    </span>
                  </td>
                  <td className="py-2.5 px-2 font-bold text-amber-300">
                    {log.cswPct || "—"}
                  </td>
                  <td className="py-2.5 px-2 font-bold text-blue-300">
                    {log.whiffPct || "—"}
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
