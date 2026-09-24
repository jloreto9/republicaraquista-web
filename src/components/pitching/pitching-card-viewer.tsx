"use client";

import React, { useEffect, useState } from "react";
import { Download, Sparkles, Loader2, Image as ImageIcon } from "lucide-react";
import { PitchGameDataResponse, PitcherProfile, PitcherGameLog } from "@/types/pitching";
import { generatePitchingCardBlob, downloadPitchingCard } from "@/lib/pitch-card-canvas";

interface PitchingCardViewerProps {
  data: PitchGameDataResponse;
  pitcher: PitcherProfile;
  gameLog: PitcherGameLog;
  branch: "lvbp" | "mlb";
  gameLogs?: PitcherGameLog[];
}

export function PitchingCardViewer({
  data,
  pitcher,
  gameLog,
  branch,
  gameLogs = [],
}: PitchingCardViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsRendering(true);

    generatePitchingCardBlob(data, pitcher, gameLog, branch, gameLogs)
      .then((blob) => {
        if (!active) return;
        if (blob) {
          const url = URL.createObjectURL(blob);
          setImageUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
        setIsRendering(false);
      })
      .catch((err) => {
        console.error("Error al renderizar la tarjeta en cliente:", err);
        if (active) setIsRendering(false);
      });

    return () => {
      active = false;
    };
  }, [data, pitcher, gameLog, branch, gameLogs]);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadPitchingCard(data, pitcher, gameLog, branch, gameLogs);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full space-y-6">
      {/* Barra de Controles y Descarga */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D] shadow-lg">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2.5 rounded-lg bg-[#FDB827]/10 border border-[#FDB827]/30 text-[#FDB827]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Tarjeta Gráfica Oficial Thomas Nestico (@TJStats)</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                HD 300 DPI
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Formato Cuadrado Oficial 2400x2400 px • Fondo Blanco Pulcro
            </div>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={isRendering || isDownloading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#FDB827] hover:bg-[#FDB827]/90 text-[#070B19] font-black text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generando PNG...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Descargar Tarjeta HD (PNG)</span>
            </>
          )}
        </button>
      </div>

      {/* Visualizador de Tarjeta Central */}
      <div className="w-full max-w-4xl relative rounded-2xl overflow-hidden border border-[#1E2B4D] bg-[#070B19] shadow-2xl flex flex-col items-center">
        {isRendering ? (
          <div className="w-full aspect-square flex flex-col items-center justify-center space-y-4 p-8 bg-[#0D152B]/40">
            <Loader2 className="w-12 h-12 text-[#FDB827] animate-spin" />
            <div className="text-center">
              <div className="text-base font-bold text-slate-200">
                Renderizando tarjeta oficial en alta resolución...
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Cuadrícula 20x20 de Thomas Nestico a 2400x2400 px
              </div>
            </div>
          </div>
        ) : imageUrl ? (
          <div className="w-full p-2 sm:p-4 bg-slate-900/50 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Pitching Summary de ${pitcher.name}`}
              className="w-full h-auto max-w-3xl rounded-xl shadow-2xl object-contain border border-slate-200/20"
              style={{ maxHeight: "80vh" }}
            />
          </div>
        ) : (
          <div className="w-full aspect-square flex flex-col items-center justify-center space-y-3 p-8">
            <ImageIcon className="w-12 h-12 text-slate-500" />
            <div className="text-sm text-slate-400 font-medium">
              No se pudo generar la vista previa de la tarjeta.
            </div>
          </div>
        )}

        {/* Barra de pie dentro del visor */}
        <div className="w-full px-6 py-3 bg-[#0D152B] border-t border-[#1E2B4D] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-mono gap-2 text-center sm:text-left">
          <span>@republicaraquista • Jorge Leonardo Loreto</span>
          <span className="text-[#FDB827]/80">
            Metodología e inspiración visual: Thomas Nestico (@TJStats)
          </span>
        </div>
      </div>
    </div>
  );
}
