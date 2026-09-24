"use client";

import Image from "next/image";
import { Download, Calendar, Shield, Zap, CheckCircle2, Loader2, Clock } from "lucide-react";
import { PitcherProfile, PitcherGameLog, TimeMode } from "@/types/pitching";

interface PitchingHeaderProps {
  pitcher: PitcherProfile;
  branch: "lvbp" | "mlb";
  onChangeBranch: (b: "lvbp" | "mlb") => void;
  timeMode: TimeMode;
  onChangeTimeMode: (m: TimeMode) => void;
  season: number;
  onChangeSeason: (s: number) => void;
  phase: string;
  onChangePhase: (p: string) => void;
  gameLogs: PitcherGameLog[];
  selectedGamePk: number;
  onSelectGamePk: (pk: number) => void;
  onDownloadCard: () => void;
  isDownloadingCard: boolean;
}

export function PitchingHeader({
  pitcher,
  branch,
  onChangeBranch,
  timeMode,
  onChangeTimeMode,
  season,
  onChangeSeason,
  phase,
  onChangePhase,
  gameLogs,
  selectedGamePk,
  onSelectGamePk,
  onDownloadCard,
  isDownloadingCard,
}: PitchingHeaderProps) {
  const selectedLog = gameLogs.find((l) => l.gamePk === selectedGamePk) || gameLogs[0];

  return (
    <div className="w-full bg-[#0D152B]/90 border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4">
      {/* Top row: Avatar + Profile Info + Branch Selector + Download Button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Pitcher Info */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#070B19] border-2 border-[#FDB827]/40 p-1 shrink-0 relative shadow-[0_0_20px_rgba(253,184,39,0.15)]">
            <Image
              src={pitcher.photoUrl}
              alt={pitcher.name}
              fill
              className="object-cover rounded-xl"
              unoptimized
            />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-2xl font-black text-slate-100 tracking-tight">
                {pitcher.name}
              </h2>
              {pitcher.hasCaracasHistory && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#002D62] text-[#FDB827] border border-[#FDB827]/50 font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(253,184,39,0.2)]">
                  <Shield className="w-3 h-3" />
                  LEONES DEL CARACAS
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
              <span className="font-semibold text-slate-300">{pitcher.team}</span>
              <span>•</span>
              <span className="font-mono bg-[#1E2B4D] px-1.5 py-0.5 rounded text-[11px] text-slate-300">
                {pitcher.position} ({pitcher.throws}HP)
              </span>
              <span>•</span>
              <span className="font-mono text-slate-400 text-[11px]">MLB ID: #{pitcher.id}</span>
            </div>
          </div>
        </div>

        {/* Branch Toggle & Download HD Button */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          {/* Branch Toggle */}
          <div className="flex items-center bg-[#070B19] p-1 rounded-xl border border-[#1E2B4D] shrink-0">
            <button
              onClick={() => onChangeBranch("lvbp")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                branch === "lvbp"
                  ? "bg-[#002D62] text-[#FDB827] border border-[#FDB827]/40 shadow-[0_0_12px_rgba(253,184,39,0.2)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              LVBP / Caracas
            </button>
            <button
              onClick={() => onChangeBranch("mlb")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                branch === "mlb"
                  ? "bg-[#FDB827] text-slate-950 font-black shadow-[0_0_12px_rgba(253,184,39,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              MLB (Statcast)
            </button>
          </div>

          {/* Download HD Card */}
          <button
            onClick={onDownloadCard}
            disabled={isDownloadingCard || (!selectedLog && timeMode === "game")}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FDB827] to-[#E5A722] hover:from-[#FFE17D] hover:to-[#FDB827] text-slate-950 font-bold text-xs flex items-center gap-2 shadow-[0_4px_16px_rgba(253,184,39,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isDownloadingCard ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Download className="w-4 h-4 text-slate-950" />
            )}
            <span>Descargar Tarjeta HD (16:9)</span>
          </button>
        </div>
      </div>

      {/* Bottom controls: TimeMode Toggle + Season + Phase + Game Log Selector */}
      <div className="pt-3 border-t border-[#1E2B4D]/60 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left Side: TimeMode + Season + Phase */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Time Mode Switcher */}
          <div className="flex items-center bg-[#070B19] p-1 rounded-xl border border-[#1E2B4D] shrink-0">
            <button
              onClick={() => onChangeTimeMode("game")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                timeMode === "game"
                  ? "bg-[#0D152B] text-[#FDB827] border border-[#FDB827]/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Salida Individual
            </button>
            <button
              onClick={() => onChangeTimeMode("season")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                timeMode === "season"
                  ? "bg-[#FDB827] text-slate-950 font-black shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Temporada Completa
            </button>
          </div>

          {/* Season Picker */}
          <div className="flex items-center gap-1.5 bg-[#070B19] px-2.5 py-1.5 rounded-lg border border-[#1E2B4D]">
            <span className="text-[11px] text-slate-400 font-medium">Temporada:</span>
            <select
              value={season}
              onChange={(e) => onChangeSeason(Number(e.target.value))}
              className="bg-transparent text-slate-200 text-xs font-bold font-mono focus:outline-none cursor-pointer"
            >
              <option value={2026} className="bg-[#070B19]">2026</option>
              <option value={2025} className="bg-[#070B19]">2025</option>
              <option value={2024} className="bg-[#070B19]">2024</option>
              <option value={2023} className="bg-[#070B19]">2023</option>
              <option value={2022} className="bg-[#070B19]">2022</option>
            </select>
          </div>

          {/* Phase Picker (LVBP only) */}
          {branch === "lvbp" && (
            <div className="flex items-center gap-1.5 bg-[#070B19] px-2.5 py-1.5 rounded-lg border border-[#1E2B4D]">
              <span className="text-[11px] text-slate-400 font-medium">Fase:</span>
              <select
                value={phase}
                onChange={(e) => onChangePhase(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#070B19]">Todas las Fases</option>
                <option value="R" className="bg-[#070B19]">Temporada Regular</option>
                <option value="L" className="bg-[#070B19]">Round Robin</option>
                <option value="F" className="bg-[#070B19]">Serie Final</option>
              </select>
            </div>
          )}
        </div>

        {/* Right Side: Conditional Game Log Selector vs Season Summary Badge */}
        <div className="flex items-center gap-2 flex-1 max-w-xl justify-end">
          {timeMode === "game" ? (
            <>
              <span className="text-[11px] text-slate-400 shrink-0 font-medium hidden sm:inline">
                Salida:
              </span>
              <select
                value={selectedGamePk || ""}
                onChange={(e) => onSelectGamePk(Number(e.target.value))}
                className="w-full bg-[#070B19] border border-[#1E2B4D] focus:border-[#FDB827] text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none cursor-pointer font-medium truncate"
              >
                {gameLogs.length === 0 ? (
                  <option value="" disabled className="bg-[#070B19]">
                    Sin salidas registradas en esta temporada
                  </option>
                ) : (
                  gameLogs.map((log) => {
                    const decBadge = log.decision ? `[${log.decision}] ` : "";
                    return (
                      <option key={log.gamePk} value={log.gamePk} className="bg-[#070B19]">
                        {log.date} vs {log.opponent} • {decBadge}
                        {log.role} ({log.ip} IP, {log.er} ER, {log.so} K, {log.pitches}P)
                      </option>
                    );
                  })
                )}
              </select>
            </>
          ) : (
            <div className="w-full bg-[#002D62]/40 border border-[#FDB827]/40 px-3.5 py-2 rounded-lg text-xs text-[#FDB827] font-semibold flex items-center justify-between gap-2 shadow-[0_0_12px_rgba(253,184,39,0.1)]">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Consolidado Temporada {season} ({gameLogs.length} Salidas)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                Repertorio y métricas acumuladas
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
