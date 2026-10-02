"use client";

import { useState, useEffect } from "react";
import { GameProjection, ValueAssessment, OddsFormat } from "@/types/probabilidades";
import { generateProbabilidadesCardBlob } from "@/lib/probabilidades-card-canvas";
import { X, Download, Loader2, Image as ImageIcon, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  projections: GameProjection[];
  topPicks: ValueAssessment[];
  mispricedAlerts: ValueAssessment[];
  oddsFormat: OddsFormat;
}

export function ExportCardModal({
  isOpen,
  onClose,
  dateStr,
  projections,
  topPicks,
  mispricedAlerts,
  oddsFormat,
}: ExportCardModalProps) {
  const [format, setFormat] = useState<"square" | "story">("square");
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setBlob(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    generateProbabilidadesCardBlob(
      dateStr,
      projections,
      topPicks,
      mispricedAlerts,
      format,
      oddsFormat
    ).then((b) => {
      if (!isMounted) return;
      if (b) {
        const url = URL.createObjectURL(b);
        setPreviewUrl(url);
        setBlob(b);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [isOpen, format, dateStr, projections, topPicks, mispricedAlerts]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `republicaraquista_lineas_${dateStr}_${format}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0D152B] border border-[#FDB827]/40 shadow-2xl p-5 sm:p-6 text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2B4D]">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#FDB827]/20 text-[#FDB827]">
              <ImageIcon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Exportar Tarjeta de Picks en Alta Definición
              </h2>
              <p className="text-xs text-slate-400">
                Gráfica profesional optimizada para difusión en redes sociales (300 DPI).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Conmutador Dual de Formato (1:1 vs 9:16) ── */}
        <div className="mt-4 flex items-center justify-center">
          <div className="p-1 rounded-xl bg-[#070B19] border border-[#1E2B4D] flex space-x-1">
            <button
              onClick={() => setFormat("square")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                format === "square"
                  ? "bg-[#FDB827] text-[#070B19] shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Cuadrado 1:1 (Twitter / Feed)
            </button>
            <button
              onClick={() => setFormat("story")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                format === "story"
                  ? "bg-[#FDB827] text-[#070B19] shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Vertical 9:16 (Stories / WhatsApp)
            </button>
          </div>
        </div>

        {/* ── Previsualización en Vivo ── */}
        <div className="mt-4 relative min-h-[300px] max-h-[460px] flex items-center justify-center rounded-xl bg-[#070B19] border border-[#1E2B4D] p-3 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-[#FDB827]" />
              <span>Renderizando tarjeta HD en Canvas 300 DPI...</span>
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Previsualización de Tarjeta de Probabilidades"
              className={cn(
                "max-h-[420px] object-contain rounded-lg shadow-xl border border-slate-800",
                format === "story" ? "aspect-[9/16]" : "aspect-square"
              )}
            />
          ) : (
            <span className="text-xs text-slate-500">Error al renderizar tarjeta.</span>
          )}
        </div>

        {/* ── Footer del Modal y Descarga ── */}
        <div className="mt-4 pt-3 border-t border-[#1E2B4D] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 text-center sm:text-left">
            Sellado oficial canónico: <strong className="text-slate-200">@republicaraquista • Jorge Leonardo Loreto</strong>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold bg-[#1E2B4D] text-slate-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={loading || !blob}
              onClick={handleDownload}
              className={cn(
                "flex items-center space-x-1.5 px-4 py-2 rounded-xl font-bold transition-all shadow-md",
                loading || !blob
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-[#FDB827] text-[#070B19] hover:bg-[#E5A520]"
              )}
            >
              <Download className="w-4 h-4" />
              <span>Descargar Imagen PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
