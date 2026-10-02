"use client";

import { useState } from "react";
import Image from "next/image";
import {
  LVBP_TEAMS,
  LVBP_TEAM_IDS,
  getTeam,
} from "@/lib/constants";
import {
  LVBP_PARK_FACTORS,
  DEFAULT_STARTING_ROTATIONS,
  projectMatchup,
  probToDecimal,
  probToAmerican,
  formatOdds,
  americanToDecimal,
  calculateEv,
  calculateKellyStake,
  evaluateRating,
} from "@/lib/probabilidades-engine";
import { ProbablePitcher, ParkFactor, OddsFormat } from "@/types/probabilidades";
import { X, Sparkles, TrendingUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FreeSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  oddsFormat: OddsFormat;
}

export function FreeSimulatorModal({ isOpen, onClose, oddsFormat }: FreeSimulatorModalProps) {
  const [homeId, setHomeId] = useState<number>(695); // Caracas
  const [awayId, setAwayId] = useState<number>(696); // Magallanes
  const [stadiumKey, setStadiumKey] = useState<string>("Estadio Universitario de Caracas");

  const homeTeam = getTeam(homeId);
  const awayTeam = getTeam(awayId);
  const park: ParkFactor = LVBP_PARK_FACTORS[stadiumKey] || Object.values(LVBP_PARK_FACTORS)[0];

  const homePitchers = DEFAULT_STARTING_ROTATIONS[homeId] || [];
  const awayPitchers = DEFAULT_STARTING_ROTATIONS[awayId] || [];

  const [selectedHomePitcherId, setSelectedHomePitcherId] = useState<number>(
    homePitchers[0]?.id || 0
  );
  const [selectedAwayPitcherId, setSelectedAwayPitcherId] = useState<number>(
    awayPitchers[0]?.id || 0
  );

  const homePitcher: ProbablePitcher =
    homePitchers.find((p) => p.id === selectedHomePitcherId) ||
    homePitchers[0] || {
      id: 9991,
      name: "Abridor Local",
      teamId: homeId,
      teamAbbr: homeTeam.abbreviation,
      throws: "R",
      era: 3.8,
      fip: 3.6,
      whip: 1.25,
      k9: 7.5,
      bb9: 2.8,
      inningsPitched: 45.0,
    };

  const awayPitcher: ProbablePitcher =
    awayPitchers.find((p) => p.id === selectedAwayPitcherId) ||
    awayPitchers[0] || {
      id: 9992,
      name: "Abridor Visitante",
      teamId: awayId,
      teamAbbr: awayTeam.abbreviation,
      throws: "R",
      era: 4.0,
      fip: 3.9,
      whip: 1.3,
      k9: 7.2,
      bb9: 3.0,
      inningsPitched: 42.0,
    };

  // Cuotas de mercado simuladas/editables en el simulador
  const [testHomeOdds, setTestHomeOdds] = useState<number>(1.85);
  const [testAwayOdds, setTestAwayOdds] = useState<number>(1.95);

  if (!isOpen) return null;

  // Ejecución de la proyección multi-factor
  const model = projectMatchup(homeId, awayId, homePitcher, awayPitcher, park);

  const evHome = calculateEv(model.homeWinProb, testHomeOdds);
  const evAway = calculateEv(model.awayWinProb, testAwayOdds);

  const ratingHome = evaluateRating(evHome);
  const ratingAway = evaluateRating(evAway);

  const kellyHome = calculateKellyStake(model.homeWinProb, testHomeOdds);
  const kellyAway = calculateKellyStake(model.awayWinProb, testAwayOdds);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#0D152B] border border-[#FDB827]/40 shadow-2xl p-5 sm:p-6 text-slate-100 my-8">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2B4D]">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#FDB827]/20 text-[#FDB827]">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>Simulador de Juego</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#FDB827] text-[#070B19] font-black uppercase">
                  Libre
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona cualquier par de equipos, abridores y estadio para proyectar líneas matemáticas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Selectores de Equipos y Abridores ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Visitante (Away) */}
          <div className="p-3.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] space-y-3">
            <div className="flex items-center space-x-2">
              <div className="relative w-8 h-8 rounded-lg bg-[#0D152B] p-1 flex items-center justify-center border border-[#1E2B4D]">
                <Image
                  src={awayTeam.logoUrl}
                  alt={awayTeam.name}
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Visitante (Away)
              </span>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Franquicia:</label>
              <select
                value={awayId}
                onChange={(e) => {
                  const id = parseInt(e.target.value, 10);
                  setAwayId(id);
                  const firstPitcher = DEFAULT_STARTING_ROTATIONS[id]?.[0]?.id || 0;
                  setSelectedAwayPitcherId(firstPitcher);
                }}
                className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#FDB827]"
              >
                {LVBP_TEAM_IDS.map((id) => {
                  const t = getTeam(id);
                  return (
                    <option key={id} value={id} disabled={id === homeId}>
                      {t.name} ({t.abbreviation})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Lanzador Abridor:</label>
              <select
                value={selectedAwayPitcherId}
                onChange={(e) => setSelectedAwayPitcherId(parseInt(e.target.value, 10))}
                className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#FDB827]"
              >
                {awayPitchers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.throws}) • FIP {p.fip.toFixed(2)} • ERA {p.era.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Local (Home) */}
          <div className="p-3.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] space-y-3">
            <div className="flex items-center space-x-2">
              <div className="relative w-8 h-8 rounded-lg bg-[#0D152B] p-1 flex items-center justify-center border border-[#1E2B4D]">
                <Image
                  src={homeTeam.logoUrl}
                  alt={homeTeam.name}
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Local (Home - Ventaja +35 ELO)
              </span>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Franquicia:</label>
              <select
                value={homeId}
                onChange={(e) => {
                  const id = parseInt(e.target.value, 10);
                  setHomeId(id);
                  const firstPitcher = DEFAULT_STARTING_ROTATIONS[id]?.[0]?.id || 0;
                  setSelectedHomePitcherId(firstPitcher);
                }}
                className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#FDB827]"
              >
                {LVBP_TEAM_IDS.map((id) => {
                  const t = getTeam(id);
                  return (
                    <option key={id} value={id} disabled={id === awayId}>
                      {t.name} ({t.abbreviation})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Lanzador Abridor:</label>
              <select
                value={selectedHomePitcherId}
                onChange={(e) => setSelectedHomePitcherId(parseInt(e.target.value, 10))}
                className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#FDB827]"
              >
                {homePitchers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.throws}) • FIP {p.fip.toFixed(2)} • ERA {p.era.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Selector de Estadio y Factor de Parque ── */}
        <div className="mt-3 p-3 rounded-xl bg-[#070B19] border border-[#1E2B4D] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex-1">
            <label className="text-[11px] text-slate-400 block mb-0.5">Estadio Sede (Factor de Parque):</label>
            <select
              value={stadiumKey}
              onChange={(e) => setStadiumKey(e.target.value)}
              className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#FDB827]"
            >
              {Object.keys(LVBP_PARK_FACTORS).map((stKey) => {
                const pf = LVBP_PARK_FACTORS[stKey];
                return (
                  <option key={stKey} value={stKey}>
                    {pf.stadiumName} ({pf.city}) • {pf.runFactor.toFixed(2)}x carreras
                  </option>
                );
              })}
            </select>
          </div>
          <div className="text-[11px] text-slate-400 sm:max-w-xs pt-1 sm:pt-4">
            {park.description}
          </div>
        </div>

        {/* ── Resultados de la Proyección Sabermétrica ── */}
        <div className="mt-4 p-4 rounded-xl bg-[#070B19] border border-[#1E2B4D] space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Resultados Proyectados del Modelo</span>
            <span className="font-mono text-[#FDB827]">
              Total Carreras: {model.totalExpectedRuns.toFixed(1)} ({awayPitcher.name} vs {homePitcher.name})
            </span>
          </div>

          {/* Carreras y Probabilidad */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-lg bg-[#0D152B] border border-[#1E2B4D]">
              <div className="text-xs font-bold text-slate-300">{awayTeam.abbreviation} (Visitante)</div>
              <div className="text-2xl font-black text-white mt-1">
                {(model.awayWinProb * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-[#FDB827] font-mono mt-0.5 font-bold">
                Cuota Justa: {formatOdds(model.fairAwayDecimal, oddsFormat)}
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  ({oddsFormat === "american" ? model.fairAwayDecimal.toFixed(2) : formatOdds(model.fairAwayDecimal, "american")})
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                xR: <strong>{model.awayExpectedRuns.toFixed(2)}</strong> carreras
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0D152B] border border-[#1E2B4D]">
              <div className="text-xs font-bold text-slate-300">{homeTeam.abbreviation} (Local)</div>
              <div className="text-2xl font-black text-white mt-1">
                {(model.homeWinProb * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-[#FDB827] font-mono mt-0.5 font-bold">
                Cuota Justa: {formatOdds(model.fairHomeDecimal, oddsFormat)}
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  ({oddsFormat === "american" ? model.fairHomeDecimal.toFixed(2) : formatOdds(model.fairHomeDecimal, "american")})
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                xR: <strong>{model.homeExpectedRuns.toFixed(2)}</strong> carreras
              </div>
            </div>
          </div>

          {/* Probador de Cuota de Mercado & Cálculo de +EV y Kelly */}
          <div className="mt-3 pt-3 border-t border-[#1E2B4D] grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Prueba Away */}
            <div className="p-3 rounded-lg bg-[#0D152B] border border-[#1E2B4D] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Cuota Mercado ({awayTeam.abbreviation}):</span>
                <input
                  type="text"
                  value={formatOdds(testAwayOdds, oddsFormat)}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (oddsFormat === "american") {
                      const parsed = parseInt(val.replace("+", ""), 10);
                      if (!isNaN(parsed) && Math.abs(parsed) >= 100) {
                        setTestAwayOdds(americanToDecimal(parsed));
                      }
                    } else {
                      const parsed = parseFloat(val);
                      if (!isNaN(parsed) && parsed > 1.0) setTestAwayOdds(parsed);
                    }
                  }}
                  className="w-18 px-1.5 py-0.5 text-center font-bold font-mono rounded bg-[#070B19] border border-[#1E2B4D] text-xs text-white"
                />
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#1E2B4D]/60">
                <span className="text-slate-400">Expected Value:</span>
                <span
                  className={cn(
                    "font-black px-1.5 py-0.5 rounded text-[11px]",
                    ratingAway === "mispriced"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : ratingAway === "value"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-slate-400"
                  )}
                >
                  {evAway > 0 ? `+${evAway}% EV` : `${evAway}% EV`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Quarter-Kelly:</span>
                <span className="font-bold text-[#FDB827]">{kellyAway}% bankroll</span>
              </div>
            </div>

            {/* Prueba Home */}
            <div className="p-3 rounded-lg bg-[#0D152B] border border-[#1E2B4D] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Cuota Mercado ({homeTeam.abbreviation}):</span>
                <input
                  type="text"
                  value={formatOdds(testHomeOdds, oddsFormat)}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (oddsFormat === "american") {
                      const parsed = parseInt(val.replace("+", ""), 10);
                      if (!isNaN(parsed) && Math.abs(parsed) >= 100) {
                        setTestHomeOdds(americanToDecimal(parsed));
                      }
                    } else {
                      const parsed = parseFloat(val);
                      if (!isNaN(parsed) && parsed > 1.0) setTestHomeOdds(parsed);
                    }
                  }}
                  className="w-18 px-1.5 py-0.5 text-center font-bold font-mono rounded bg-[#070B19] border border-[#1E2B4D] text-xs text-white"
                />
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#1E2B4D]/60">
                <span className="text-slate-400">Expected Value:</span>
                <span
                  className={cn(
                    "font-black px-1.5 py-0.5 rounded text-[11px]",
                    ratingHome === "mispriced"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : ratingHome === "value"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-slate-400"
                  )}
                >
                  {evHome > 0 ? `+${evHome}% EV` : `${evHome}% EV`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Quarter-Kelly:</span>
                <span className="font-bold text-[#FDB827]">{kellyHome}% bankroll</span>
              </div>
            </div>
          </div>
        </div>

        {/* Botón de Cierre */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1E2B4D] text-slate-200 hover:text-white hover:bg-[#1E2B4D]/80 transition-colors"
          >
            Cerrar Simulador
          </button>
        </div>
      </div>
    </div>
  );
}
