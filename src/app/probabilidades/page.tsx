"use client";

import { useState, useMemo } from "react";
import {
  getSampleDailyCard,
  extractBestOdds,
  evaluateAssessments,
} from "@/lib/probabilidades-engine";
import {
  SportsbookId,
  SportsbookOdds,
  GameProjection,
} from "@/types/probabilidades";
import { ProbabilidadesHeader } from "@/components/probabilidades/probabilidades-header";
import { TopPicksBanner } from "@/components/probabilidades/top-picks-banner";
import { GameProbabilityCard } from "@/components/probabilidades/game-probability-card";
import { FreeSimulatorModal } from "@/components/probabilidades/free-simulator-modal";
import { ExportCardModal } from "@/components/probabilidades/export-card-modal";

export default function ProbabilidadesPage() {
  const [currentDate, setCurrentDate] = useState("2026-10-15");
  const [selectedBook, setSelectedBook] = useState<SportsbookId | "all">("all");
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Cuotas personalizadas editadas por el usuario (gameId -> sportsbookId -> field -> value)
  const [customOddsOverrides, setCustomOddsOverrides] = useState<
    Record<string, Partial<Record<SportsbookId, Partial<SportsbookOdds>>>>
  >({});

  // Generar datos base de la jornada
  const baseCard = useMemo(() => {
    return getSampleDailyCard(currentDate);
  }, [currentDate]);

  // Aplicar overrides reactivos de cuotas ingresados por el usuario
  const reactiveCard = useMemo(() => {
    const updatedProjections: GameProjection[] = baseCard.projections.map((p) => {
      const overridesForGame = customOddsOverrides[p.gameId];
      if (!overridesForGame) return p;

      // Clonar oddsByBook aplicando cambios
      const updatedOdds = { ...p.oddsByBook };
      for (const [bId, fields] of Object.entries(overridesForGame)) {
        const bookKey = bId as SportsbookId;
        if (updatedOdds[bookKey]) {
          updatedOdds[bookKey] = {
            ...updatedOdds[bookKey],
            ...fields,
          };
        }
      }

      const bestOdds = extractBestOdds(updatedOdds);
      const assessments = evaluateAssessments(
        p.model,
        updatedOdds,
        p.homeTeamAbbr,
        p.awayTeamAbbr,
        p.homePitcher,
        p.awayPitcher,
        p.parkFactor
      );
      const topPick = assessments.find((a) => a.rating === "mispriced") || assessments[0];

      return {
        ...p,
        oddsByBook: updatedOdds,
        bestOdds,
        assessments,
        topPick,
      };
    });

    const allAssessments = updatedProjections.flatMap((p) => p.assessments);
    const mispricedAlerts = allAssessments.filter((a) => a.rating === "mispriced");
    const topPicks = allAssessments.filter((a) => a.evPercent >= 5.0).slice(0, 4);

    return {
      ...baseCard,
      projections: updatedProjections,
      topPicks,
      mispricedAlerts,
    };
  }, [baseCard, customOddsOverrides]);

  const handleUpdateOdd = (
    gameId: string,
    sportsbookId: SportsbookId,
    field: keyof SportsbookOdds,
    val: number
  ) => {
    setCustomOddsOverrides((prev) => {
      const gameObj = prev[gameId] || {};
      const bookObj = gameObj[sportsbookId] || {};

      return {
        ...prev,
        [gameId]: {
          ...gameObj,
          [sportsbookId]: {
            ...bookObj,
            [field]: val,
          },
        },
      };
    });
  };

  const handleResetOdds = () => {
    setCustomOddsOverrides({});
  };

  const hasCustomOdds = Object.keys(customOddsOverrides).length > 0;

  return (
    <div className="space-y-6 pb-16">
      {/* ── 1. Encabezado y Filtros Globales ── */}
      <ProbabilidadesHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        selectedBook={selectedBook}
        onSelectBook={setSelectedBook}
        onOpenSimulator={() => setSimulatorOpen(true)}
        onOpenExport={() => setExportOpen(true)}
        onResetOdds={handleResetOdds}
        hasCustomOdds={hasCustomOdds}
        mispricedCount={reactiveCard.mispricedAlerts.length}
      />

      {/* ── 2. Top Picks del Día & Alertas de Cuotas Desfasadas ── */}
      <TopPicksBanner
        picks={reactiveCard.topPicks}
        mispricedAlerts={reactiveCard.mispricedAlerts}
      />

      {/* ── 3. Lista de Encuentros del Día con Comparador ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">
            Partidos de la Jornada ({reactiveCard.projections.length} Encuentros)
          </h2>
          <span className="text-xs text-slate-400">
            Fórmulas: Poisson / Skellam • ELO + FIP + Parques
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {reactiveCard.projections.map((game) => (
            <GameProbabilityCard
              key={game.gameId}
              game={game}
              selectedBook={selectedBook}
              onUpdateOdd={handleUpdateOdd}
            />
          ))}
        </div>
      </div>

      {/* ── 4. Modales: Simulador Libre & Exportación Gráfica HD ── */}
      <FreeSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />

      <ExportCardModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        dateStr={currentDate}
        projections={reactiveCard.projections}
        topPicks={reactiveCard.topPicks}
        mispricedAlerts={reactiveCard.mispricedAlerts}
      />
    </div>
  );
}
