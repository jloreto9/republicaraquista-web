"use client";

import React from "react";
import { X, Download, FileText, ExternalLink } from "lucide-react";
import { WeeklyRosterMeta } from "@/data/roster-data";

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: WeeklyRosterMeta;
}

export function PdfViewerModal({ isOpen, onClose, meta }: PdfViewerModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#070B19] border border-[#1E2B4D] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-4 border-b border-[#1E2B4D] bg-[#0D152B]/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Boletín Oficial LVBP · Semana {meta.weekNumber}</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/30">
                  {meta.totalActive} JUGADORES
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Emitido el {meta.officialDate} · Leones del Caracas
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={meta.pdfUrl}
              download="Leones_20261013.pdf"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FDB827] hover:bg-[#FDB827]/90 text-[#070B19] font-bold text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#1E2B4D] transition-colors"
              aria-label="Cerrar visor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visor Iframe Embebido */}
        <div className="flex-1 p-2 sm:p-4 bg-[#050811] overflow-hidden min-h-[500px]">
          <iframe
            src={meta.pdfUrl}
            title="Boletín Oficial de Roster Leones del Caracas"
            className="w-full h-full min-h-[480px] rounded-xl border border-[#1E2B4D]/60 bg-white"
          />
        </div>

        {/* Pie con Fuente Oficial */}
        <div className="p-3 border-t border-[#1E2B4D] bg-[#0D152B]/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
          <span>Fuente: {meta.source}</span>
          <a
            href="https://sapven.com/download/Leones_20261013.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#FDB827] hover:underline"
          >
            <span>Enlace Servidor Sapven</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
