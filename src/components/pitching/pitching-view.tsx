"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PitcherProfile,
  PitcherGameLog,
  PitchGameDataResponse,
} from "@/types/pitching";
import { CARACAS_FEATURED_PITCHERS } from "@/lib/pitching-constants";
import { PitchingSearch } from "./pitching-search";
import { PitchingHeader } from "./pitching-header";
import { PBPPanel } from "./pbp-panel";
import { StatcastPanel } from "./statcast-panel";
import { downloadPitchingCard } from "@/lib/pitch-card-canvas";
import { Loader2, AlertCircle } from "lucide-react";

export function PitchingView() {
  const [selectedPitcher, setSelectedPitcher] = useState<PitcherProfile>(
    CARACAS_FEATURED_PITCHERS[0]
  );
  const [branch, setBranch] = useState<"lvbp" | "mlb">("lvbp");
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

  // 2. Cargar detalle del partido cuando cambia el juego seleccionado
  useEffect(() => {
    if (!selectedGamePk || !selectedPitcher?.id) {
      setGameData(null);
      return;
    }

    let isMounted = true;
    setIsLoadingData(true);
    setErrorMsg("");

    const fetchDetail = async () => {
      try {
        const url = `/api/pitching/game-data?game_pk=${selectedGamePk}&pitcher_id=${selectedPitcher.id}&is_lvbp=${
          branch === "lvbp"
        }`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setGameData(json);
        } else {
          if (isMounted) {
            setErrorMsg("No se pudieron cargar los datos de pitcheo de este juego");
            setGameData(null);
          }
        }
      } catch (err) {
        console.error("Error loading game data:", err);
        if (isMounted) setErrorMsg("Error de conexión al cargar la telemetría");
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedGamePk, selectedPitcher?.id, branch]);

  // 3. Manejador de descarga de tarjeta HD
  const handleDownloadCard = async () => {
    if (!gameData || !selectedPitcher) return;
    const currentLog = gameLogs.find((l) => l.gamePk === selectedGamePk) || gameLogs[0];
    if (!currentLog) return;

    setIsDownloadingCard(true);
    try {
      await downloadPitchingCard(gameData, selectedPitcher, currentLog, branch);
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
      ) : !gameData || gameLogs.length === 0 ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center bg-[#0D152B]/40 rounded-2xl border border-[#1E2B4D] p-6 text-center">
          <span className="text-2xl mb-2">⚾</span>
          <h4 className="text-sm font-bold text-slate-200">
            Sin salidas registradas en esta temporada ({season})
          </h4>
          <p className="text-xs text-slate-400 max-w-md mt-1">
            {selectedPitcher.name} no presenta apariciones con {branch === "lvbp" ? "en la LVBP" : "en MLB"} para el año seleccionado. Intenta cambiar de año o alternar entre la rama LVBP y MLB.
          </p>
        </div>
      ) : branch === "lvbp" ? (
        <PBPPanel data={gameData} pitcherName={selectedPitcher.name} />
      ) : (
        <StatcastPanel data={gameData} pitcherName={selectedPitcher.name} />
      )}
    </div>
  );
}
