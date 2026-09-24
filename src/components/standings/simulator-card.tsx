"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { TeamStanding } from "@/types/sports";
import { runMonteCarloSimulation, MonteCarloResults } from "@/lib/monte-carlo";
import { Dice5, RefreshCw, Trophy, Shield, Flame, Activity } from "lucide-react";

interface SimulatorCardProps {
  standings: TeamStanding[];
  initialResults: MonteCarloResults;
}

export function SimulatorCard({
  standings,
  initialResults,
}: SimulatorCardProps) {
  const [mode, setMode] = useState<"actual" | "scratch">("actual");
  const [results, setResults] = useState<MonteCarloResults>(initialResults);
  const [isPending, startTransition] = useTransition();

  const handleSimulate = (selectedMode: "actual" | "scratch") => {
    startTransition(() => {
      const res = runMonteCarloSimulation(standings, selectedMode, 3000);
      setResults(res);
    });
  };

  const handleModeChange = (newMode: "actual" | "scratch") => {
    setMode(newMode);
    handleSimulate(newMode);
  };

  const caracas = results.caracasProjection;

  return (
    <div className="space-y-6">
      {/* Barra de Control del Simulador */}
      <div className="p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#131E3D] border border-[#FDB827]/30 flex items-center justify-center shrink-0">
            <Dice5 className="w-4 h-4 text-[#FDB827]" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Simulador de Clasificación & Postemporada
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Estructura LVBP: Top 4 Directo + Comodín (5° vs 6°) + Round Robin + Final
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Selector de Modo */}
          <div className="flex rounded-lg bg-[#070B19] p-0.5 border border-[#1E2B4D] text-xs">
            <button
              onClick={() => handleModeChange("actual")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                mode === "actual"
                  ? "bg-[#1E2B4D] text-[#FDB827]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Posición Actual
            </button>
            <button
              onClick={() => handleModeChange("scratch")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                mode === "scratch"
                  ? "bg-[#1E2B4D] text-[#FDB827]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Desde Cero
            </button>
          </div>

          {/* Botón Re-ejecutar */}
          <button
            onClick={() => handleSimulate(mode)}
            disabled={isPending}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#FDB827] text-[#070B19] text-xs font-bold hover:bg-[#E5A31A] transition-all disabled:opacity-60 shadow-[0_0_12px_rgba(253,184,39,0.2)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>Simular</span>
          </button>
        </div>
      </div>

      {/* Probabilidades de Leones del Caracas */}
      {caracas && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <div className="p-3 sm:p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-center">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono uppercase mb-1">
              Top 4 Directo
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
              {(caracas.top4Prob * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Pase sin comodín</div>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-center">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono uppercase mb-1">
              Serie Comodín
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-300">
              {(caracas.wcProb * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Puestos 5° o 6°</div>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-[#0D152B] border border-emerald-500/30 bg-emerald-950/10 text-center">
            <div className="text-[10px] sm:text-[11px] text-emerald-400 font-mono uppercase mb-1 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Round Robin</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              {(caracas.rrProb * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Pase definitivo</div>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-center">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono uppercase mb-1 flex items-center justify-center gap-1">
              <Activity className="w-3 h-3 text-sky-400" />
              <span>Gran Final</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400">
              {(caracas.finalProb * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Top 2 Round Robin</div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3 sm:p-4 rounded-xl bg-[#0D152B] border border-[#FDB827]/40 shadow-[0_0_15px_rgba(253,184,39,0.15)] text-center">
            <div className="text-[10px] sm:text-[11px] text-[#FDB827] font-mono uppercase mb-1 flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3" />
              <span>Campeón LVBP</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#FDB827]">
              {(caracas.champProb * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-300 mt-1">Ganador Serie Final</div>
          </div>
        </div>
      )}

      {/* Tabla de Probabilidades para las 8 Franquicias */}
      <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden">
        <div className="p-4 border-b border-[#1E2B4D] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-[#FDB827]" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Probabilidades de Clasificación por Franquicia
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Ordenado por probabilidad de campeonato
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead>
              <tr className="bg-[#070B19]/70 text-slate-400 font-mono border-b border-[#1E2B4D] text-[11px]">
                <th className="py-3 px-4 font-semibold">EQUIPO</th>
                <th className="py-3 px-3 font-semibold text-center text-[#FDB827]">ELO</th>
                <th className="py-3 px-3 font-semibold text-center">TOP 4</th>
                <th className="py-3 px-3 font-semibold text-center text-slate-400">COMODÍN</th>
                <th className="py-3 px-3 font-semibold text-center text-emerald-400">ROUND ROBIN</th>
                <th className="py-3 px-3 font-semibold text-center text-sky-400">GRAN FINAL</th>
                <th className="py-3 px-4 font-semibold text-center text-[#FDB827]">CAMPEÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2B4D]/50 font-mono">
              {results.projections.map((team) => {
                const isCaracas = team.teamId === 695;

                return (
                  <tr
                    key={team.teamId}
                    className={`transition-colors ${
                      isCaracas
                        ? "bg-[#002D62]/35 hover:bg-[#002D62]/50 font-semibold text-slate-100"
                        : "hover:bg-[#131E3D]/50 text-slate-300"
                    }`}
                  >
                    <td className="py-3 px-4 font-sans font-semibold">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 relative shrink-0">
                          <Image
                            src={team.logoUrl}
                            alt={team.teamName}
                            width={24}
                            height={24}
                            className="object-contain"
                          />
                        </div>
                        <span className={isCaracas ? "text-[#FDB827]" : "text-slate-100"}>
                          {team.teamName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-[#FDB827]">
                      {team.elo.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-200">
                      {(team.top4Prob * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400">
                      {(team.wcProb * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">
                      {(team.rrProb * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-sky-400">
                      {(team.finalProb * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                          team.champProb > 0.15
                            ? "bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/40 shadow-[0_0_10px_rgba(253,184,39,0.15)]"
                            : team.champProb > 0.05
                            ? "bg-[#1E2B4D] text-slate-200"
                            : "text-slate-500"
                        }`}
                      >
                        {(team.champProb * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
