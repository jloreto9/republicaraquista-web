"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, Loader2, X } from "lucide-react";
import { MatchupCardData } from "@/types/matchup";
import {
  generateMatchupCardBlob,
  renderMatchupCardToCanvas,
} from "@/lib/matchup-card-canvas";
import { cn } from "@/lib/utils";

interface MatchupCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MatchupCardData | null;
}

function slugifyPlayerName(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "jugador";
}

export function MatchupCardModal({
  isOpen,
  onClose,
  data,
}: MatchupCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [renderState, setRenderState] = useState<{
    key: string;
    error: string | null;
  }>({ key: "", error: null });

  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const renderKey = useMemo(() => {
    if (!isOpen || !data) return "";
    return [
      data.compareType,
      data.player1.playerId,
      data.player1.seasonLabel,
      data.player1.phaseLabel,
      data.player2.playerId,
      data.player2.seasonLabel,
      data.player2.phaseLabel,
      data.p1Wins,
      data.p2Wins,
      data.ties,
    ].join("|");
  }, [isOpen, data]);

  // Cerrar con tecla Escape y bloquear scroll del body mientras el modal esté abierto
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Limpiar temporizador de copiado al desmontar
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // Renderizado asíncrono en vivo sobre el <canvas>
  useEffect(() => {
    if (!isOpen || !data || !renderKey) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    renderMatchupCardToCanvas(canvas, data)
      .then(() => {
        if (cancelled) return;
        setRenderState({ key: renderKey, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error renderizando tarjeta PNG de Matchup:", err);
        setRenderState({
          key: renderKey,
          error: "No se pudo renderizar la vista previa de la tarjeta.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, data, renderKey]);

  if (!isOpen || !data) return null;

  const isRendering = renderState.key !== renderKey;
  const renderError = renderState.key === renderKey ? renderState.error : null;

  const handleDownload = async () => {
    if (isDownloading) return;
    setActionError(null);
    setIsDownloading(true);
    try {
      const blob = await generateMatchupCardBlob(data);
      if (!blob) {
        setActionError("No se pudo generar el archivo PNG para descarga.");
        return;
      }
      const slug1 = slugifyPlayerName(data.player1.name);
      const slug2 = slugifyPlayerName(data.player2.name);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `matchup-${slug1}-vs-${slug2}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Error descargando tarjeta PNG:", err);
      setActionError("Error al descargar la imagen PNG.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyImage = async () => {
    if (isCopying) return;
    setActionError(null);

    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard?.write ||
      typeof ClipboardItem === "undefined"
    ) {
      setActionError(
        'Tu navegador no permite copiar imágenes al portapapeles. Usa "Descargar PNG".'
      );
      return;
    }

    setIsCopying(true);
    try {
      const blob = await generateMatchupCardBlob(data);
      if (!blob) {
        setActionError(
          'No se pudo generar la imagen para copiar. Usa "Descargar PNG".'
        );
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      setCopied(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch (err) {
      console.error("Error copiando tarjeta PNG al portapapeles:", err);
      setActionError(
        'No se pudo copiar la imagen al portapapeles. Prueba con "Descargar PNG".'
      );
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="matchup-card-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-2xl p-4 sm:p-6 text-slate-100 my-auto max-h-[94vh] flex flex-col">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1E2B4D] shrink-0">
          <div>
            <h2
              id="matchup-card-modal-title"
              className="text-base sm:text-lg font-bold text-slate-100"
            >
              Tarjeta Comparativa PNG
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {data.player1.name} ({data.player1.teamAbbr}) vs{" "}
              {data.player2.name} ({data.player2.teamAbbr}) •{" "}
              {data.compareType}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de tarjeta PNG"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2B4D]/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vista previa en vivo */}
        <div className="mt-4 flex-1 overflow-y-auto flex flex-col items-center justify-center rounded-xl bg-[#070B19] border border-[#1E2B4D] p-3 sm:p-4 relative min-h-[260px]">
          {isRendering && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#070B19]/85 rounded-xl text-xs text-slate-300">
              <Loader2 className="w-7 h-7 animate-spin text-[#FDB827]" />
              <span>Generando vista previa en alta resolución...</span>
            </div>
          )}

          {renderError ? (
            <div className="text-center text-xs text-rose-400 py-8 px-4">
              {renderError}
            </div>
          ) : null}

          <canvas
            ref={canvasRef}
            aria-label={`Vista previa de tarjeta comparativa entre ${data.player1.name} y ${data.player2.name}`}
            className={cn(
              "w-full max-w-[460px] h-auto rounded-lg shadow-2xl border border-slate-300",
              renderError && "hidden"
            )}
          />
        </div>

        {/* Mensajes de error de acción */}
        {actionError && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
          >
            {actionError}
          </div>
        )}

        {/* Botones de acción */}
        <div className="mt-4 pt-3 border-t border-[#1E2B4D] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#070B19] border border-[#1E2B4D] text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isRendering || isCopying || Boolean(renderError)}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer",
                copied
                  ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                  : isRendering || isCopying || Boolean(renderError)
                  ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-[#131E3D] border-[#38BDF8]/40 text-[#38BDF8] hover:bg-[#1A2952]"
              )}
            >
              {isCopying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copied ? "¡Copiada!" : "Copiar Imagen"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isRendering || isDownloading || Boolean(renderError)}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-md cursor-pointer",
                isRendering || isDownloading || Boolean(renderError)
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-[#FDB827] text-slate-950 hover:bg-[#E5A520]"
              )}
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Descargar PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
