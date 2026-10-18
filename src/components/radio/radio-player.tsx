"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { useRadio } from "@/context/radio-context";
import { RADIO_STATIONS, Station } from "./radio-stations";
import { RadioWave } from "./radio-wave";
import { cn } from "@/lib/utils";

export function RadioPlayer() {
  const {
    currentStation,
    setStation,
    isPlaying,
    setIsPlaying,
    togglePlay,
    status,
    setStatus,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    isExpanded,
    setIsExpanded,
  } = useRadio();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincronizar volumen con el elemento audio nativo
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Manejar el ciclo de vida del stream de audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      setStatus("buffering");
      setErrorMessage(null);

      // Agregar timestamp para evitar caché stale en Icecast
      const separator = currentStation.streamUrl.includes("?") ? "&" : "?";
      audio.src = `${currentStation.streamUrl}${separator}t=${Date.now()}`;
      audio.load();

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setStatus("playing");
          })
          .catch((err) => {
            console.warn("Reproducción diferida o error de audio:", err);
            // Si el navegador bloquea autoplay, pausar estado
            setStatus("idle");
            setIsPlaying(false);
          });
      }
    } else {
      audio.pause();
      audio.src = "";
      setStatus("idle");
    }
  }, [isPlaying, currentStation, setIsPlaying, setStatus]);

  const handleCanPlay = useCallback(() => {
    if (isPlaying) {
      setStatus("playing");
      setErrorMessage(null);
    }
  }, [isPlaying, setStatus]);

  const handleWaiting = useCallback(() => {
    if (isPlaying) {
      setStatus("buffering");
    }
  }, [isPlaying, setStatus]);

  const handleError = useCallback(() => {
    if (isPlaying) {
      console.warn("Fallo en el stream de audio:", currentStation.name);
      setStatus("error");
      setErrorMessage("Transmisión no disponible temporalmente");
      setIsPlaying(false);
    }
  }, [isPlaying, currentStation.name, setStatus, setIsPlaying]);

  const handleStationChange = (station: Station) => {
    if (station.id === currentStation.id) return;
    setStation(station);
    if (isPlaying) {
      // Al cambiar de estación manteniéndose activo, forzar recarga inmediata
      setStatus("buffering");
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setIsPlaying(true);
  };

  return (
    <>
      {/* ── Elemento de Audio Nativo Persistente (Oculto) ── */}
      <audio
        ref={audioRef}
        preload="none"
        onCanPlay={handleCanPlay}
        onWaiting={handleWaiting}
        onError={handleError}
        className="hidden"
      />

      {/* ── CONTENEDOR FLOTANTE GLOBAL ── */}
      <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 z-40 max-w-md ml-auto pointer-events-auto">
        {/* ── MODAL / TARJETA EXPANDIDA ── */}
        {isExpanded && (
          <div className="mb-3 p-4 rounded-2xl bg-[#070B19]/95 backdrop-blur-xl border border-[#1E2B4D] shadow-[0_12px_40px_rgba(0,0,0,0.85)] animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Cabecera del Panel */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2B4D]/70">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FDB827]/15 border border-[#FDB827]/40 flex items-center justify-center text-[#FDB827]">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                      Circuito Radial Oficial
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-bold rounded bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/30">
                      LEONES
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Transmisión en vivo · Unión Radio
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1E2B4D]/50 transition-colors"
                aria-label="Minimizar reproductor radial"
                title="Minimizar"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de Emisoras */}
            <div className="my-3 space-y-1.5">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
                Selecciona la Señal:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {RADIO_STATIONS.map((station) => {
                  const isSelected = station.id === currentStation.id;
                  return (
                    <button
                      key={station.id}
                      onClick={() => handleStationChange(station)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl text-left transition-all border text-xs",
                        isSelected
                          ? "bg-[#1E2B4D]/80 border-[#FDB827]/50 text-slate-100 shadow-[0_0_15px_rgba(253,184,39,0.1)]"
                          : "bg-[#0D152B]/60 border-[#1E2B4D]/40 text-slate-300 hover:bg-[#1E2B4D]/40 hover:text-slate-100"
                      )}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            isSelected
                              ? isPlaying
                                ? "bg-[#FDB827] shadow-[0_0_8px_#FDB827] animate-pulse"
                                : "bg-[#FDB827]"
                              : "bg-slate-600"
                          )}
                        />
                        <div className="truncate">
                          <div className="font-semibold text-xs flex items-center gap-1.5">
                            <span>{station.name}</span>
                            {station.badge && (
                              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-[#FDB827]/15 text-[#FDB827] border border-[#FDB827]/30">
                                {station.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {station.frequency}
                          </span>
                        </div>
                      </div>

                      {isSelected && isPlaying && (
                        <RadioWave isPlaying={status === "playing"} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Control de Volumen y Estado */}
            <div className="pt-2 border-t border-[#1E2B4D]/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      status === "playing"
                        ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                        : status === "buffering"
                        ? "bg-amber-400 animate-ping"
                        : status === "error"
                        ? "bg-rose-500"
                        : "bg-slate-500"
                    )}
                  />
                  <span className="text-[11px] font-mono text-slate-300">
                    {status === "playing"
                      ? "En el aire (Audio en Vivo)"
                      : status === "buffering"
                      ? "Sintonizando señal..."
                      : status === "error"
                      ? "Error de conexión"
                      : "Listo para escuchar"}
                  </span>
                </div>

                {/* Botón Silenciar / Desilenciar */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleMute}
                    className="p-1 rounded text-slate-400 hover:text-slate-100 transition-colors"
                    aria-label={isMuted ? "Activar sonido" : "Silenciar"}
                    title={isMuted ? "Activar sonido" : "Silenciar"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-20 h-1.5 bg-[#1E2B4D] rounded-lg appearance-none cursor-pointer accent-[#FDB827]"
                    aria-label="Volumen del reproductor"
                  />
                </div>
              </div>

              {/* Mensaje de Error / Reintento */}
              {errorMessage && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-300">
                  <span>{errorMessage}</span>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1 font-bold text-[#FDB827] hover:underline"
                  >
                    <RotateCw className="w-3 h-3" /> Reintentar
                  </button>
                </div>
              )}

              {/* Pie con Enlace Oficial */}
              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
                <span>Audio provisto por Unión Radio</span>
                <a
                  href={currentStation.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#FDB827] hover:underline"
                >
                  <span>MundoUR.com</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── BARRA / PÍLDORA COMPACTA FLOTANTE (MINI-PLAYER) ── */}
        <div
          className={cn(
            "flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[#070B19]/90 backdrop-blur-xl border border-[#1E2B4D] shadow-[0_8px_30px_rgba(0,0,0,0.7)] transition-all",
            isPlaying
              ? "border-[#FDB827]/50 shadow-[0_0_20px_rgba(253,184,39,0.18)]"
              : "hover:border-slate-500/50"
          )}
        >
          {/* Identidad y Estado de Emisora */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center space-x-2.5 text-left min-w-0 flex-1 mr-2 group"
            aria-label="Abrir opciones de radio"
            title="Abrir opciones de radio"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-[#0D152B] border border-[#FDB827]/40 text-[#FDB827] shrink-0 group-hover:border-[#FDB827]">
              <Radio className="w-4 h-4" />
              {isPlaying && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#070B19] animate-pulse" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-100 truncate group-hover:text-[#FDB827] transition-colors">
                  {currentStation.name}
                </span>
                {isPlaying && (
                  <span className="inline-flex items-center px-1.5 py-0.2 text-[8px] font-mono font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                    EN VIVO
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <span className="truncate">Circuito Radial Leones</span>
                {isPlaying && (
                  <span className="hidden sm:inline-block text-[#FDB827]">
                    • 107.3 FM
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Controles Rápidos: Play/Pause y Expandir */}
          <div className="flex items-center space-x-2 shrink-0">
            {isPlaying && (
              <RadioWave
                isPlaying={status === "playing"}
                className="hidden sm:flex mr-1"
              />
            )}

            <button
              onClick={togglePlay}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                isPlaying
                  ? "bg-[#FDB827] text-[#070B19] hover:bg-[#FDB827]/90 shadow-[0_0_12px_rgba(253,184,39,0.35)]"
                  : "bg-[#1E2B4D] text-slate-100 hover:bg-[#253660] hover:text-[#FDB827]"
              )}
              aria-label={isPlaying ? "Pausar radio" : "Reproducir radio"}
              title={isPlaying ? "Pausar" : "Escuchar en vivo"}
            >
              {status === "buffering" ? (
                <RotateCw className="w-4 h-4 animate-spin text-[#070B19]" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#1E2B4D]/60 transition-colors"
              aria-label={
                isExpanded
                  ? "Minimizar opciones de radio"
                  : "Expandir opciones de radio"
              }
              title={isExpanded ? "Minimizar" : "Más opciones"}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
