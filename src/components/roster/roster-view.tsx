"use client";

import React, { useState } from "react";
import {
  Users,
  Shield,
  FileText,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import {
  WEEKLY_ROSTER_META,
  LEONES_WEEKLY_ROSTER,
} from "@/data/roster-data";
import { RosterKpis } from "./roster-kpis";
import { WeeklyRosterTab } from "./weekly-roster-tab";
import { StaffTab } from "./staff-tab";
import { PdfViewerModal } from "./pdf-viewer-modal";
import { cn } from "@/lib/utils";

export function RosterView() {
  const [activeTab, setActiveTab] = useState<"weekly" | "staff">("weekly");
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [meta, setMeta] = useState(WEEKLY_ROSTER_META);
  const [players, setPlayers] = useState(LEONES_WEEKLY_ROSTER);
  const [movements, setMovements] = useState<{ entran: string[]; salen: string[] }>({
    entran: [],
    salen: [],
  });

  React.useEffect(() => {
    fetch("/data/roster_latest.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.meta) {
          setMeta((prev) => ({
            ...prev,
            officialDate: data.meta.officialDate || prev.officialDate,
            pdfUrl: data.meta.pdfUrl || prev.pdfUrl,
          }));
          if (data.meta.movements) {
            setMovements(data.meta.movements);
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      {/* ── Barra Superior de Control de Semana y PDF ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0D152B]/60 border border-[#1E2B4D]">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#070B19] text-slate-300 border border-[#1E2B4D]">
            <Calendar className="w-3.5 h-3.5 text-[#FDB827]" />
            <span>Semana {meta.weekNumber} · {meta.dateRange}</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            <span>LVBP {meta.officialDate}</span>
          </span>
        </div>

        {/* Botón Descargar PDF Oficial */}
        <button
          onClick={() => setIsPdfModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FDB827] hover:bg-[#FDB827]/90 text-[#070B19] font-bold text-xs shadow-[0_0_15px_rgba(253,184,39,0.2)] transition-all shrink-0"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Ver Boletín Oficial (PDF)</span>
        </button>
      </div>

      {/* ── KPIs Métricos de la Plantilla ── */}
      <RosterKpis meta={meta} players={players} />

      {/* ── Movimientos Semanales (Altas y Bajas) ── */}
      {(movements.entran.length > 0 || movements.salen.length > 0) && (
        <div className="p-3.5 rounded-2xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-2">
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">
            Movimientos Confirmados de la Semana:
          </span>
          <div className="flex flex-wrap gap-4 items-center text-xs">
            {movements.entran.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-emerald-400 font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                  ENTRAN:
                </span>
                <span className="text-slate-200 font-medium">
                  {movements.entran.join(", ")}
                </span>
              </div>
            )}
            {movements.salen.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-rose-400 font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30">
                  SALEN:
                </span>
                <span className="text-slate-400 font-medium">
                  {movements.salen.join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Selector de Pestañas: Roster Semanal vs Staff ── */}
      <div className="border-b border-[#1E2B4D] flex items-center space-x-2">
        <button
          onClick={() => setActiveTab("weekly")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all",
            activeTab === "weekly"
              ? "border-[#FDB827] text-[#FDB827]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Users className="w-4 h-4" />
          <span>Roster Semanal (Tope 34)</span>
        </button>

        <button
          onClick={() => setActiveTab("staff")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all",
            activeTab === "staff"
              ? "border-[#FDB827] text-[#FDB827]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Shield className="w-4 h-4" />
          <span>Coaching Staff</span>
        </button>
      </div>

      {/* ── Contenido de la Pestaña Activa ── */}
      <div>
        {activeTab === "weekly" && (
          <WeeklyRosterTab
            players={players}
            onOpenPdf={() => setIsPdfModalOpen(true)}
          />
        )}
        {activeTab === "staff" && <StaffTab />}
      </div>

      {/* ── Modal Visor del PDF Oficial ── */}
      <PdfViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        meta={meta}
      />
    </div>
  );
}
