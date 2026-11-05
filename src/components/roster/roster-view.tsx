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
  RosterPlayer,
  WeeklyRosterMeta,
} from "@/data/roster-data";
import { RosterKpis } from "./roster-kpis";
import { WeeklyRosterTab } from "./weekly-roster-tab";
import { StaffTab } from "./staff-tab";
import { PdfViewerModal } from "./pdf-viewer-modal";
import { cn } from "@/lib/utils";

interface WeekHistoryItem {
  weekNumber: number;
  season: string;
  dateRange: string;
  officialDate: string;
  pdfUrl: string;
  remotePdfUrl?: string;
  maxLimit: number;
  totalActive: number;
  movements: {
    entran: string[];
    salen: string[];
  };
  players: RosterPlayer[];
}

export function RosterView() {
  const [activeTab, setActiveTab] = useState<"weekly" | "staff">("weekly");
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [meta, setMeta] = useState<WeeklyRosterMeta>(WEEKLY_ROSTER_META);
  const [players, setPlayers] = useState<RosterPlayer[]>(LEONES_WEEKLY_ROSTER);
  const [movements, setMovements] = useState<{ entran: string[]; salen: string[] }>({
    entran: [],
    salen: [],
  });
  const [weeksHistory, setWeeksHistory] = useState<WeekHistoryItem[]>([]);
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(4);

  React.useEffect(() => {
    fetch("/data/roster_latest.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.weeks && data.weeks.length > 0) {
            setWeeksHistory(data.weeks);
            const latest = data.weeks[0];
            setSelectedWeekNum(latest.weekNumber);
            setMeta({
              weekNumber: latest.weekNumber,
              season: latest.season || "2026-2027",
              dateRange: latest.dateRange,
              officialDate: latest.officialDate,
              maxLimit: latest.maxLimit || 34,
              totalActive: latest.totalActive || 34,
              pdfUrl: latest.pdfUrl,
              source: data.meta?.source || "Liga Venezolana de Béisbol Profesional (LVBP) · TuJonron.com",
            });
            setMovements(latest.movements || { entran: [], salen: [] });
            setPlayers(latest.players || []);
          } else if (data.meta) {
            setMeta((prev) => ({
              ...prev,
              officialDate: data.meta.officialDate || prev.officialDate,
              pdfUrl: data.meta.pdfUrl || prev.pdfUrl,
              totalActive: data.meta.totalActive || prev.totalActive,
              dateRange: data.meta.dateRange || prev.dateRange,
              weekNumber: data.meta.weekNumber || prev.weekNumber,
            }));
            if (data.meta.movements) {
              setMovements(data.meta.movements);
            }
            if (data.players && data.players.length > 0) {
              setPlayers(data.players);
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectWeek = (weekNum: number) => {
    setSelectedWeekNum(weekNum);
    const target = weeksHistory.find((w) => w.weekNumber === weekNum);
    if (target) {
      setMeta({
        weekNumber: target.weekNumber,
        season: target.season || "2026-2027",
        dateRange: target.dateRange,
        officialDate: target.officialDate,
        maxLimit: target.maxLimit || 34,
        totalActive: target.totalActive || 34,
        pdfUrl: target.pdfUrl,
        source: "Liga Venezolana de Béisbol Profesional (LVBP) · TuJonron.com",
      });
      setMovements(target.movements || { entran: [], salen: [] });
      setPlayers(target.players || []);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Barra Superior de Control de Semana y PDF ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0D152B]/60 border border-[#1E2B4D]">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Semanas Disponibles */}
          {weeksHistory.length > 0 && (
            <div className="flex items-center gap-1 p-1 bg-[#070B19] rounded-xl border border-[#1E2B4D]">
              {weeksHistory.map((w) => {
                const isSelected = selectedWeekNum === w.weekNumber;
                const isLatest = w.weekNumber === weeksHistory[0].weekNumber;
                return (
                  <button
                    key={w.weekNumber}
                    onClick={() => handleSelectWeek(w.weekNumber)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1",
                      isSelected
                        ? "bg-[#FDB827] text-[#070B19] font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <span>Sem {w.weekNumber}</span>
                    {isLatest && (
                      <span className={cn(
                        "text-[9px] px-1 py-0.2 rounded font-mono font-bold uppercase",
                        isSelected ? "bg-[#070B19]/20 text-[#070B19]" : "bg-[#FDB827]/15 text-[#FDB827]"
                      )}>
                        Actual
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

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
        </div>

        {/* Botón Descargar PDF Oficial de la Semana Activa */}
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
      {movements.entran.length > 0 || movements.salen.length > 0 ? (
        <div className="p-3.5 rounded-2xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">
              Movimientos Confirmados · Semana {meta.weekNumber} ({meta.dateRange}):
            </span>
            <span className="text-[10px] font-mono font-bold text-[#FDB827]">
              +{movements.entran.length} altas / -{movements.salen.length} bajas
            </span>
          </div>
          <div className="flex flex-wrap gap-4 items-center text-xs">
            {movements.entran.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-emerald-400 font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                  ENTRAN ({movements.entran.length}):
                </span>
                <span className="text-slate-200 font-medium">
                  {movements.entran.join(", ")}
                </span>
              </div>
            )}
            {movements.salen.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-rose-400 font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30">
                  SALEN ({movements.salen.length}):
                </span>
                <span className="text-slate-400 font-medium">
                  {movements.salen.join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        meta.weekNumber === 1 && (
          <div className="p-3.5 rounded-2xl bg-[#0D152B]/60 border border-[#1E2B4D] flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Róster Oficial de Apertura (Semana Inaugural LVBP 2026-2027)</span>
            <span className="text-emerald-400 font-bold">34 Activos Confirmados</span>
          </div>
        )
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
