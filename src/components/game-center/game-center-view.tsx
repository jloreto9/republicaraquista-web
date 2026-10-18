"use client";

import { useState, useEffect, useCallback } from "react";
import { GameCenterData } from "@/types/game-center";
import { GameHeroMatchup } from "./game-hero-matchup";
import { LiveCount } from "./live-count";
import { InteractiveDiamond } from "./interactive-diamond";
import { CurrentMatchupCard } from "./current-matchup-card";
import { LinescoreTable } from "./linescore-table";
import { PlayByPlayFeed } from "./play-by-play-feed";
import { BoxscoreLineupsTab } from "./boxscore-lineups-tab";
import { StadiumBroadcastTab } from "./stadium-broadcast-tab";
import { LayoutGrid, Users, MapPin, Radio } from "lucide-react";

interface GameCenterViewProps {
  initialData: GameCenterData;
}

export function GameCenterView({ initialData }: GameCenterViewProps) {
  const [gameData, setGameData] = useState<GameCenterData>(initialData);
  const [selectedGamePk, setSelectedGamePk] = useState<number>(initialData.gamePk);
  const [activeTab, setActiveTab] = useState<"gamecast" | "boxscore" | "stadium">("gamecast");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Función para refrescar datos de un juego específico
  const fetchGame = useCallback(async (pk: number) => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/game-center?gamePk=${pk}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setGameData(json.data);
          setSelectedGamePk(pk);
        }
      }
    } catch (err) {
      console.error("Error al refrescar Game Center:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Polling automático cada 15s si el juego está en vivo
  useEffect(() => {
    if (gameData.status !== "Live") return;

    const intervalId = setInterval(() => {
      fetchGame(selectedGamePk);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [gameData.status, selectedGamePk, fetchGame]);

  const handleSelectGame = (newPk: number) => {
    fetchGame(newPk);
  };

  const handleManualRefresh = () => {
    fetchGame(selectedGamePk);
  };

  return (
    <div className="space-y-6">
      {/* ── HERO DEL PARTIDO Y SELECTOR ── */}
      <GameHeroMatchup
        homeTeam={gameData.homeTeam}
        awayTeam={gameData.awayTeam}
        status={gameData.status}
        statusLabel={gameData.statusLabel}
        detailedState={gameData.detailedState}
        date={gameData.date}
        time={gameData.time}
        venue={gameData.venue}
        availableGames={gameData.availableGames}
        selectedGamePk={selectedGamePk}
        onSelectGame={handleSelectGame}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      {/* ── BARRA DE PESTAÑAS (TABS) ── */}
      <div className="flex items-center space-x-2 border-b border-[#1E2B4D] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("gamecast")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === "gamecast"
              ? "bg-[#1E2B4D] text-[#FDB827] border border-[#FDB827]/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>GameCast (Segunda Pantalla)</span>
        </button>

        <button
          onClick={() => setActiveTab("boxscore")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === "boxscore"
              ? "bg-[#1E2B4D] text-[#FDB827] border border-[#FDB827]/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Alineaciones & Boxscore</span>
        </button>

        <button
          onClick={() => setActiveTab("stadium")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === "stadium"
              ? "bg-[#1E2B4D] text-[#FDB827] border border-[#FDB827]/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Estadio & Transmisiones</span>
        </button>
      </div>

      {/* ── CONTENIDO DE LAS PESTAÑAS ── */}
      {activeTab === "gamecast" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMNA IZQUIERDA: DIAMANTE, CONTEO Y MARCADOR (7/12) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InteractiveDiamond
                bases={gameData.bases}
                batter={gameData.batter}
                pitcher={gameData.pitcher}
              />
              <div className="flex flex-col justify-between space-y-4">
                <LiveCount
                  count={gameData.count}
                  inning={gameData.currentInning}
                  inningHalf={gameData.inningHalf}
                  isTopInning={gameData.isTopInning}
                  status={gameData.status}
                />
                <div className="p-4 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1E2B4D]">
                    <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                      ESTATUS OFICIAL
                    </span>
                    <span className="font-mono text-[#FDB827] font-bold">
                      {gameData.detailedState}
                    </span>
                  </div>
                  <div className="text-slate-300 leading-relaxed text-[11px]">
                    {gameData.status === "Live"
                      ? "Juego en desarrollo. Las bases y conteo se actualizan en tiempo real conforme a la telemetría oficial de MLB Winter Leagues."
                      : "Encuentro concluido. Puede consultar el boxscore completo, jugada a jugada o elegir otro partido de la temporada en el selector superior."}
                  </div>
                </div>
              </div>
            </div>

            <LinescoreTable
              linescore={gameData.linescore}
              homeTeam={gameData.homeTeam}
              awayTeam={gameData.awayTeam}
            />

            <CurrentMatchupCard
              batter={gameData.batter}
              pitcher={gameData.pitcher}
            />
          </div>

          {/* COLUMNA DERECHA: JUGADA A JUGADA FEED (5/12) */}
          <div className="lg:col-span-5">
            <PlayByPlayFeed plays={gameData.plays} />
          </div>
        </div>
      )}

      {activeTab === "boxscore" && (
        <BoxscoreLineupsTab
          homeTeam={gameData.homeTeam}
          awayTeam={gameData.awayTeam}
          awayBatters={gameData.boxscore.awayBatters}
          homeBatters={gameData.boxscore.homeBatters}
          awayPitchers={gameData.boxscore.awayPitchers}
          homePitchers={gameData.boxscore.homePitchers}
        />
      )}

      {activeTab === "stadium" && (
        <StadiumBroadcastTab
          venue={gameData.venue}
          venueCity={gameData.venueCity}
        />
      )}
    </div>
  );
}
