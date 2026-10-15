"use client";

import React, { useState, useEffect } from "react";
import { BattedBall, SprayStats, PitchEvent, StrikeZoneMetrics, SprayPlayerOption } from "@/types/spray";
import { BaseballDiamond } from "./baseball-diamond";
import { StrikeZoneHeatmap } from "./strike-zone-heatmap";
import { StadiumSimulatorView } from "./stadium-simulator-view";
import { LEONES_SPRAY_PLAYERS } from "@/lib/spray-engine";
import { Target, ChevronDown, ShieldCheck, Flame, Compass, Activity, Building2 } from "lucide-react";
import { useSeason } from "@/context/season-context";

interface SprayViewProps {
  initialPlayerId: number;
  initialBalls: BattedBall[];
  initialStats: SprayStats;
  initialPitches: PitchEvent[];
  initialMetrics: StrikeZoneMetrics;
  players?: SprayPlayerOption[];
  season?: number;
}

export function SprayView({
  initialPlayerId,
  initialBalls,
  initialStats,
  initialPitches,
  initialMetrics,
  players = LEONES_SPRAY_PLAYERS,
  season = 2026,
}: SprayViewProps) {
  const { season: globalSeason, setSeason: setGlobalSeason } = useSeason();
  const [currentSeason, setCurrentSeason] = useState<number>(globalSeason || season);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(initialPlayerId);
  const [playerList, setPlayerList] = useState<SprayPlayerOption[]>(players);
  const [battedBalls, setBattedBalls] = useState<BattedBall[]>(initialBalls);
  const [sprayStats, setSprayStats] = useState<SprayStats>(initialStats);
  const [pitches, setPitches] = useState<PitchEvent[]>(initialPitches);
  const [strikeMetrics, setStrikeMetrics] = useState<StrikeZoneMetrics>(initialMetrics);
  const [colorMode, setColorMode] = useState<"event" | "trajectory" | "hardness">("event");
  const [activeTab, setActiveTab] = useState<"diamond" | "dong" | "zone">("diamond");
  const [loading, setLoading] = useState(false);

  // Conmutador de temporada con sincronización global
  const handleSeasonChange = async (newSeason: number) => {
    setCurrentSeason(newSeason);
    setGlobalSeason(newSeason);
    setLoading(true);
    try {
      const res = await fetch(`/api/spray?season=${newSeason}`);
      if (res.ok) {
        const data = await res.json();
        const newPlayers: SprayPlayerOption[] = data.players || [];
        setPlayerList(newPlayers);

        // Mantener mismo bateador si existe en la nueva temporada, o seleccionar el primero
        const exists = newPlayers.some((p) => p.id === selectedPlayerId);
        const nextPlayerId = exists ? selectedPlayerId : (newPlayers[0]?.id || 0);
        setSelectedPlayerId(nextPlayerId);

        if (nextPlayerId) {
          const pRes = await fetch(`/api/spray?player_id=${nextPlayerId}&season=${newSeason}`);
          if (pRes.ok) {
            const pData = await pRes.json();
            setBattedBalls(pData.battedBalls || []);
            setSprayStats(pData.sprayStats || initialStats);
            setPitches(pData.pitches || []);
            setStrikeMetrics(pData.strikeZoneMetrics || initialMetrics);
          }
        } else {
          setBattedBalls(data.battedBalls || []);
          setSprayStats(data.sprayStats || initialStats);
          setPitches(data.pitches || []);
          setStrikeMetrics(data.strikeZoneMetrics || initialMetrics);
        }
      }
    } catch (err) {
      console.error("Error changing season in spray:", err);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar si la temporada global cambia en el Header
  useEffect(() => {
    if (globalSeason && globalSeason !== currentSeason) {
      handleSeasonChange(globalSeason);
    }
  }, [globalSeason]);

  // Sincronizar props cuando el servidor renderiza datos nuevos
  useEffect(() => {
    if (initialBalls && initialBalls.length > 0) {
      setBattedBalls(initialBalls);
    }
  }, [initialBalls]);

  useEffect(() => {
    if (initialStats) {
      setSprayStats(initialStats);
    }
  }, [initialStats]);

  useEffect(() => {
    if (players && players.length > 0) {
      setPlayerList(players);
    }
  }, [players]);

  // Si en el cliente solo hay 21 batazos o menos en temporada activa (caso de un solo juego inicial), refrescar
  useEffect(() => {
    if (currentSeason >= 2026 && battedBalls.length <= 21) {
      handleSeasonChange(currentSeason);
    }
  }, []);

  // Carga reactiva de datos al cambiar de bateador
  useEffect(() => {
    if (!selectedPlayerId) return;

    let isMounted = true;
    async function loadPlayerData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/spray?player_id=${selectedPlayerId}&season=${currentSeason}`);
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
  }, [selectedPlayerId, currentSeason]);

  // Conteo de batazos profundos que califican para el simulador
  const deepBallsCount = battedBalls.filter(
    (b) => (b.distanceFt && b.distanceFt >= 300) || b.event === "Home Run"
  ).length;

  return (
    <div className="space-y-6">
      {/* ── Switcher Superior de Temporada & Selector de Bateador ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D] shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
              <Target className="w-4 h-4 text-[#FDB827]" />
              <span>Spray Charts & Disciplina en Home</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/20 font-mono font-bold">
              {currentSeason}-{String(currentSeason + 1).slice(-2)}
            </span>
            {loading && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono animate-pulse">
                Cargando...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {currentSeason === 2026
              ? `Temporada 2026-27 en curso (${playerList.length} bateadores de Leones con telemetría)`
              : `Línea base histórica auditada 2025-26 (${playerList.length} bateadores disponibles)`}
          </p>
        </div>

        {/* Controles: Temporada y Bateador */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Temporada */}
          <div className="flex items-center gap-1.5 bg-[#070B19] px-2.5 py-1.5 rounded-lg border border-[#1E2B4D]">
            <span className="text-[11px] text-slate-400 font-medium">Temporada:</span>
            <select
              value={currentSeason}
              onChange={(e) => handleSeasonChange(Number(e.target.value))}
              className="bg-transparent text-[#FDB827] text-xs font-bold font-mono focus:outline-none cursor-pointer"
            >
              <option value={2026} className="bg-[#070B19] text-slate-200">2026-27 (En Curso)</option>
              <option value={2025} className="bg-[#070B19] text-slate-200">2025-26</option>
            </select>
          </div>

          {/* Selector de Bateador */}
          <div className="flex items-center gap-2 max-w-full sm:max-w-md">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">
              Bateador:
            </span>
            <div className="relative flex-1">
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
                className="appearance-none w-full bg-[#070B19] border border-[#1E2B4D] text-slate-200 text-xs font-medium rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:border-[#FDB827]/50 cursor-pointer"
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
          <div className="text-xl font-mono font-extrabold text-slate-100">
            {sprayStats.babip}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Hard Contact: <span className="text-emerald-400 font-bold">{sprayStats.hardPct}</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1.5 sm:mb-2">
            <span>DIRECCIÓN PULL</span>
            <Compass className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-mono font-extrabold text-slate-100">
            {sprayStats.pullPct}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Center: <span className="text-slate-300 font-bold">{sprayStats.centerPct}</span> • Oppo:{" "}
            <span className="text-slate-300 font-bold">{sprayStats.oppoPct}</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1.5 sm:mb-2">
            <span>PODER AL AIRE (FB)</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-mono font-extrabold text-slate-100">
            {sprayStats.fbPct}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Líneas (LD): <span className="text-slate-300 font-bold">{sprayStats.ldPct}</span>
          </div>
        </div>
      </div>

      {/* ── Tabs de Navegación Interna (3 Secciones Separadas) ── */}
      <div className="flex border-b border-[#1E2B4D] overflow-x-auto">
        <button
          onClick={() => setActiveTab("diamond")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all whitespace-nowrap ${
            activeTab === "diamond"
              ? "bg-[#0D152B] text-[#FDB827] border-t-2 border-[#FDB827] border-x border-[#1E2B4D]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Diamante de Batazos (Spray Chart)
        </button>

        <button
          onClick={() => setActiveTab("dong")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "dong"
              ? "bg-[#0D152B] text-[#FDB827] border-t-2 border-[#FDB827] border-x border-[#1E2B4D]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-[#FDB827]" />
          <span>Emulador de Estadios & "Would It Dong?"</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/20 font-mono">
            {deepBallsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("zone")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all whitespace-nowrap ${
            activeTab === "zone"
              ? "bg-[#0D152B] text-[#FDB827] border-t-2 border-[#FDB827] border-x border-[#1E2B4D]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Zona de Strike 3x3 & Disciplina
        </button>
      </div>

      {/* ── Sección 1: Diamante Tradicional (Puro y Limpio, Sin Sobrecarga) ── */}
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

          {/* Gráfico de Diamante Limpio */}
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

      {/* ── Sección 2: Emulador de Estadios & Would It Dong? (Sección Dedicada) ── */}
      {activeTab === "dong" && (
        <StadiumSimulatorView
          battedBalls={battedBalls}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
        />
      )}

      {/* ── Sección 3: Zona de Strike 3x3 ── */}
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
          En la Liga Venezolana de Béisbol Profesional (LVBP) <strong>no existe infraestructura Hawkeye/Statcast</strong> (cámaras de tracking óptico y radar Doppler). Por tanto, esta plataforma utiliza de manera estricta el modelo sabermétrico de <strong>Baseball Info Solutions (BIS)</strong> basado en eventos reales, distancia en pies y trayectoria de contacto para clasificar la dureza (Hard, Medium, Soft), evitando cualquier extrapolación artificial. La emulación de estadios ("HR en X/8") se basa en las dimensiones geométricas y curvatura radial real de las bardas de los parques de la LVBP.
        </p>
      </div>
    </div>
  );
}
