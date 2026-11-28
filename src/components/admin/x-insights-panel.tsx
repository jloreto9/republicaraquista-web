"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  MessageSquareQuote,
  RefreshCw,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  X_INSIGHT_CARD_DIMENSIONS,
  generateXInsightCardBlob,
  renderXInsightCardOnCanvas,
  type XInsightCardFormat,
} from "@/lib/x-insight-card-canvas";
import type {
  XInsightCardVisualData,
  XInsightDraft,
  XInsightFocus,
  XInsightsResponseData,
} from "@/types/x-insights";

export interface XInsightsPanelProps {
  adminPassword: string;
}

const CACHE_STORAGE_KEY = "noticueva_x_insights_cache";
const MAX_MANUAL_CONTEXT_CHARS = 400;
const MAX_TWEET_CHARS = 280;

const FOCUS_OPTIONS: Array<{ value: XInsightFocus; label: string }> = [
  { value: "auto", label: "Automático" },
  { value: "postgame", label: "Postgame" },
  { value: "tendencia", label: "Tendencia / Dato" },
  { value: "debate", label: "Debate / Polémica" },
  { value: "hilo", label: "Hilo 3-4 tuits" },
];

const DEFAULT_CARD_DATA: XInsightCardVisualData = {
  kicker: "DATO CARAQUISTA",
  headline: "Rendimiento ofensivo de Leones en el Estadio Monumental Simón Bolívar",
  primaryStatValue: ".312",
  primaryStatLabel: "AVG Colectivo Reciente",
  comparisonText: "Producción sostenida con corredores en posición anotadora durante la semana.",
  sourceFooter: "LVBP • MLB Stats API • @RepubCaraquista",
};

function readCachedInsights(): XInsightsResponseData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<XInsightsResponseData>;
    if (
      parsed &&
      Array.isArray(parsed.drafts) &&
      parsed.contextSummary &&
      typeof parsed.season === "number"
    ) {
      return parsed as XInsightsResponseData;
    }
  } catch {
    return null;
  }
  return null;
}

function writeCachedInsights(payload: XInsightsResponseData | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!payload) {
      window.sessionStorage.removeItem(CACHE_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Silenciar errores de cuota en sessionStorage
  }
}

function formatGeneratedTimestamp(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function buildCardFilename(kicker: string, format: XInsightCardFormat): string {
  const slug = (kicker.trim() || "dato-caraquista")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9ñ-]/g, "");
  return `x-insight-${slug || "dato"}-${format}.png`;
}

