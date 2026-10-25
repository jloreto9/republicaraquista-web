"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GameCenterData } from "@/types/game-center";
import { GameHeroMatchup } from "./game-hero-matchup";
import { LiveCount } from "./live-count";
import { InteractiveDiamond } from "./interactive-diamond";
import { CurrentMatchupCard } from "./current-matchup-card";
import { LinescoreTable } from "./linescore-table";
import { PlayByPlayFeed } from "./play-by-play-feed";
import { BoxscoreLineupsTab } from "./boxscore-lineups-tab";
import { StadiumBroadcastTab } from "./stadium-broadcast-tab";
import { LayoutGrid, Users, Radio, Bell, BellRing, Check, Volume2 } from "lucide-react";
import {
  isPushNotificationSupported,
  subscribeToPush,
  DEFAULT_PREFERENCES,
  getNotificationPermission,
} from "@/lib/push-client";

interface GameCenterViewProps {
  initialData: GameCenterData;
}

export function GameCenterView({ initialData }: GameCenterViewProps) {
  const [gameData, setGameData] = useState<GameCenterData>(initialData);
  const [selectedGamePk, setSelectedGamePk] = useState<number>(initialData.gamePk);
  const [activeTab, setActiveTab] = useState<"gamecast" | "boxscore" | "stadium">("gamecast");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [notificationSuccess, setNotificationSuccess] = useState<boolean>(false);

  // Referencia al marcador anterior para detectar carreras en tiempo real
  const prevScoreRef = useRef<{
    gamePk: number;
    homeScore: number;
    awayScore: number;
  }>({
    gamePk: initialData.gamePk,
    homeScore: initialData.homeTeam.score,
    awayScore: initialData.awayTeam.score,
  });

  // Comprobar permisos de notificación al montar
  useEffect(() => {
    if (typeof window !== "undefined" && isPushNotificationSupported()) {
      setPushPermission(getNotificationPermission());
    }
  }, []);

  // Función para activar notificaciones de carreras desde el Game Center
  const handleEnableNotifications = async () => {
    setIsSubscribing(true);
    try {
      const res = await subscribeToPush(
        {
          game_status: true,
          scoring_plays: true,
          extra_innings: true,
          news_roster: true,
        },
        true // Enviar prueba inmediata
      );

      if (res.success) {
        setPushPermission("granted");
        setNotificationSuccess(true);
        setTimeout(() => setNotificationSuccess(false), 4000);
      }
    } catch (err) {
      console.error("Error al activar notificaciones en Game Center:", err);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Función para refrescar datos de un juego específico
  const fetchGame = useCallback(async (pk: number) => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/game-center?gamePk=${pk}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const newData: GameCenterData = json.data;

          // ── DETECCIÓN AUTOMÁTICA DE CARRERAS EN VIVO ──
          if (
            prevScoreRef.current.gamePk === pk &&
            (newData.homeTeam.score > prevScoreRef.current.homeScore ||
              newData.awayTeam.score > prevScoreRef.current.awayScore)
          ) {
            const isHomeLeones = newData.homeTeam.isLeones;
            const leonesScored = isHomeLeones
              ? newData.homeTeam.score > prevScoreRef.current.homeScore
              : newData.awayTeam.score > prevScoreRef.current.awayScore;

            const scoringTeamName = isHomeLeones
              ? newData.homeTeam.score > prevScoreRef.current.homeScore
                ? newData.homeTeam.name
                : newData.awayTeam.name
              : newData.awayTeam.score > prevScoreRef.current.awayScore
              ? newData.awayTeam.name
              : newData.homeTeam.name;

            const title = leonesScored
              ? "🦁 ¡CARRERA DE LEONES DEL CARACAS!"
              : `⚾ Carrera de ${scoringTeamName}`;

            // Buscar descripción de la jugada anotadora más reciente
            const scoringPlay = newData.plays?.find((p) => p.isScoringPlay);
            const playDesc = scoringPlay ? scoringPlay.description : "Anotación registrada en la pizarra.";
            const body = `${playDesc} — Marcador: ${newData.awayTeam.name} ${newData.awayTeam.score} - ${newData.homeTeam.name} ${newData.homeTeam.score} (${newData.linescore.currentInningOrdinal} ${newData.linescore.inningHalf === "Top" ? "Alta" : "Baja"}).`;

            // 1. Notificación local directa en el dispositivo (Android / PC) con vibración
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready
                  .then((reg) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (reg as any).showNotification(title, {
                      body,
                      icon: "/icon-512.png",
                      badge: "/favicon.ico",
                      vibrate: [300, 150, 300, 150, 500],
                      tag: `scoring-${pk}-${newData.homeTeam.score}-${newData.awayTeam.score}`,
                      data: { url: `/game-center?gamePk=${pk}` },
                    });
                  })
                  .catch(() => {});
              }
            }

            // 2. Despacho al backend para enviar Web Push a todos los suscriptores en segundo plano
            fetch("/api/push/broadcast-scoring", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gamePk: pk,
                homeScore: newData.homeTeam.score,
                awayScore: newData.awayTeam.score,
                title,
                body,
              }),
            }).catch((err) => console.warn("Error despachando push de carrera:", err));
          }

          // Actualizar memoria del marcador
          prevScoreRef.current = {
            gamePk: pk,
            homeScore: newData.homeTeam.score,
            awayScore: newData.awayTeam.score,
          };

          setGameData(newData);
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

      {/* ── BANNER DE ALERTAS PUSH DE CARRERAS (GAME CENTER) ── */}
      {typeof window !== "undefined" && isPushNotificationSupported() && (
        <div className="rounded-2xl p-3.5 bg-gradient-to-r from-[#0D152B] to-[#142042] border border-[#1E2B4D] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="w-9 h-9 rounded-xl bg-[#FDB827]/15 border border-[#FDB827]/30 flex items-center justify-center shrink-0 text-[#FDB827]">
              {pushPermission === "granted" ? (
                <BellRing className="w-5 h-5 text-emerald-400 animate-pulse" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>Alertas Push de Carreras en Vivo</span>
                {pushPermission === "granted" && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ACTIVAS
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-slate-400">
                {pushPermission === "granted"
                  ? "Tu dispositivo vibrará y te avisará inmediatamente en cada carrera de este partido."
                  : "Activa las alertas para que tu teléfono vibre y te notifique cada vez que Leones anote una carrera."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {pushPermission !== "granted" ? (
              <button
                onClick={handleEnableNotifications}
                disabled={isSubscribing}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#FDB827] text-[#070B19] font-bold text-xs hover:bg-[#FDB827]/90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isSubscribing ? (
                  <span>Conectando...</span>
                ) : (
                  <>
                    <BellRing className="w-4 h-4" />
                    <span>Activar Alertas de Carreras</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleEnableNotifications}
                disabled={isSubscribing}
                className="px-3 py-1.5 rounded-xl bg-[#1E2B4D]/60 hover:bg-[#1E2B4D] border border-slate-700/60 text-slate-300 font-medium text-[11px] transition-all flex items-center gap-1.5"
                title="Enviar notificación de prueba al teléfono"
              >
                {notificationSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">¡Vibrando teléfono!</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#FDB827]" />
                    <span>Probar Alerta en Teléfono</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

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
