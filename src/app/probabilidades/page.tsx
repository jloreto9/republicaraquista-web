"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSampleDailyCard,
  extractBestOdds,
  evaluateAssessments,
} from "@/lib/probabilidades-engine";
import { getNextScheduledGame } from "@/lib/calendar-service";
import {
  SportsbookId,
  SportsbookOdds,
  GameProjection,
  OddsFormat,
} from "@/types/probabilidades";
import { ProbabilidadesHeader } from "@/components/probabilidades/probabilidades-header";
import { NextGameBanner } from "@/components/probabilidades/next-game-banner";
import { TopPicksBanner } from "@/components/probabilidades/top-picks-banner";
import { GameProbabilityCard } from "@/components/probabilidades/game-probability-card";
import { FreeSimulatorModal } from "@/components/probabilidades/free-simulator-modal";
import { ExportCardModal } from "@/components/probabilidades/export-card-modal";
import { Calendar, Info, ArrowRight } from "lucide-react";

function ProbabilidadesContent() {
  const searchParams = useSearchParams();
  const urlDate = searchParams ? searchParams.get("date") : null;

  // Obtener el próximo juego del calendario como fecha por defecto
  const defaultNextGame = useMemo(() => {
    try {
      return getNextScheduledGame();
    } catch {
      return { date: "2026-10-13" } as any;
    }
  }, []);

  const [currentDate, setCurrentDate] = useState<string>(
    urlDate || defaultNextGame.date || "2026-10-13"
  );

  // Sincronizar si la URL cambia dinámicamente con ?date=...
  useEffect(() => {
    if (urlDate && urlDate !== currentDate) {
      setCurrentDate(urlDate);
    }
  }, [urlDate]);

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

  // Generar datos base de la jornada vinculados al calendario oficial
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
    val: number | null
  ) => {
    setCustomOddsOverrides((prev) => {
      const gameObj = prev[gameId] || {};
      const bookObj = gameObj[sportsbookId] || {};

      const updatedBook: Partial<SportsbookOdds> = {
        ...bookObj,
        [field]: val,
      };

      const hasValidLine =
        (updatedBook.homeMl != null && updatedBook.homeMl > 1.0) ||
        (updatedBook.awayMl != null && updatedBook.awayMl > 1.0) ||
        (updatedBook.overOdds != null && updatedBook.overOdds > 1.0) ||
        (updatedBook.underOdds != null && updatedBook.underOdds > 1.0);

      updatedBook.isOpen = hasValidLine;

      return {
        ...prev,
        [gameId]: {
          ...gameObj,
          [sportsbookId]: updatedBook,
        },
      };
    });
  };

  const handleResetOdds = () => {
    setCustomOddsOverrides({});
  };

  const hasCustomOdds = Object.keys(customOddsOverrides).length > 0;

  // Proyección del juego de Caracas si existe en la jornada actual
  const caracasProjection = reactiveCard.projections.find(
    (p) => p.homeTeamId === 695 || p.awayTeamId === 695
  );

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

      {/* ── 2. Banner del Próximo Juego Oficial en Calendario ── */}
      <NextGameBanner
        nextGame={reactiveCard.nextScheduledGame}
        currentDate={currentDate}
        onSelectDate={setCurrentDate}
        oddsFormat={oddsFormat}
        caracasProjection={caracasProjection}
      />

      {/* ── Aviso contextual si la fecha seleccionada es Día de Descanso en Calendario ── */}
      {reactiveCard.isRestDay && reactiveCard.nextScheduledGame && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0D152B]/80 border border-slate-700/60 text-xs">
          <div className="flex items-center space-x-2.5 text-slate-300">
            <Info className="w-4 h-4 text-[#FDB827] shrink-0" />
            <span>
              <strong>Día de Descanso en Calendario Oficial:</strong> Leones del Caracas no tiene juego programado el {currentDate}. Mostrando simulación sabermétrica de cartelera.
            </span>
          </div>

          <button
            onClick={() => setCurrentDate(reactiveCard.nextScheduledGame!.date)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#FDB827]/15 hover:bg-[#FDB827]/25 border border-[#FDB827]/40 text-[#FDB827] font-bold text-xs self-start sm:self-auto transition-all"
          >
            <span>Ir al Próximo Juego ({reactiveCard.nextScheduledGame.date})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 3. Top Picks del Día & Alertas de Cuotas Desfasadas ── */}
      <TopPicksBanner
        picks={reactiveCard.topPicks}
        mispricedAlerts={reactiveCard.mispricedAlerts}
        oddsFormat={oddsFormat}
      />

      {/* ── 4. Lista de Encuentros de la Jornada con Comparador ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">
              Partidos de la Jornada ({reactiveCard.projections.length} Encuentros)
            </h2>
            {reactiveCard.isCalendarScheduled && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Sincronizado con Calendario Oficial
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
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

      {/* ── 5. Descargo de Responsabilidad Legal & Sabermétrico (Disclaimer) ── */}
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

      {/* ── 6. Modales: Simulador Libre & Exportación Gráfica HD ── */}
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

export default function ProbabilidadesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#FDB827] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-wider font-bold">
            Sincronizando Calendario y Líneas Sabermétricas...
          </span>
        </div>
      }
    >
      <ProbabilidadesContent />
    </Suspense>
  );
}