export function XInsightsPanel({ adminPassword }: XInsightsPanelProps) {
  const baseId = useId();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const studioSectionRef = useRef<HTMLDivElement | null>(null);

  const [focus, setFocus] = useState<XInsightFocus>("auto");
  const [manualContext, setManualContext] = useState<string>("");
  const [insightsData, setInsightsData] = useState<XInsightsResponseData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [copiedPollId, setCopiedPollId] = useState<string | null>(null);
  const [openFacts, setOpenFacts] = useState<Record<string, boolean>>({});

  // Estudio de Tarjeta Dato 𝕏 (PNG)
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);
  const [cardFormat, setCardFormat] = useState<XInsightCardFormat>("landscape");
  const [cardData, setCardData] = useState<XInsightCardVisualData>(DEFAULT_CARD_DATA);
  const [activeCardDraftId, setActiveCardDraftId] = useState<string | null>(null);
  const [isExportingCard, setIsExportingCard] = useState<boolean>(false);
  const [copiedCardImage, setCopiedCardImage] = useState<boolean>(false);
  const [cardFeedback, setCardFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Hidratar caché de sesión al montar (evita perder borradores al cambiar de pestaña)
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      const cached = readCachedInsights();
      if (!cached) return;
      setInsightsData(cached);
      setFocus(cached.focus || "auto");
      if (cached.drafts[0]?.cardSuggestion) {
        setCardData(cached.drafts[0].cardSuggestion);
        setActiveCardDraftId(cached.drafts[0].id);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Renderizado en vivo del <canvas> cuando el estudio está visible
  useEffect(() => {
    if (!isStudioOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    void renderXInsightCardOnCanvas(canvas, cardData, cardFormat).then(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [isStudioOpen, cardData, cardFormat]);

  const updateInsightsData = useCallback((nextData: XInsightsResponseData) => {
    setInsightsData(nextData);
    writeCachedInsights(nextData);
  }, []);

  const handleGenerate = async (forceRefresh: boolean) => {
    if (!adminPassword.trim()) {
      setErrorMsg("Sesión sin clave de administración. Vuelve a iniciar sesión.");
      return;
    }

    setErrorMsg(null);
    if (forceRefresh) {
      setIsRegenerating(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await fetch("/api/noticueva/x-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminPassword,
        },
        body: JSON.stringify({
          focus,
          manualContext: manualContext.trim() || undefined,
          forceRefresh,
          password: adminPassword,
        }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        data?: XInsightsResponseData;
        error?: string;
      };

      if (!res.ok || !json.success || !json.data) {
        throw new Error(
          json.error || "No se pudieron generar los borradores para 𝕏 en este momento."
        );
      }

      updateInsightsData(json.data);
      if (json.data.drafts[0]?.cardSuggestion) {
        setCardData(json.data.drafts[0].cardSuggestion);
        setActiveCardDraftId(json.data.drafts[0].id);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error inesperado al consultar el generador de 𝕏."
      );
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  };

  const handleTweetChange = (draftId: string, tweetIdx: number, nextValue: string) => {
    if (!insightsData) return;
    const updatedDrafts = insightsData.drafts.map((draft) => {
      if (draft.id !== draftId) return draft;
      const nextTweets = draft.tweets.map((t, idx) => (idx === tweetIdx ? nextValue : t));
      return { ...draft, tweets: nextTweets };
    });
    updateInsightsData({ ...insightsData, drafts: updatedDrafts });
  };

  const handleCopyDraftText = async (draft: XInsightDraft) => {
    const joined = draft.tweets
      .map((t) => t.trim())
      .filter(Boolean)
      .join("\n\n");
    if (!joined) return;
    try {
      await navigator.clipboard.writeText(joined);
      setCopiedDraftId(draft.id);
      setTimeout(() => {
        setCopiedDraftId((prev) => (prev === draft.id ? null : prev));
      }, 2200);
    } catch {
      setErrorMsg("No se pudo copiar el texto al portapapeles.");
    }
  };

  const handleCopyPollOptions = async (draft: XInsightDraft) => {
    if (!draft.pollOptions?.length) return;
    const formatted = draft.pollOptions.map((opt, idx) => `${idx + 1}. ${opt}`).join("\n");
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedPollId(draft.id);
      setTimeout(() => {
        setCopiedPollId((prev) => (prev === draft.id ? null : prev));
      }, 2200);
    } catch {
      setErrorMsg("No se pudieron copiar las opciones de encuesta.");
    }
  };

  const handleUseInCard = (draft: XInsightDraft) => {
    setCardData(draft.cardSuggestion);
    setActiveCardDraftId(draft.id);
    setIsStudioOpen(true);
    setCardFeedback(null);
    setTimeout(() => {
      studioSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 60);
  };

  const handleCardFieldChange = (field: keyof XInsightCardVisualData, value: string) => {
    setCardData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDownloadCardPng = async () => {
    setIsExportingCard(true);
    setCardFeedback(null);
    try {
      const blob = await generateXInsightCardBlob(cardData, cardFormat);
      if (!blob) {
        throw new Error("No se pudo generar la imagen PNG.");
      }
      const filename = buildCardFilename(cardData.kicker, cardFormat);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setCardFeedback({
        type: "success",
        message: `Tarjeta descargada: ${filename}`,
      });
    } catch (err: unknown) {
      setCardFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Error al exportar la tarjeta PNG.",
      });
    } finally {
      setIsExportingCard(false);
    }
  };

  const handleCopyCardImage = async () => {
    setCardFeedback(null);
    if (
      typeof window === "undefined" ||
      typeof ClipboardItem === "undefined" ||
      !navigator.clipboard?.write
    ) {
      setCardFeedback({
        type: "error",
        message: "Tu navegador no permite copiar imágenes directamente. Usa Descargar PNG.",
      });
      return;
    }

    setIsExportingCard(true);
    try {
      const blobPromise = generateXInsightCardBlob(cardData, cardFormat).then((blob) => {
        if (!blob) {
          throw new Error("No se pudo generar la imagen PNG.");
        }
        return blob;
      });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
      setCopiedCardImage(true);
      setTimeout(() => setCopiedCardImage(false), 2400);
      setCardFeedback({
        type: "success",
        message: "Imagen copiada al portapapeles. Lista para pegar en 𝕏.",
      });
    } catch {
      setCardFeedback({
        type: "error",
        message: "No se pudo copiar la imagen al portapapeles. Usa Descargar PNG.",
      });
    } finally {
      setIsExportingCard(false);
    }
  };

  const contextInputId = `${baseId}-manual-context`;
  const dims = X_INSIGHT_CARD_DIMENSIONS[cardFormat];
  const busy = isLoading || isRegenerating;

  return (
    <section
      aria-labelledby={`${baseId}-heading`}
      className="rounded-2xl border border-[#1E2B4D] bg-[#0D152B] p-5 sm:p-6 shadow-xl space-y-6 text-slate-100"
    >
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2B4D] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/30 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 id={`${baseId}-heading`} className="text-base font-bold text-white tracking-wide">
              Redactor Inteligente para 𝕏 • @RepubCaraquista
            </h3>
            <p className="text-xs text-slate-400">
              Borradores editoriales con datos verificados de Leones del Caracas y la LVBP
            </p>
          </div>
        </div>

        {insightsData && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-[#070B19] border border-[#1E2B4D] text-slate-300">
              Temp. {insightsData.season}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#070B19] border border-[#1E2B4D] text-[#FDB827]">
              {insightsData.cached ? "Caché (5m)" : "En vivo"}
              {insightsData.generatedAt ? ` • ${formatGeneratedTimestamp(insightsData.generatedAt)}` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Controles de Generación */}
      <div className="space-y-4">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Enfoque Editorial
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Selector de enfoque editorial">
            {FOCUS_OPTIONS.map((option) => {
              const active = focus === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFocus(option.value)}
                  disabled={busy}
                  aria-pressed={active}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono transition-colors border focus-visible:outline-2 focus-visible:outline-[#FDB827] ${
                    active
                      ? "bg-[#FDB827] text-[#070B19] border-[#FDB827] font-bold shadow-sm"
                      : "bg-[#070B19] text-slate-300 border-[#1E2B4D] hover:border-[#FDB827]/50 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor={contextInputId}
              className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Contexto o ángulo manual (Opcional)
            </label>
            <span
              className={`text-[11px] font-mono ${
                manualContext.length >= MAX_MANUAL_CONTEXT_CHARS ? "text-amber-300" : "text-slate-400"
              }`}
            >
              {manualContext.length} / {MAX_MANUAL_CONTEXT_CHARS}
            </span>
          </div>
          <textarea
            id={contextInputId}
            value={manualContext}
            onChange={(e) => setManualContext(e.target.value.slice(0, MAX_MANUAL_CONTEXT_CHARS))}
            maxLength={MAX_MANUAL_CONTEXT_CHARS}
            rows={2}
            placeholder="Ej: Destacar el momento oportuno del bullpen en el Monumental o pedir opinión sobre el orden al bate..."
            className="w-full rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3.5 py-2.5 text-sm sm:text-xs text-slate-100 placeholder-slate-500 focus:border-[#FDB827]/70 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleGenerate(false)}
            disabled={busy}
            className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[#FDB827] hover:bg-[#FDB827]/90 text-[#070B19] font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando ideas...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generar Insights para 𝕏</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleGenerate(true)}
            disabled={busy}
            className="min-h-[42px] px-4 py-2.5 rounded-xl bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-slate-200 font-mono text-xs flex items-center gap-2 transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#FDB827]"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#FDB827] ${isRegenerating ? "animate-spin" : ""}`} />
            <span>{isRegenerating ? "Regenerando..." : "Regenerar"}</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-700/50 text-rose-200 text-xs flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Barra de Resumen de Contexto */}
      {insightsData && (
        <div className="rounded-xl border border-[#1E2B4D] bg-[#070B19] p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-[#FDB827]" />
              Récord Leones
            </span>
            <p className="font-mono font-bold text-white tabular-nums">
              {insightsData.contextSummary.leonesRecord || "Sin registro"}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono uppercase text-slate-400">Posición</span>
            <p className="font-mono font-bold text-[#FDB827] tabular-nums">
              {insightsData.contextSummary.leonesPosition > 0
                ? `#${insightsData.contextSummary.leonesPosition} LVBP`
                : "Tabla LVBP"}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono uppercase text-slate-400">Racha</span>
            <p className="font-mono font-semibold text-slate-200">
              {insightsData.contextSummary.streak || "—"}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono uppercase text-slate-400">Último Juego</span>
            <p className="text-slate-200 truncate" title={insightsData.contextSummary.lastGameHeadline}>
              {insightsData.contextSummary.lastGameHeadline || "Sin encuentro reciente"}
            </p>
          </div>
        </div>
      )}

      {/* Lista de Borradores Editables */}
      {insightsData && insightsData.drafts.length > 0 ? (
        <div className="space-y-4">
          {insightsData.drafts.map((draft, draftIdx) => {
            const isThread = draft.format === "thread" || draft.tweets.length > 1;
            const firstTweetText = draft.tweets[0] || "";
            const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(firstTweetText)}`;
            const factOpen = Boolean(openFacts[draft.id]);
            const isActiveCard = activeCardDraftId === draft.id && isStudioOpen;

            return (
              <article
                key={draft.id || `draft-${draftIdx}`}
                className="rounded-2xl border border-[#1E2B4D] bg-[#070B19]/90 p-4 sm:p-5 space-y-4"
              >
                {/* Encabezado de Borrador */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#002D62] border border-[#FDB827]/40 text-[#FDB827] text-[11px] font-mono font-bold">
                      {draft.angleLabel || `Ángulo #${draftIdx + 1}`}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#131E3D] border border-[#1E2B4D] text-slate-300 text-[11px] font-mono">
                      {isThread ? `Hilo ${draft.tweets.length} tuits` : "Post Único"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyDraftText(draft)}
                      className="px-3 py-1.5 rounded-lg bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedDraftId === draft.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#FDB827]" />
                          <span>Copiar texto</span>
                        </>
                      )}
                    </button>

                    <a
                      href={intentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={
                        isThread
                          ? "Abre el primer tuit en 𝕏 (copia el resto del hilo para completarlo)"
                          : "Abrir borrador en 𝕏"
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      <span>Abrir en 𝕏</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#FDB827]" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleUseInCard(draft)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
                        isActiveCard
                          ? "bg-[#FDB827] text-[#070B19] border-[#FDB827] font-bold"
                          : "bg-[#002D62]/70 hover:bg-[#002D62] border-[#FDB827]/40 text-[#FDB827]"
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Usar en Tarjeta PNG</span>
                    </button>
                  </div>
                </div>

                {/* Textareas Editables por Tuit */}
                <div className="space-y-3">
                  {draft.tweets.map((tweetText, tIdx) => {
                    const charCount = tweetText.length;
                    const overLimit = charCount > MAX_TWEET_CHARS;
                    const nearLimit = !overLimit && charCount >= 260;

                    return (
                      <div key={`${draft.id}-tweet-${tIdx}`} className="space-y-1">
                        {isThread && (
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span>
                              Tuit {tIdx + 1} de {draft.tweets.length}
                            </span>
                            <span
                              className={`tabular-nums ${
                                overLimit
                                  ? "text-rose-400 font-bold"
                                  : nearLimit
                                  ? "text-amber-300"
                                  : "text-slate-400"
                              }`}
                            >
                              {charCount} / {MAX_TWEET_CHARS}
                            </span>
                          </div>
                        )}
                        <textarea
                          value={tweetText}
                          onChange={(e) => handleTweetChange(draft.id, tIdx, e.target.value)}
                          rows={isThread ? 3 : 4}
                          aria-label={
                            isThread
                              ? `Texto del tuit ${tIdx + 1} del borrador ${draftIdx + 1}`
                              : `Texto del borrador ${draftIdx + 1}`
                          }
                          className={`w-full rounded-xl border bg-[#0D152B] px-3.5 py-2.5 text-sm leading-relaxed text-slate-100 focus:outline-none transition-colors ${
                            overLimit
                              ? "border-rose-500/70 focus:border-rose-400"
                              : "border-[#1E2B4D] focus:border-[#FDB827]/70"
                          }`}
                        />
                        {!isThread && (
                          <div className="flex justify-end">
                            <span
                              className={`text-[11px] font-mono tabular-nums ${
                                overLimit
                                  ? "text-rose-400 font-bold"
                                  : nearLimit
                                  ? "text-amber-300"
                                  : "text-slate-400"
                              }`}
                            >
                              {charCount} / {MAX_TWEET_CHARS}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Dato de respaldo verificado (colapsable) + Sugerencia de encuesta / CTA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-[#1E2B4D] bg-[#0D152B] p-3">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFacts((prev) => ({ ...prev, [draft.id]: !prev[draft.id] }))
                      }
                      aria-expanded={factOpen}
                      className="w-full flex items-center justify-between text-xs font-mono font-semibold text-slate-200 hover:text-[#FDB827] transition-colors"
                    >
                      <span>Dato de respaldo verificado</span>
                      {factOpen ? (
                        <ChevronUp className="w-4 h-4 text-[#FDB827] shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {factOpen && (
                      <p className="mt-2 pt-2 border-t border-[#1E2B4D]/70 text-xs text-slate-300 leading-relaxed">
                        {draft.backingFact || "Basado en registros oficiales de la temporada LVBP."}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#1E2B4D] bg-[#0D152B] p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold text-[#FDB827] flex items-center gap-1.5">
                        <MessageSquareQuote className="w-3.5 h-3.5 shrink-0" />
                        <span>Sugerencia de encuesta / CTA</span>
                      </span>
                      {draft.pollOptions && draft.pollOptions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleCopyPollOptions(draft)}
                          className="px-2 py-1 rounded-md bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-[11px] font-mono text-slate-300 flex items-center gap-1"
                        >
                          {copiedPollId === draft.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-300">Opciones copiadas</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-[#FDB827]" />
                              <span>Copiar encuesta</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {draft.engagementHook || "Pregunta directa a la fanaticada caraquista."}
                    </p>

                    {draft.pollOptions && draft.pollOptions.length > 0 && (
                      <ul className="space-y-1 pt-1">
                        {draft.pollOptions.map((option, oIdx) => (
                          <li
                            key={`${draft.id}-poll-${oIdx}`}
                            className="text-[11px] font-mono text-slate-300 bg-[#070B19] border border-[#1E2B4D] rounded-lg px-2.5 py-1"
                          >
                            {oIdx + 1}. {option}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        !busy && (
          <div className="rounded-2xl border border-dashed border-[#1E2B4D] bg-[#070B19]/60 p-6 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-200">
              Listo para redactar contenido caraquista en 𝕏
            </p>
            <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
              Selecciona el enfoque editorial y presiona{" "}
              <strong className="text-[#FDB827]">Generar Insights para 𝕏</strong> para recibir 3–4
              borradores listos para publicar con estadísticas reales de la LVBP.
            </p>
          </div>
        )
      )}

      {/* Estudio Opcional Colapsable: Tarjeta Dato 𝕏 (PNG) */}
      <div
        ref={studioSectionRef}
        className="rounded-2xl border border-[#1E2B4D] bg-[#070B19] overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setIsStudioOpen((prev) => !prev)}
          aria-expanded={isStudioOpen}
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 bg-[#131E3D]/60 hover:bg-[#131E3D] transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-4 h-4 text-[#FDB827] shrink-0" />
            <div>
              <span className="text-xs sm:text-sm font-bold text-white block">
                Tarjeta Dato 𝕏 (PNG)
              </span>
              <span className="text-[11px] text-slate-400 block">
                Estudio visual 1200×675 o 1080×1080 listo para acompañar tus hilos
              </span>
            </div>
          </div>

          <span className="flex items-center gap-1.5 text-xs font-mono text-[#FDB827] shrink-0">
            <span>{isStudioOpen ? "Ocultar estudio" : "Abrir estudio"}</span>
            {isStudioOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {isStudioOpen && (
          <div className="p-4 sm:p-5 border-t border-[#1E2B4D] grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Controles editables */}
            <div className="lg:col-span-5 space-y-3.5">
              <div>
                <span className="block text-xs font-mono text-slate-400 mb-1.5">
                  Formato de Tarjeta
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCardFormat("landscape")}
                    className={`px-3 py-2 rounded-xl border text-xs font-mono transition-colors ${
                      cardFormat === "landscape"
                        ? "bg-[#FDB827] text-[#070B19] border-[#FDB827] font-bold"
                        : "bg-[#0D152B] text-slate-300 border-[#1E2B4D] hover:border-[#FDB827]/50"
                    }`}
                  >
                    1200×675 (Feed 𝕏)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardFormat("square")}
                    className={`px-3 py-2 rounded-xl border text-xs font-mono transition-colors ${
                      cardFormat === "square"
                        ? "bg-[#FDB827] text-[#070B19] border-[#FDB827] font-bold"
                        : "bg-[#0D152B] text-slate-300 border-[#1E2B4D] hover:border-[#FDB827]/50"
                    }`}
                  >
                    1080×1080 (1:1)
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor={`${baseId}-card-kicker`}
                  className="block text-xs font-mono text-slate-400 mb-1"
                >
                  Cintillo / Kicker
                </label>
                <input
                  id={`${baseId}-card-kicker`}
                  type="text"
                  value={cardData.kicker}
                  onChange={(e) => handleCardFieldChange("kicker", e.target.value)}
                  className="w-full rounded-xl border border-[#1E2B4D] bg-[#0D152B] px-3 py-2 text-xs font-mono text-white focus:border-[#FDB827] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor={`${baseId}-card-headline`}
                  className="block text-xs font-mono text-slate-400 mb-1"
                >
                  Titular
                </label>
                <textarea
                  id={`${baseId}-card-headline`}
                  rows={2}
                  value={cardData.headline}
                  onChange={(e) => handleCardFieldChange("headline", e.target.value)}
                  className="w-full rounded-xl border border-[#1E2B4D] bg-[#0D152B] px-3 py-2 text-xs text-white focus:border-[#FDB827] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${baseId}-card-stat-val`}
                    className="block text-xs font-mono text-slate-400 mb-1"
                  >
                    Cifra Principal
                  </label>
                  <input
                    id={`${baseId}-card-stat-val`}
                    type="text"
                    value={cardData.primaryStatValue}
                    onChange={(e) => handleCardFieldChange("primaryStatValue", e.target.value)}
                    className="w-full rounded-xl border border-[#1E2B4D] bg-[#0D152B] px-3 py-2 text-xs font-mono font-bold text-[#FDB827] focus:border-[#FDB827] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${baseId}-card-stat-label`}
                    className="block text-xs font-mono text-slate-400 mb-1"
                  >
                    Etiqueta del Dato
                  </label>
                  <input
                    id={`${baseId}-card-stat-label`}
                    type="text"
                    value={cardData.primaryStatLabel}
                    onChange={(e) => handleCardFieldChange("primaryStatLabel", e.target.value)}
                    className="w-full rounded-xl border border-[#1E2B4D] bg-[#0D152B] px-3 py-2 text-xs text-white focus:border-[#FDB827] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={`${baseId}-card-comp`}
                  className="block text-xs font-mono text-slate-400 mb-1"
                >
                  Comparativa / Contexto
                </label>
                <textarea
                  id={`${baseId}-card-comp`}
                  rows={2}
                  value={cardData.comparisonText}
                  onChange={(e) => handleCardFieldChange("comparisonText", e.target.value)}
                  className="w-full rounded-xl border border-[#1E2B4D] bg-[#0D152B] px-3 py-2 text-xs text-white focus:border-[#FDB827] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadCardPng}
                  disabled={isExportingCard}
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-[#FDB827] hover:bg-[#FDB827]/90 text-[#070B19] font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCardImage}
                  disabled={isExportingCard}
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-slate-200 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                >
                  {copiedCardImage ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copiada</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#FDB827]" />
                      <span>Copiar Imagen</span>
                    </>
                  )}
                </button>
              </div>

              {cardFeedback && (
                <div
                  role={cardFeedback.type === "error" ? "alert" : "status"}
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                    cardFeedback.type === "success"
                      ? "bg-emerald-950/40 border-emerald-700/50 text-emerald-200"
                      : "bg-rose-950/40 border-rose-700/50 text-rose-200"
                  }`}
                >
                  {cardFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{cardFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Vista previa en vivo del Canvas */}
            <div className="lg:col-span-7 flex flex-col items-center rounded-xl border border-[#1E2B4D] bg-[#0D152B] p-3">
              <canvas
                ref={canvasRef}
                width={dims.width}
                height={dims.height}
                role="img"
                aria-label={`Vista previa de Tarjeta Dato X: ${cardData.headline}`}
                className={`w-full rounded-lg border border-[#1E2B4D] bg-[#070B19] block ${
                  cardFormat === "square" ? "aspect-square max-w-[440px]" : "aspect-video"
                }`}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
