"use client";

import Link from "next/link";
import Image from "next/image";
import { GameCenterData } from "@/types/game-center";
import { ExternalLink, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveHeroGameCardProps {
  game: GameCenterData;
}

export function LiveHeroGameCard({ game }: LiveHeroGameCardProps) {
  const {
    homeTeam,
    awayTeam,
    linescore,
    count,
    bases,
    batter,
    pitcher,
    venue,
    venueCity,
    winProbability,
  } = game;

  // Detección robusta del estado del juego
  const isLive =
    game.status === "Live" ||
    game.statusLabel?.toLowerCase().includes("vivo") ||
    game.detailedState === "In Progress";

  const isFinal =
    game.status === "Final" ||
    game.statusLabel?.toLowerCase().includes("final") ||
    game.detailedState === "Final";

  // Formato de entrada actual para el badge
  const halfText =
    linescore?.inningHalf === "Top" || game.inningHalf === "Alta"
      ? "ALTA"
      : linescore?.inningHalf === "Bottom" || game.inningHalf === "Baja"
      ? "BAJA"
      : "";

  const inningNum = linescore?.currentInning || game.currentInning || 1;

  const inningLabel = isLive
    ? `${halfText ? `${halfText} DE LA ` : ""}${inningNum}.ª`
    : isFinal
    ? "FINAL"
    : "PRÓXIMO ENCUENTRO";

  // Número de entradas a renderizar en el linescore (mínimo 6, hasta 9 o extras)
  const inningsList = linescore?.innings || [];
  const maxInningsToShow = Math.max(
    6,
    Math.min(9, Math.max(inningNum, inningsList.length))
  );
  const displayInnings = Array.from({ length: maxInningsToShow }, (_, i) => i + 1);

  // Probabilidad de Ganar de Leones
  const currentLeonesWp = winProbability?.currentLeonesWp ?? 0.5;
  const currentPct = Math.round(currentLeonesWp * 100);
  const keyPlay = winProbability?.keyPlay;

  // Puntos para la curva de Win Probability SVG
  const trend = winProbability?.trend || [];
  const pointsToRender = trend.length > 0
    ? trend
    : [{ leonesWp: 0.5 }, { leonesWp: currentLeonesWp }];

  const svgWidth = 400;
  const svgHeight = 44;

  const polylineCoords = pointsToRender
    .map((pt, i) => {
      const x = (i / Math.max(1, pointsToRender.length - 1)) * svgWidth;
      // pt.leonesWp es número entre 0.0 y 1.0; acotamos para asegurar márgenes visuales
      const clampedWp = Math.max(0.05, Math.min(0.95, pt.leonesWp));
      const y = svgHeight - (clampedWp * (svgHeight - 10) + 5);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const areaCoords = `0,${svgHeight} ${polylineCoords} ${svgWidth},${svgHeight}`;

  return (
    <section className="rounded-2xl bg-gradient-to-br from-[#0D152B] via-[#101B38] to-[#0D152B] border border-[#1E2B4D] hover:border-[#FDB827]/40 transition-all p-3.5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* ── Encabezado: Estado y Ubicación ── */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2B4D] text-xs">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            {isLive ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </>
            ) : isFinal ? (
              <span className="inline-flex rounded-full h-2.5 w-2.5 bg-slate-400" />
            ) : (
              <span className="inline-flex rounded-full h-2.5 w-2.5 bg-[#FDB827]" />
            )}
          </span>
          <span
            className={cn(
              "font-mono font-bold tracking-wider text-[11px] uppercase",
              isLive ? "text-emerald-400" : isFinal ? "text-slate-300" : "text-[#FDB827]"
            )}
          >
            {isLive ? `EN VIVO · ${inningLabel}` : inningLabel}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-mono">
          <MapPin className="w-3.5 h-3.5 text-[#FDB827]" />
          <span>{venue || "Estadio Monumental"} · {venueCity || "Caracas"}</span>
        </div>
      </div>

      {/* ── Cuerpo Principal: Marcador, Linescore y Diamante ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Marcador de Equipos (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Visitante */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070B19]/50 border border-[#1E2B4D]/60">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#0D152B] p-1 border border-[#1E2B4D] flex items-center justify-center shrink-0">
                <Image
                  src={awayTeam.logoUrl}
                  alt={awayTeam.name}
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <span className={cn(
                "text-sm font-bold tracking-wide",
                awayTeam.isLeones ? "text-[#FDB827]" : "text-slate-200"
              )}>
                {awayTeam.name}
              </span>
            </div>
            <span className="text-2xl font-extrabold font-mono text-slate-100">
              {awayTeam.score}
            </span>
          </div>

          {/* Local */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070B19]/50 border border-[#1E2B4D]/60">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#0D152B] p-1 border border-[#1E2B4D] flex items-center justify-center shrink-0">
                <Image
                  src={homeTeam.logoUrl}
                  alt={homeTeam.name}
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <span className={cn(
                "text-sm font-bold tracking-wide",
                homeTeam.isLeones ? "text-[#FDB827]" : "text-slate-200"
              )}>
                {homeTeam.name}
              </span>
            </div>
            <span className="text-2xl font-extrabold font-mono text-slate-100">
              {homeTeam.score}
            </span>
          </div>
        </div>

        {/* Linescore Resumido (4 cols) */}
        <div className="lg:col-span-4 overflow-x-auto custom-scrollbar">
          <table className="w-full text-center font-mono text-xs border-collapse">
            <thead>
              <tr className="text-[10px] text-slate-400 border-b border-[#1E2B4D]">
                <th className="py-1 px-1.5 text-left font-sans">Equipo</th>
                {displayInnings.map((inn) => (
                  <th key={inn} className="py-1 px-1 font-semibold">
                    {inn}
                  </th>
                ))}
                <th className="py-1 px-1.5 font-bold text-slate-200">C</th>
                <th className="py-1 px-1 font-semibold text-slate-400">H</th>
                <th className="py-1 px-1 font-semibold text-slate-400">E</th>
              </tr>
            </thead>
            <tbody>
              {/* Visitante */}
              <tr className="border-b border-[#1E2B4D]/40 text-slate-300">
                <td className="py-1.5 px-1.5 text-left font-bold text-[11px] text-slate-200">
                  {awayTeam.abbreviation}
                </td>
                {displayInnings.map((inn) => {
                  const val = linescore?.innings?.find((item) => item.num === inn)?.away;
                  return (
                    <td key={inn} className="py-1 px-1 text-slate-300">
                      {val !== null && val !== undefined ? val : "-"}
                    </td>
                  );
                })}
                <td className="py-1.5 px-1.5 font-bold text-slate-100 text-[13px]">
                  {awayTeam.score}
                </td>
                <td className="py-1 px-1 text-slate-300">{awayTeam.hits}</td>
                <td className="py-1 px-1 text-slate-400">{awayTeam.errors}</td>
              </tr>
              {/* Local */}
              <tr className="text-slate-300">
                <td className="py-1.5 px-1.5 text-left font-bold text-[11px] text-slate-200">
                  {homeTeam.abbreviation}
                </td>
                {displayInnings.map((inn) => {
                  const val = linescore?.innings?.find((item) => item.num === inn)?.home;
                  return (
                    <td key={inn} className="py-1 px-1 text-slate-300">
                      {val !== null && val !== undefined ? val : "-"}
                    </td>
                  );
                })}
                <td className="py-1.5 px-1.5 font-bold text-slate-100 text-[13px]">
                  {homeTeam.score}
                </td>
                <td className="py-1 px-1 text-slate-300">{homeTeam.hits}</td>
                <td className="py-1 px-1 text-slate-400">{homeTeam.errors}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mini Diamante, Conteo & Jugador Activo (4 cols) */}
        <div className="lg:col-span-4 flex items-center justify-between sm:justify-around p-3 rounded-xl bg-[#070B19]/60 border border-[#1E2B4D]">
          {/* Diamante SVG */}
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 56 56" className="w-full h-full drop-shadow">
              {/* 2da Base (Arriba) */}
              <rect
                x="24"
                y="6"
                width="8"
                height="8"
                transform="rotate(45 28 10)"
                className={cn(
                  "transition-colors",
                  bases?.second?.occupied
                    ? "fill-[#FDB827] stroke-[#FDB827]"
                    : "fill-[#1E2B4D]/60 stroke-slate-500"
                )}
                strokeWidth="1.5"
              />
              {/* 3ra Base (Izquierda) */}
              <rect
                x="8"
                y="22"
                width="8"
                height="8"
                transform="rotate(45 12 26)"
                className={cn(
                  "transition-colors",
                  bases?.third?.occupied
                    ? "fill-[#FDB827] stroke-[#FDB827]"
                    : "fill-[#1E2B4D]/60 stroke-slate-500"
                )}
                strokeWidth="1.5"
              />
              {/* 1ra Base (Derecha) */}
              <rect
                x="40"
                y="22"
                width="8"
                height="8"
                transform="rotate(45 44 26)"
                className={cn(
                  "transition-colors",
                  bases?.first?.occupied
                    ? "fill-[#FDB827] stroke-[#FDB827]"
                    : "fill-[#1E2B4D]/60 stroke-slate-500"
                )}
                strokeWidth="1.5"
              />
              {/* Home Plate (Abajo) */}
              <polygon
                points="28,42 34,46 34,50 22,50 22,46"
                className="fill-slate-300 stroke-slate-400"
                strokeWidth="1"
              />
            </svg>
          </div>

          {/* Conteo y Situación */}
          <div className="flex flex-col space-y-1 text-left font-mono">
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-bold text-slate-200">
                B <span className="text-emerald-400">{count?.balls ?? 0}</span>
              </span>
              <span className="font-bold text-slate-200">
                S <span className="text-amber-400">{count?.strikes ?? 0}</span>
              </span>
              <span className="font-bold text-slate-200">
                O <span className="text-rose-400">{count?.outs ?? 0}</span>
              </span>
            </div>

            <div className="text-[10px] text-slate-300 space-y-0.5 truncate max-w-[160px] sm:max-w-[200px]">
              <p className="truncate">
                <span className="text-slate-400 font-sans">Bate: </span>
                <span className="font-bold text-slate-100">{batter?.name || "En espera"}</span>
              </p>
              <p className="truncate">
                <span className="text-slate-400 font-sans">Lanza: </span>
                <span className="font-bold text-slate-100">{pitcher?.name || "Por anunciar"}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección Inferior: Curva de Probabilidad de Ganar & Enlace ── */}
      <div className="mt-4 pt-3 border-t border-[#1E2B4D] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center justify-between sm:justify-start space-x-2 shrink-0">
            <span className="text-xs font-bold text-slate-300">
              Probabilidad de ganar
            </span>
            <span className="text-sm font-extrabold font-mono text-[#FDB827]">
              {currentPct}% Leones
            </span>
            {keyPlay && (
              <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">
                • {keyPlay.description} ({keyPlay.deltaWpaText})
              </span>
            )}
          </div>

          {/* Mini Sparkline WPA */}
          <div className="flex-1 h-10 w-full relative">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="liveHeroGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FDB827" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#FDB827" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Área sombreada */}
              <polygon points={areaCoords} fill="url(#liveHeroGradient)" />
              {/* Línea media (50% paridad) */}
              <line
                x1="0"
                y1={svgHeight / 2}
                x2={svgWidth}
                y2={svgHeight / 2}
                stroke="#1E2B4D"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Línea de probabilidad */}
              <polyline
                fill="none"
                stroke="#FDB827"
                strokeWidth="2"
                points={polylineCoords}
              />
            </svg>
          </div>
        </div>

        <Link
          href="/game-center"
          className="flex items-center justify-center space-x-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-[#070B19] border border-[#1E2B4D] hover:border-[#FDB827]/40 text-[#FDB827] text-xs font-mono font-bold transition-all shrink-0 hover:bg-[#FDB827]/10 active:scale-[0.98]"
        >
          <span>Ver en Game Center</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
