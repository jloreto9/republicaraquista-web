"use client";

import { useState, useMemo, useEffect } from "react";
import {
  getSampleDailyCard,
  extractBestOdds,
  evaluateAssessments,
} from "@/lib/probabilidades-engine";
import {
  SportsbookId,
  SportsbookOdds,
  GameProjection,
  OddsFormat,
} from "@/types/probabilidades";
import { ProbabilidadesHeader } from "@/components/probabilidades/probabilidades-header";
import { TopPicksBanner } from "@/components/probabilidades/top-picks-banner";
import { GameProbabilityCard } from "@/components/probabilidades/game-probability-card";
import { FreeSimulatorModal } from "@/components/probabilidades/free-simulator-modal";
import { ExportCardModal } from "@/components/probabilidades/export-card-modal";

export default function ProbabilidadesPage() {
  const [currentDate, setCurrentDate] = useState("2026-10-15");
  const [selectedBook, setSelectedBook] = useState<SportsbookId | "all">("all");
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>("american");
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [liveOddsPayload, setLiveOddsPayload] = useState<any>(null);
  const [isLoadingOdds, setIsLoadingOdds] = useState(false);

  // Cuotas personalizadas editadas por el usuario (gameId -> sportsbookId -> field -> value)
  const [customOddsOverrides, setCustomOddsOverrides] = useState<
    Record<string, Partial<Record<SportsbookId, Partial<SportsbookOdds>>>>
  >({});

  // Cargar cuotas en vivo de la API (/api/odds) al cambiar la fecha
  useEffect(() => {
    let isMounted = true;
    async function loadLiveOdds() {
      try {
        setIsLoadingOdds(true);
        const res = await fetch(`/api/odds?date=${currentDate}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && json.data) {
            setLiveOddsPayload(json.data);
          }
        }
      } catch (err) {
        console.warn("No se pudieron obtener cuotas en vivo desde /api/odds:", err);
      } finally {
        if (isMounted) setIsLoadingOdds(false);
      }
    }
    loadLiveOdds();
    return () => {
      isMounted = false;
    };
  }, [currentDate]);

  // Generar datos base de la jornada
  const baseCard = useMemo(() => {
    return getSampleDailyCard(currentDate);
  }, [currentDate]);

  // Aplicar cuotas en vivo y overrides reactivos de cuotas ingresados por el usuario
  const reactiveCard = useMemo(() => {
    const updatedProjections: GameProjection[] = baseCard.projections.map((p) => {
      let currentOdds = { ...p.oddsByBook };

      // 1. Fusionar cuotas reales en vivo si existen en el payload de la API
      if (liveOddsPayload?.games && Array.isArray(liveOddsPayload.games)) {
        const liveGame = liveOddsPayload.games.find(
          (g: any) =>
            (g.homeTeamId === p.homeTeamId && g.awayTeamId === p.awayTeamId) ||
            (g.homeTeamAbbr === p.homeTeamAbbr && g.awayTeamAbbr === p.awayTeamAbbr) ||
            g.gameId === p.gameId
        );
        if (liveGame?.oddsByBook) {
          currentOdds = {
            ...currentOdds,
            ...liveGame.oddsByBook,
          };
        }
      }

      // 2. Aplicar overrides manuales del usuario (prioridad máxima)
      const overridesForGame = customOddsOverrides[p.gameId];
      if (overridesForGame) {
        for (const [bId, fields] of Object.entries(overridesForGame)) {
          const bookKey = bId as SportsbookId;
          if (currentOdds[bookKey]) {
            currentOdds[bookKey] = {
              ...currentOdds[bookKey],
              ...fields,
            };
          }
        }
      }

      const bestOdds = extractBestOdds(currentOdds);
      const assessments = evaluateAssessments(
        p.model,
        currentOdds,
        p.homeTeamAbbr,
        p.awayTeamAbbr,
        p.homePitcher,
        p.awayPitcher,
        p.parkFactor
      );
      const topPick = assessments.find((a) => a.rating === "mispriced") || assessments[0];

      return {
        ...p,
        oddsByBook: currentOdds,
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
  }, [baseCard, customOddsOverrides, liveOddsPayload]);

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
        oddsFormat={oddsFormat}
        onOddsFormatChange={setOddsFormat}
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
        oddsFormat={oddsFormat}
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
              oddsFormat={oddsFormat}
              onUpdateOdd={handleUpdateOdd}
            />
          ))}
        </div>
      </div>

      {/* ── 4. Descargo de Responsabilidad Legal & Sabermétrico (Disclaimer) ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D152B]/70 border border-[#1E2B4D] text-xs space-y-2.5">
        <div className="flex items-center space-x-2 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
          <span className="p-1 rounded bg-slate-800 text-[#FDB827]">⚖️</span>
          <span>Aviso Legal, Cuotas de Referencia & Juego Responsable</span>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          <strong className="text-slate-300">1. Carácter Estadístico e Informativo:</strong> Las probabilidades, carreras esperadas ($xR$), líneas justas y métricas de valor (+EV) generadas por este módulo son proyecciones matemáticas teóricas basadas en modelos sabermétricos independientes (ELO dinámico, FIP monticular, rendimiento de bullpen, factores de parque de la LVBP y distribuciones bivariadas Poisson/Skellam). No constituyen pronósticos infalibles, asesoría financiera ni garantía alguna de resultados en eventos deportivos reales.
        </p>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          <strong className="text-slate-300">2. Cuotas de Referencia y Simulación:</strong> Las líneas presentadas bajo los nombres de <em>JuegaEnLínea</em>, <em>Betcris</em>, <em>SellaTuParley</em> y <em>Apuestas Royal</em> son valores de referencia simulados y calibrados según los márgenes tradicionales de mercado. No provienen de feeds o APIs oficiales en vivo de dichas casas de apuestas. La plataforma permite expresamente al usuario editar e ingresar sus propias cuotas en tiempo real para adaptar el modelo a sus líneas locales.
        </p>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          <strong className="text-slate-300">3. Juego Responsable (+18):</strong> República Caraquista no es una casa de apuestas, no recibe apuestas, no intermedia pagos ni incentiva el juego de azar no regulado. El uso de esta herramienta está destinado exclusivamente a mayores de 18 años con fines recreativos y analíticos. Si decides apostar, hazlo con estricta gestión de bankroll (Criterio de Kelly sugerido) y nunca arriesgues capital que comprometa tu estabilidad personal o familiar.
        </p>
      </div>

      {/* ── 5. Modales: Simulador Libre & Exportación Gráfica HD ── */}
      <FreeSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        oddsFormat={oddsFormat}
      />

      <ExportCardModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        dateStr={currentDate}
        projections={reactiveCard.projections}
        topPicks={reactiveCard.topPicks}
        mispricedAlerts={reactiveCard.mispricedAlerts}
        oddsFormat={oddsFormat}
      />
    </div>
  );
}
