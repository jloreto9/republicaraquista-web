"use client";

import React, { useState, useEffect } from "react";
import { BattedBall, SprayStats, PitchEvent, StrikeZoneMetrics, SprayPlayerOption } from "@/types/spray";
import { BaseballDiamond } from "./baseball-diamond";
import { StrikeZoneHeatmap } from "./strike-zone-heatmap";
import { LEONES_SPRAY_PLAYERS } from "@/lib/spray-engine";
import { Target, ChevronDown, ShieldCheck, Flame, Compass, Activity } from "lucide-react";

interface SprayViewProps {
  initialPlayerId: number;
  initialBalls: BattedBall[];
  initialStats: SprayStats;
  initialPitches: PitchEvent[];
  initialMetrics: StrikeZoneMetrics;
  players?: SprayPlayerOption[];
}

export function SprayView({
  initialPlayerId,
  initialBalls,
  initialStats,
  initialPitches,
  initialMetrics,
  players = LEONES_SPRAY_PLAYERS,
}: SprayViewProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(initialPlayerId);
  const [playerList, setPlayerList] = useState<SprayPlayerOption[]>(players);
  const [battedBalls, setBattedBalls] = useState<BattedBall[]>(initialBalls);
  const [sprayStats, setSprayStats] = useState<SprayStats>(initialStats);
  const [pitches, setPitches] = useState<PitchEvent[]>(initialPitches);
  const [strikeMetrics, setStrikeMetrics] = useState<StrikeZoneMetrics>(initialMetrics);
  const [colorMode, setColorMode] = useState<"event" | "trajectory" | "hardness">("event");
  const [activeTab, setActiveTab] = useState<"diamond" | "zone">("diamond");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPlayerId === initialPlayerId) {
      if (initialBalls && battedBalls !== initialBalls) {
        setBattedBalls(initialBalls);
        setSprayStats(initialStats);
        setPitches(initialPitches);
        setStrikeMetrics(initialMetrics);
      }
      return;
    }

    let isMounted = true;
    async function loadPlayerData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/spray?player_id=${selectedPlayerId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setBattedBalls(data.battedBalls || []);
          setSprayStats(data.sprayStats || initialStats);
          setPitches(data.pitches || []);
          setStrikeMetrics(data.strikeZoneMetrics || initialMetrics);
          if (data.players) setPlayerList(data.players);
        }
      } catch (err) {
        console.error("Error loading spray data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPlayerData();
    return () => {
      isMounted = false;
    };
  }, [selectedPlayerId, initialPlayerId, initialBalls, initialStats, initialPitches, initialMetrics]);

  return (
    <div className="space-y-6">
      {/* Selector de Bateador y Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Target className="w-4 h-4 text-[#FDB827]" />
          <span>Filtro de Telemetría por Bateador ({playerList.length} disponibles)</span>
        </div>

        {/* Selector de Bateador */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">
            Bateador:
          </label>
          <div className="relative max-w-full sm:max-w-md">
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
              className="appearance-none w-full bg-[#070B19] border border-[#1E2B4D] text-slate-200 text-xs font-medium rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#FDB827]/50"
            >
              {playerList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.count ? `(${p.count} batazos)` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 4 KPIs Clave */}
      <div className="grid grid-cols-2 landscape:grid-cols-4 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1.5 sm:mb-2">
            <span>TOTAL BATAZOS</span>
            <Target className="w-4 h-4 text-[#FDB827]" />
          </div>
          <div className="text-xl font-mono font-extrabold text-slate-100">
            {sprayStats.totalBatted}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Imparables: <span className="text-[#FDB827] font-bold">{sprayStats.totalHits}</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1.5 sm:mb-2">
            <span>BABIP</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-mono font-extrabold text-emerald-400">
            {sprayStats.babip}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Promedio de pelotas en juego
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1.5 sm:mb-2">
            <span>FUERTE (HARD% BIS)</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-mono font-extrabold text-rose-400">
            {sprayStats.hardPct}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Medio: {sprayStats.mediumPct} | Suave: {sprayStats.softPct}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1.5 sm:mb-2">
            <span>DIRECCIÓN PULL</span>
            <Compass className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-mono font-extrabold text-amber-400">
            {sprayStats.pullPct}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Centro: {sprayStats.centerPct} | Banda Contraria: {sprayStats.oppoPct}
          </div>
        </div>
      </div>

      {/* Selector de Tabs */}
      <div className="flex border-b border-[#1E2B4D] gap-2">
        <button
          onClick={() => setActiveTab("diamond")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === "diamond"
              ? "bg-[#0D152B] text-[#FDB827] border-t-2 border-[#FDB827] border-x border-[#1E2B4D]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Spray Chart en Diamante
        </button>
        <button
          onClick={() => setActiveTab("zone")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === "zone"
              ? "bg-[#0D152B] text-[#FDB827] border-t-2 border-[#FDB827] border-x border-[#1E2B4D]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Zona de Strike 3x3 & Disciplina
        </button>
      </div>

      {/* Tab 1: Diamante */}
      {activeTab === "diamond" && (
        <div className="p-5 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-6">
          {/* Controles de color mode */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1E2B4D]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold uppercase">
                Colorear Batazos:
              </span>
              <div className="flex bg-[#070B19] rounded-lg p-1 border border-[#1E2B4D]">
                <button
                  onClick={() => setColorMode("event")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    colorMode === "event"
                      ? "bg-[#FDB827] text-[#070B19]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Por Evento
                </button>
                <button
                  onClick={() => setColorMode("trajectory")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    colorMode === "trajectory"
                      ? "bg-[#FDB827] text-[#070B19]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Por Trayectoria
                </button>
                <button
                  onClick={() => setColorMode("hardness")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    colorMode === "hardness"
                      ? "bg-[#FDB827] text-[#070B19]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Por Dureza (BIS)
                </button>
              </div>
            </div>

            {/* Leyenda interactiva */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
              {colorMode === "event" && (
                <>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2ecc71]" /> 1B</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3498db]" /> 2B</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f39c12]" /> 3B</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#e74c3c]" /> HR</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" /> Out</span>
                </>
              )}
              {colorMode === "trajectory" && (
                <>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" /> Rolling (GB)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" /> Línea (LD)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ec4899]" /> Elevado (FB)</span>
                </>
              )}
              {colorMode === "hardness" && (
                <>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Fuerte (Hard)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" /> Medio (Medium)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Suave (Soft)</span>
                </>
              )}
            </div>
          </div>

          {/* Gráfico de Diamante */}
          {loading ? (
            <div className="h-96 flex items-center justify-center text-slate-400 text-xs">
              Cargando coordenadas de batazos...
            </div>
          ) : (
            <BaseballDiamond battedBalls={battedBalls} colorMode={colorMode} />
          )}

          {/* Resumen de Trayectorias y Direcciones */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-[#1E2B4D] text-xs font-mono">
            <div className="p-3 rounded-lg bg-[#070B19] border border-[#1E2B4D]">
              <span className="text-[10px] text-slate-400 font-sans uppercase">Rollings (GB%)</span>
              <div className="text-base font-bold text-slate-100 mt-1">{sprayStats.gbPct}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#070B19] border border-[#1E2B4D]">
              <span className="text-[10px] text-slate-400 font-sans uppercase">Líneas (LD%)</span>
              <div className="text-base font-bold text-slate-100 mt-1">{sprayStats.ldPct}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#070B19] border border-[#1E2B4D]">
              <span className="text-[10px] text-slate-400 font-sans uppercase">Elevados (FB%)</span>
              <div className="text-base font-bold text-slate-100 mt-1">{sprayStats.fbPct}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#070B19] border border-[#1E2B4D]">
              <span className="text-[10px] text-slate-400 font-sans uppercase">Popups (PU%)</span>
              <div className="text-base font-bold text-slate-100 mt-1">{sprayStats.puPct}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Zona de Strike */}
      {activeTab === "zone" && (
        <div className="p-5 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <StrikeZoneHeatmap pitches={pitches} metrics={strikeMetrics} />
        </div>
      )}

      {/* Nota Metodológica de Prohibición de Statcast */}
      <div className="p-4 rounded-xl bg-[#0D152B]/60 border border-[#1E2B4D] text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Metodología de Contacto BIS vs Statcast</span>
        </div>
        <p>
          En la Liga Venezolana de Béisbol Profesional (LVBP) <strong>no existe infraestructura Hawkeye/Statcast</strong> (cámaras de tracking óptico y radar Doppler). Por tanto, esta plataforma utiliza de manera estricta el modelo sabermétrico de <strong>Baseball Info Solutions (BIS)</strong> basado en eventos reales, distancia en pies y trayectoria de contacto para clasificar la dureza (Hard, Medium, Soft), evitando cualquier extrapolación artificial.
        </p>
      </div>
    </div>
  );
}
