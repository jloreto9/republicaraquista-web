"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PitcherProfile,
  PitcherGameLog,
  PitchGameDataResponse,
  TimeMode,
} from "@/types/pitching";
import { CARACAS_FEATURED_PITCHERS } from "@/lib/pitching-constants";
import { PitchingSearch } from "./pitching-search";
import { PitchingHeader } from "./pitching-header";
import { PBPPanel } from "./pbp-panel";
import { StatcastPanel } from "./statcast-panel";
import { PitchingCardViewer } from "./pitching-card-viewer";
import { PitchingGameLogsTable } from "./pitching-game-logs-table";
import { downloadPitchingCard } from "@/lib/pitch-card-canvas";
import { Loader2, AlertCircle, Sparkles, BarChart3 } from "lucide-react";

export function PitchingView() {
  const [selectedPitcher, setSelectedPitcher] = useState<PitcherProfile>(
    CARACAS_FEATURED_PITCHERS[0]
  );
  const [branch, setBranch] = useState<"lvbp" | "mlb">("lvbp");
  const [timeMode, setTimeMode] = useState<TimeMode>("game");
  const [activeTab, setActiveTab] = useState<"card" | "telemetry">("card");
  const [season, setSeason] = useState<number>(2025);
  const [phase, setPhase] = useState<string>("all");

  const [gameLogs, setGameLogs] = useState<PitcherGameLog[]>([]);
  const [selectedGamePk, setSelectedGamePk] = useState<number>(0);

  const [gameData, setGameData] = useState<PitchGameDataResponse | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isDownloadingCard, setIsDownloadingCard] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // 1. Cargar salidas (Game Logs) cuando cambia lanzador, temporada, rama o fase
  const fetchGameLogs = useCallback(async () => {
    if (!selectedPitcher?.id) return;
    setIsLoadingLogs(true);
    setErrorMsg("");

    try {
      const url = `/api/pitching/game-logs?pitcher_id=${selectedPitcher.id}&season=${season}&branch=${branch}&phase=${phase}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const logs: PitcherGameLog[] = json.logs || [];
        setGameLogs(logs);
        if (logs.length > 0) {
          setSelectedGamePk(logs[0].gamePk);
        } else {
          setSelectedGamePk(0);
          setGameData(null);
        }
      } else {
        setGameLogs([]);
        setSelectedGamePk(0);
        setGameData(null);
      }
    } catch (err) {
      console.error("Error loading game logs:", err);
      setGameLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [selectedPitcher?.id, season, branch, phase]);

  useEffect(() => {
    fetchGameLogs();
  }, [fetchGameLogs]);

  // 2. Cargar detalle del partido o temporada cuando cambia selección o modo temporal
  useEffect(() => {
    if (!selectedPitcher?.id) {
      setGameData(null);
      return;
    }

    if (timeMode === "game" && !selectedGamePk) {
      setGameData(null);
      return;
    }

    let isMounted = true;
    setIsLoadingData(true);
    setErrorMsg("");

    const fetchDetail = async () => {
      try {
        const url =
          timeMode === "season"
            ? `/api/pitching/season-data?pitcher_id=${selectedPitcher.id}&season=${season}&branch=${branch}&phase=${phase}`
            : `/api/pitching/game-data?game_pk=${selectedGamePk}&pitcher_id=${selectedPitcher.id}&is_lvbp=${
                branch === "lvbp"
              }`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setGameData(json);
        } else {
          if (isMounted) {
            setErrorMsg(
              timeMode === "season"
                ? "No se pudieron calcular los datos de la temporada para este lanzador"
                : "No se pudieron cargar los datos de pitcheo de este juego"
            );
            setGameData(null);
          }
        }
      } catch (err) {
        console.error("Error loading pitch data:", err);
        if (isMounted) setErrorMsg("Error de conexión al cargar la telemetría");
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [timeMode, selectedGamePk, selectedPitcher?.id, season, branch, phase]);

  // 3. Obtener el GameLog activo (salida individual o temporada consolidada)
  const activeGameLog: PitcherGameLog | undefined =
    timeMode === "season"
      ? {
          gamePk: 0,
          date: `Temporada ${season}`,
          opponent: "Todos los Rivales",
          isStarter: gameData?.isStarter ?? false,
          role: "Temporada",
          gameType: phase,
          phase: phase,
          ip: gameData?.boxscore.ip || "0.0",
          h: gameData?.boxscore.h || 0,
          r: gameData?.boxscore.r || 0,
          er: gameData?.boxscore.er || 0,
          bb: gameData?.boxscore.bb || 0,
          so: gameData?.boxscore.so || 0,
          hr: 0,
          pitches: gameData?.boxscore.pitches || 0,
          strikes: gameData?.boxscore.strikes || 0,
          era: gameData?.boxscore.era || "0.00",
          decision: (gameData?.decision as any) || "",
          league: branch === "lvbp" ? "LVBP" : "MLB",
        }
      : gameLogs.find((l) => l.gamePk === selectedGamePk) || gameLogs[0];

  // 4. Manejador de descarga de tarjeta HD
  const handleDownloadCard = async () => {
    if (!gameData || !selectedPitcher || !activeGameLog) return;
    setIsDownloadingCard(true);
    try {
      await downloadPitchingCard(gameData, selectedPitcher, activeGameLog, branch, gameLogs);
    } catch (err) {
      console.error("Error generating pitch card:", err);
    } finally {
      setIsDownloadingCard(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Search Header */}
      <PitchingSearch
        onSelectPitcher={(pitcher) => {
          setSelectedPitcher(pitcher);
          // Si el lanzador tiene historial de Caracas, default a lvbp, sino mlb
          if (!pitcher.hasCaracasHistory && !pitcher.hasLvbpHistory) {
            setBranch("mlb");
          }
        }}
        selectedPitcherId={selectedPitcher?.id}
      />

      {/* Main Pitching Header */}
      <PitchingHeader
        pitcher={selectedPitcher}
        branch={branch}
        onChangeBranch={(b) => setBranch(b)}
        timeMode={timeMode}
        onChangeTimeMode={(m) => setTimeMode(m)}
        season={season}
        onChangeSeason={(s) => setSeason(s)}
        phase={phase}
        onChangePhase={(p) => setPhase(p)}
        gameLogs={gameLogs}
        selectedGamePk={selectedGamePk}
        onSelectGamePk={(pk) => setSelectedGamePk(pk)}
        onDownloadCard={handleDownloadCard}
        isDownloadingCard={isDownloadingCard}
      />

      {/* Pestañas de Navegación idénticas a Streamlit (RepubliCaraquistApp) */}
      <div className="flex border-b border-[#1E2B4D] gap-2 pt-2">
        <button
          onClick={() => setActiveTab("card")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "card"
              ? "border-[#FDB827] text-[#FDB827] bg-[#0D152B]/80 shadow-sm"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#0D152B]/30"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>🎨 Tarjeta HD Oficial (Thomas Nestico)</span>
        </button>

        <button
          onClick={() => setActiveTab("telemetry")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "telemetry"
              ? "border-[#FDB827] text-[#FDB827] bg-[#0D152B]/80 shadow-sm"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#0D152B]/30"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>📊 Telemetría & Gráficos Interactivos</span>
        </button>
      </div>

      {/* Content Area */}
      {isLoadingLogs || isLoadingData ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-[#0D152B]/40 rounded-2xl border border-[#1E2B4D]">
          <Loader2 className="w-8 h-8 text-[#FDB827] animate-spin mb-3" />
          <span className="text-xs text-slate-300 font-mono">
            Procesando telemetría y pitcheos de {selectedPitcher.name}...
          </span>
        </div>
      ) : errorMsg ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center bg-[#0D152B]/40 rounded-2xl border border-rose-900/40 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
          <p className="text-sm font-semibold text-rose-200">{errorMsg}</p>
          <span className="text-xs text-slate-400 mt-1">
            Prueba seleccionando otra salida o cambiando de temporada.
          </span>
        </div>
      ) : !gameData || (timeMode === "game" && gameLogs.length === 0) || !activeGameLog ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center bg-[#0D152B]/40 rounded-2xl border border-[#1E2B4D] p-6 text-center">
          <span className="text-2xl mb-2">⚾</span>
          <h4 className="text-sm font-bold text-slate-200">
            Sin salidas registradas en esta temporada ({season})
          </h4>
          <p className="text-xs text-slate-400 max-w-md mt-1">
            {selectedPitcher.name} no presenta apariciones {branch === "lvbp" ? "en la LVBP" : "en MLB"} para el año seleccionado. Intenta cambiar de año o alternar entre la rama LVBP y MLB.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full space-y-8">
          {activeTab === "card" ? (
            <PitchingCardViewer
              data={gameData}
              pitcher={selectedPitcher}
              gameLog={activeGameLog}
              branch={branch}
              gameLogs={gameLogs}
            />
          ) : branch === "lvbp" ? (
            <PBPPanel data={gameData} pitcherName={selectedPitcher.name} />
          ) : (
            <StatcastPanel data={gameData} pitcherName={selectedPitcher.name} />
          )}

          {/* Sección de Historial de Salidas / Últimos 10 Juegos con Rol Destacado (idéntico a Streamlit) */}
          <PitchingGameLogsTable
            gameLogs={gameLogs}
            selectedGamePk={timeMode === "game" ? selectedGamePk : undefined}
            onSelectGamePk={(pk) => {
              if (timeMode !== "game") setTimeMode("game");
              setSelectedGamePk(pk);
            }}
            title="Historial de Salidas del Período (Últimos 10 Juegos)"
            maxRows={10}
          />
        </div>
      )}
    </div>
  );
}
