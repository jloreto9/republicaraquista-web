"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { TickerGame, TickerResponse } from "@/types/ticker";
import { useSeason } from "@/context/season-context";

export function LiveTicker() {
  const { season } = useSeason();
  const [games, setGames] = useState<TickerGame[]>([]);
  const [dateLabel, setDateLabel] = useState<string>("Jornada LVBP");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const hasLiveRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  const fetchTicker = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }

    try {
      isFetchingRef.current = true;
      const res = await fetch(`/api/ticker?season=${season}&v=2`);
      if (res.ok) {
        const json: TickerResponse = await res.json();
        if (json.success && json.games) {
          hasLiveRef.current = json.games.some((g) => g.isLive);
          setGames((prev) => {
            const isSame =
              prev.length === json.games.length &&
              prev.every(
                (g, i) =>
                  g.id === json.games[i].id &&
                  g.statusLabel === json.games[i].statusLabel &&
                  g.isLive === json.games[i].isLive &&
                  g.homeTeam.score === json.games[i].homeTeam.score &&
                  g.awayTeam.score === json.games[i].awayTeam.score
              );
            return isSame ? prev : json.games;
          });
          if (json.dateLabel) setDateLabel(json.dateLabel);
        }
      }
    } catch (err) {
      console.error("Error al cargar ticker de partidos:", err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [season]);

  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const scheduleNext = () => {
      if (!isMounted) return;
      // Intervalo seguro: mínimo 60s si hay juegos en vivo, 120s si no hay
      const intervalMs = hasLiveRef.current ? 60000 : 120000;
      timerId = setTimeout(async () => {
        await fetchTicker();
        scheduleNext();
      }, intervalMs);
    };

    // Carga inicial
    fetchTicker().then(() => {
      scheduleNext();
    });

    // Pausa / reanudación según visibilidad de pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (timerId) clearTimeout(timerId);
        fetchTicker().then(() => {
          scheduleNext();
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchTicker]);

  if (isLoading && games.length === 0) {
    return (
      <div className="h-9 w-full bg-[#070B19] border-b border-[#1E2B4D]/60 flex items-center px-4 overflow-hidden shrink-0">
        <div className="animate-pulse flex space-x-6 w-full">
          <div className="h-4 w-12 bg-[#131E3D] rounded" />
          <div className="h-4 w-28 bg-[#131E3D] rounded" />
          <div className="h-4 w-28 bg-[#131E3D] rounded" />
          <div className="h-4 w-28 bg-[#131E3D] rounded" />
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return null;
  }

  const hasLive = games.some((g) => g.isLive);

  return (
    <div
      role="region"
      aria-label="Marcador en vivo de la LVBP"
      className="h-9 w-full bg-[#070B19] border-b border-[#1E2B4D]/80 flex items-center px-3 sm:px-4 overflow-x-auto no-scrollbar shrink-0 select-none z-10 antialiased transform-gpu"
    >
      <div className="flex items-center space-x-3 shrink-0 mr-3 pr-3 border-r border-[#1E2B4D]/80">
        {hasLive ? (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold tracking-wider uppercase animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            EN VIVO
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-[#131E3D]/80 border border-[#1E2B4D] text-[#FDB827] font-mono text-[10px] font-bold tracking-wider uppercase">
            {dateLabel.includes("Ayer") ? "AYER" : "LVBP"}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 text-xs font-mono antialiased">
        {games.map((g) => {
          const isCaracas = g.homeTeam.isLeones || g.awayTeam.isLeones;
          const awayWon = g.awayTeam.isWinner;
          const homeWon = g.homeTeam.isWinner;

          return (
            <Link
              key={g.id}
              href={`/game-center?gamePk=${g.gamePk}`}
              className={`flex items-center space-x-2 px-2.5 py-1 rounded-lg transition-colors shrink-0 hover:bg-[#131E3D] border ${
                g.isLive
                  ? "bg-[#0D152B] border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                  : isCaracas
                  ? "bg-[#0D152B]/80 border-[#FDB827]/30"
                  : "bg-[#0A1020]/50 border-transparent hover:border-[#1E2B4D]"
              }`}
            >
              {/* Indicador de estado */}
              {g.isLive ? (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {g.statusLabel}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">
                  {g.statusLabel}
                </span>
              )}

              {/* Matchup y Marcador */}
              <div className="flex items-center space-x-1.5">
                {/* Visitante */}
                <span
                  className={`${
                    g.awayTeam.isLeones
                      ? "text-[#FDB827] font-bold"
                      : awayWon
                      ? "text-slate-100 font-bold"
                      : "text-slate-400"
                  }`}
                >
                  {g.awayTeam.abbreviation}
                </span>
                <span
                  className={`${
                    awayWon
                      ? "text-slate-100 font-bold"
                      : g.awayTeam.isLeones
                      ? "text-[#FDB827] font-bold"
                      : "text-slate-300"
                  }`}
                >
                  {g.awayTeam.score}
                </span>

                <span className="text-slate-600">–</span>

                {/* Local */}
                <span
                  className={`${
                    homeWon
                      ? "text-slate-100 font-bold"
                      : g.homeTeam.isLeones
                      ? "text-[#FDB827] font-bold"
                      : "text-slate-300"
                  }`}
                >
                  {g.homeTeam.score}
                </span>
                <span
                  className={`${
                    g.homeTeam.isLeones
                      ? "text-[#FDB827] font-bold"
                      : homeWon
                      ? "text-slate-100 font-bold"
                      : "text-slate-400"
                  }`}
                >
                  {g.homeTeam.abbreviation}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
