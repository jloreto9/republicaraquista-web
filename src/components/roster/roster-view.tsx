"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Users,
  Shield,
  FileText,
  Layers,
  Download,
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
import { ExtendedRosterTab } from "./extended-roster-tab";
import { PdfViewerModal } from "./pdf-viewer-modal";
import { cn } from "@/lib/utils";

export function RosterView() {
  const [activeTab, setActiveTab] = useState<"weekly" | "staff" | "extended">(
    "weekly"
  );
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* ── Encabezado Canónico de la Vista ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0D152B]/90 border border-[#1E2B4D] shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        <div className="flex items-center space-x-3.5">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#070B19] border border-[#FDB827]/40 p-1 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(253,184,39,0.15)]">
            <Image
              src="/assets/logo.png"
              alt="Leones del Caracas"
              width={42}
              height={42}
              className="object-contain"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#FDB827] uppercase">
                LVBP Oficial · Temporada {WEEKLY_ROSTER_META.season}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-2.5 h-2.5" /> CONFIRMADO
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-0.5">
              Roster y Cuerpo Técnico de Leones
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-[#FDB827]" />
              <span>Semana {WEEKLY_ROSTER_META.weekNumber} · {WEEKLY_ROSTER_META.dateRange}</span>
            </p>
          </div>
        </div>

        {/* Botón Descargar PDF Oficial */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FDB827] hover:bg-[#FDB827]/90 text-[#070B19] font-bold text-xs shadow-[0_0_20px_rgba(253,184,39,0.25)] transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Ver Boletín Oficial (PDF)</span>
          </button>
        </div>
      </div>

      {/* ── KPIs Métricos de la Plantilla ── */}
      <RosterKpis meta={WEEKLY_ROSTER_META} players={LEONES_WEEKLY_ROSTER} />

      {/* ── Selector de Pestañas (Matching LVBP: Semanal / Staff / Plantel) ── */}
      <div className="border-b border-[#1E2B4D] flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("weekly")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0",
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
            "flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0",
            activeTab === "staff"
              ? "border-[#FDB827] text-[#FDB827]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Shield className="w-4 h-4" />
          <span>Coaching Staff</span>
        </button>

        <button
          onClick={() => setActiveTab("extended")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0",
            activeTab === "extended"
              ? "border-[#FDB827] text-[#FDB827]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Plantel General / Reserva</span>
        </button>
      </div>

      {/* ── Contenido de la Pestaña Activa ── */}
      <div>
        {activeTab === "weekly" && (
          <WeeklyRosterTab
            players={LEONES_WEEKLY_ROSTER}
            onOpenPdf={() => setIsPdfModalOpen(true)}
          />
        )}
        {activeTab === "staff" && <StaffTab />}
        {activeTab === "extended" && <ExtendedRosterTab />}
      </div>

      {/* ── Modal Visor del PDF Oficial ── */}
      <PdfViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        meta={WEEKLY_ROSTER_META}
      />
    </div>
  );
}
