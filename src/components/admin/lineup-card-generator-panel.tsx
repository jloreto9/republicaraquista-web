"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  MapPin,
  Radio,
  RefreshCw,
  RotateCcw,
  Share2,
  Users,
} from "lucide-react";
import type { LineupCardPayload, LineupCardSlot } from "@/lib/lineup-card-service";
import {
  LINEUP_CARD_HEIGHT,
  LINEUP_CARD_WIDTH,
  generateLineupCardBlob,
  renderLineupCardOnCanvas,
  type LineupCardRenderData,
  type LineupCardSlotRender,
} from "@/lib/lineup-card-canvas";
import type { PushSendResult } from "@/types/push-notifications";

export interface LineupCardGeneratorPanelProps {
  adminPassword?: string;
}

const DEFAULT_POSITIONS = ["LF", "CF", "RF", "BD", "3B", "SS", "2B", "1B", "C"] as const;
const POSITION_OPTIONS = ["LF", "CF", "RF", "3B", "SS", "2B", "1B", "C", "BD"] as const;
const POLL_INTERVAL_MS = 30_000;

function buildEditableSlots(rawSlots?: LineupCardSlot[]): LineupCardSlotRender[] {
  return Array.from({ length: 9 }, (_, index) => {
    const incoming = rawSlots?.[index];
    const rawPos = (incoming?.position || DEFAULT_POSITIONS[index] || "BD").trim().toUpperCase();
    const position = rawPos === "DH" ? "BD" : rawPos;
    return {
      order: index + 1,
      position,
      playerName: incoming?.playerName || "",
    };
  });
}

function buildDownloadFilename(opponentShort: string, dateShort: string): string {
  const cleanOpponent = (opponentShort.trim() || "rival")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9ñ-]/g, "");
  const cleanDate = (dateShort.trim() || "hoy")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `lineup-leones-vs-${cleanOpponent || "rival"}-${cleanDate || "hoy"}.png`;
}

async function requestLineupCard(
  targetGamePk: number | null,
  signal?: AbortSignal
): Promise<LineupCardPayload> {
  const query = targetGamePk ? `?gamePk=${encodeURIComponent(String(targetGamePk))}` : "";
  const res = await fetch(`/api/noticueva/lineup-card${query}`, {
    cache: "no-store",
    signal,
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: LineupCardPayload;
    error?: string;
  };

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || "No se pudo consultar el lineup desde MLB Stats API.");
  }

  return json.data;
}

export function LineupCardGeneratorPanel({
  adminPassword = "",
}: LineupCardGeneratorPanelProps) {
  const baseId = useId();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);
  const customBgObjectUrlRef = useRef<string | null>(null);

  // Control de polling seguro y edición manual (sin estados mutados por fetch en deps)
  const isDirtyRef = useRef<boolean>(false);
  const shouldPollRef = useRef<boolean>(false);
  const activeGamePkRef = useRef<number | null>(null);
  const lastFetchAtRef = useRef<number>(0);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Solo cambia por selección explícita del usuario en el selector de juegos
  const [selectedGamePk, setSelectedGamePk] = useState<number | null>(null);
  const [payload, setPayload] = useState<LineupCardPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Estado editable del generador
  const [opponentShort, setOpponentShort] = useState<string>("");
  const [slots, setSlots] = useState<LineupCardSlotRender[]>(() => buildEditableSlots());
  const [pitcherName, setPitcherName] = useState<string>("POR ANUNCIAR");
  const [transmissionLine1, setTransmissionLine1] = useState<string>("TRANSMISIÓN OFICIAL");
  const [transmissionLine2, setTransmissionLine2] = useState<string>("BeisbolPlay, La Mega");
  const [dateShort, setDateShort] = useState<string>("");
  const [timeCompact, setTimeCompact] = useState<string>("");
  const [stadiumName, setStadiumName] = useState<string>("");
  const [customBgSrc, setCustomBgSrc] = useState<string | null>(null);

  const [isManualEdited, setIsManualEdited] = useState<boolean>(false);
  const [pendingOfficialPayload, setPendingOfficialPayload] = useState<LineupCardPayload | null>(null);

  // Estados de acciones de exportación y push
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [sendingPush, setSendingPush] = useState<boolean>(false);
  const [pushResult, setPushResult] = useState<PushSendResult | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const applyPayloadToEditor = useCallback((data: LineupCardPayload) => {
    setOpponentShort(data.opponentShort || "");
    setSlots(buildEditableSlots(data.slots));
    setPitcherName(data.pitcherName || "POR ANUNCIAR");
    setTransmissionLine1(data.transmissionLine1 || "TRANSMISIÓN OFICIAL");
    setTransmissionLine2(data.transmissionLine2 || "BeisbolPlay, La Mega");
    setDateShort(data.dateShort || "");
    setTimeCompact(data.timeCompact || "");
    setStadiumName(data.stadiumName || "");
    isDirtyRef.current = false;
    setIsManualEdited(false);
    setPendingOfficialPayload(null);
  }, []);

  const runBackgroundPoll = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const data = await requestLineupCard(activeGamePkRef.current, controller.signal);
      lastFetchAtRef.current = Date.now();
      activeGamePkRef.current = data.gamePk;
      setPayload(data);

      if (data.hasOfficialLineup) {
        if (!isDirtyRef.current) {
          applyPayloadToEditor(data);
          setActionFeedback({
            type: "success",
            message: "Lineup oficial detectado y cargado desde MLB Stats API.",
          });
        } else {
          setPendingOfficialPayload(data);
        }
      }
    } catch {
      // Silenciar fallos transitorios en polling en segundo plano para no interrumpir la edición
    }
  }, [applyPayloadToEditor]);

  // Carga inicial y cambio explícito de juego seleccionado por el usuario
  useEffect(() => {
    let active = true;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    requestLineupCard(selectedGamePk, controller.signal)
      .then((data) => {
        if (!active) return;
        lastFetchAtRef.current = Date.now();
        activeGamePkRef.current = data.gamePk;
        setPayload(data);
        setFetchError(null);
        applyPayloadToEditor(data);
      })
      .catch((err: unknown) => {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setFetchError(
          err instanceof Error
            ? err.message
            : "Error al cargar los datos del juego desde MLB Stats API."
        );
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
        setIsSyncing(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedGamePk, applyPayloadToEditor]);

  // Datos derivados del juego activo para controlar el polling en refs
  const activeGamePk = selectedGamePk ?? payload?.gamePk ?? null;
  const activeGameOption = useMemo(
    () => payload?.availableGames?.find((g) => g.gamePk === activeGamePk) ?? null,
    [payload, activeGamePk]
  );
  const isTodayGame = Boolean(activeGameOption?.isToday);
  const hasOfficialLineup = Boolean(payload?.hasOfficialLineup);
  const canPollToday = Boolean(isTodayGame && !hasOfficialLineup);

  // Sincronizar refs fuera de render para cumplir reglas estrictas de hooks
  useEffect(() => {
    shouldPollRef.current = canPollToday;
    activeGamePkRef.current = activeGamePk;
  }, [canPollToday, activeGamePk]);

  // Polling seguro cada 30s solo cuando es juego de hoy sin lineup oficial y la pestaña está visible
  useEffect(() => {
    const runPollIfEligible = () => {
      if (document.visibilityState !== "visible") return;
      if (!shouldPollRef.current) return;
      void runBackgroundPoll();
    };

    pollingTimerRef.current = setInterval(runPollIfEligible, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        shouldPollRef.current &&
        Date.now() - lastFetchAtRef.current >= POLL_INTERVAL_MS
      ) {
        void runBackgroundPoll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [runBackgroundPoll]);

  // Limpiar ObjectURL personalizado al desmontar
  useEffect(() => {
    return () => {
      if (customBgObjectUrlRef.current) {
        URL.revokeObjectURL(customBgObjectUrlRef.current);
        customBgObjectUrlRef.current = null;
      }
    };
  }, []);

  const renderData = useMemo<LineupCardRenderData>(
    () => ({
      opponentShort,
      slots,
      pitcherName,
      transmissionLine1,
      transmissionLine2,
      dateShort,
      timeCompact,
      stadiumName,
    }),
    [
      opponentShort,
      slots,
      pitcherName,
      transmissionLine1,
      transmissionLine2,
      dateShort,
      timeCompact,
      stadiumName,
    ]
  );

  // Re-renderizado instantáneo del Canvas ante cualquier edición
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void renderLineupCardOnCanvas(canvas, renderData, customBgSrc).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [renderData, customBgSrc]);

  const markDirty = () => {
    if (!isDirtyRef.current) {
      isDirtyRef.current = true;
      setIsManualEdited(true);
    }
  };

  const handleSlotChange = (index: number, field: "position" | "playerName", value: string) => {
    markDirty();
    setSlots((prev) =>
      prev.map((slot, idx) =>
        idx === index
          ? {
              ...slot,
              [field]: field === "position" ? value.toUpperCase() : value,
            }
          : slot
      )
    );
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setIsLoading(true);
    setFetchError(null);
    setActionFeedback(null);
    setPushResult(null);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const data = await requestLineupCard(activeGamePkRef.current, controller.signal);
      lastFetchAtRef.current = Date.now();
      activeGamePkRef.current = data.gamePk;
      setPayload(data);
      applyPayloadToEditor(data);
      setActionFeedback({
        type: "success",
        message: data.hasOfficialLineup
          ? "Lineup oficial sincronizado desde MLB Stats API."
          : "Datos del encuentro sincronizados (lineup aún no publicado en MLB).",
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setFetchError(
        err instanceof Error
          ? err.message
          : "Error al sincronizar los datos del juego desde MLB Stats API."
      );
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  const handleBackgroundFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setActionFeedback({
        type: "error",
        message: "Selecciona un archivo de imagen válido (JPG, PNG o WebP).",
      });
      e.target.value = "";
      return;
    }

    if (customBgObjectUrlRef.current) {
      URL.revokeObjectURL(customBgObjectUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    customBgObjectUrlRef.current = objectUrl;
    setCustomBgSrc(objectUrl);
    setActionFeedback({
      type: "success",
      message: `Fondo personalizado aplicado: ${file.name}`,
    });
    e.target.value = "";
  };

  const handleResetBackground = () => {
    if (customBgObjectUrlRef.current) {
      URL.revokeObjectURL(customBgObjectUrlRef.current);
      customBgObjectUrlRef.current = null;
    }
    setCustomBgSrc(null);
    setActionFeedback({
      type: "info",
      message: "Se restauró el fondo oficial de la plantilla.",
    });
  };

  const handleDownloadPng = async () => {
    setIsExporting(true);
    setActionFeedback(null);
    try {
      const blob = await generateLineupCardBlob(renderData, customBgSrc);
      if (!blob) {
        throw new Error("No se pudo generar el archivo PNG.");
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildDownloadFilename(opponentShort, dateShort);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setActionFeedback({
        type: "success",
        message: `Imagen descargada: ${a.download}`,
      });
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Error al descargar la imagen PNG.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    setActionFeedback(null);
    if (
      typeof window === "undefined" ||
      typeof ClipboardItem === "undefined" ||
      !navigator.clipboard?.write
    ) {
      setActionFeedback({
        type: "error",
        message: "Tu navegador no admite copiar imágenes directamente. Usa Descargar PNG HD.",
      });
      return;
    }

    setIsExporting(true);
    try {
      const blobPromise = generateLineupCardBlob(renderData, customBgSrc).then((blob) => {
        if (!blob) {
          throw new Error("No se pudo generar la imagen PNG.");
        }
        return blob;
      });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2500);
      setActionFeedback({
        type: "success",
        message: "Imagen PNG copiada al portapapeles. Lista para pegar en redes o WhatsApp.",
      });
    } catch {
      setActionFeedback({
        type: "error",
        message: "No se pudo copiar la imagen al portapapeles. Descarga el PNG HD como alternativa.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareImage = async () => {
    setIsExporting(true);
    setActionFeedback(null);
    try {
      const blob = await generateLineupCardBlob(renderData, customBgSrc);
      if (!blob) {
        throw new Error("No se pudo generar la imagen PNG.");
      }
      const filename = buildDownloadFilename(opponentShort, dateShort);
      const file = new File([blob], filename, { type: "image/png" });

      const supportsFileShare =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }));

      if (supportsFileShare) {
        try {
          await navigator.share({
            title: `Lineup Oficial vs ${opponentShort.trim() || "Rival"}`,
            text: `Lineup Oficial de Leones del Caracas vs ${opponentShort.trim() || "Rival"} (${dateShort} ${timeCompact})`,
            files: [file],
          });
          setActionFeedback({
            type: "success",
            message: "Tarjeta compartida exitosamente.",
          });
          return;
        } catch (shareErr: unknown) {
          if (shareErr instanceof Error && shareErr.name === "AbortError") {
            return;
          }
        }
      }

      setActionFeedback({
        type: "info",
        message:
          "El menú nativo para compartir imágenes no está disponible en este navegador. Usa 'Descargar PNG HD' o 'Copiar Imagen'.",
      });
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Error al preparar la imagen para compartir.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendLineupPush = async () => {
    if (!adminPassword.trim()) {
      setActionFeedback({
        type: "error",
        message: "Sesión sin clave de administración. Vuelve a iniciar sesión para enviar alertas.",
      });
      return;
    }

    setSendingPush(true);
    setPushResult(null);
    setActionFeedback(null);

    const opponentLabel = opponentShort.trim() || "RIVAL";
    const timeLabel = timeCompact.trim();
    const pushTitle = timeLabel
      ? `🦁 Lineup Oficial vs ${opponentLabel} (${timeLabel})`
      : `🦁 Lineup Oficial vs ${opponentLabel}`;

    const lineupSummary = slots
      .map((slot, idx) => {
        const name = slot.playerName.trim() || "POR DEFINIR";
        const pos = slot.position.trim() || "BD";
        return `${idx + 1}. ${name} (${pos})`;
      })
      .join(" • ");

    const pushBody = `${lineupSummary} | P: ${pitcherName.trim() || "POR ANUNCIAR"}`;
    const targetUrl = activeGamePk ? `/game-center?gamePk=${activeGamePk}` : "/game-center";

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminPassword,
        },
        body: JSON.stringify({
          topic: "news_roster",
          title: pushTitle,
          body: pushBody,
          url: targetUrl,
          password: adminPassword,
        }),
      });

      const data = (await res.json()) as PushSendResult & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "No se pudo despachar la notificación de lineup.");
      }

      setPushResult(data);
      setActionFeedback({
        type: "success",
        message: `Alerta de lineup enviada a ${data.sentCount} dispositivo(s).`,
      });
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error de conexión al despachar la notificación.",
      });
    } finally {
      setSendingPush(false);
    }
  };

  const gameSelectId = `${baseId}-game-select`;
  const bgUploadId = `${baseId}-bg-upload`;
  const opponentId = `${baseId}-opponent`;
  const pitcherId = `${baseId}-pitcher`;
  const dateId = `${baseId}-date`;
  const timeId = `${baseId}-time`;
  const stadiumId = `${baseId}-stadium`;
  const trans1Id = `${baseId}-trans1`;
  const trans2Id = `${baseId}-trans2`;

  return (
    <section
      aria-labelledby={`${baseId}-heading`}
      className="rounded-2xl border border-[#1E2B4D] bg-[#0D152B] p-5 sm:p-6 shadow-xl space-y-5 text-slate-100"
    >
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2B4D] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/30 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 id={`${baseId}-heading`} className="text-base font-bold text-white tracking-wide">
              Generador de Tarjeta Oficial de Lineup (9:16)
            </h3>
            <p className="text-xs text-slate-400">
              Orden al bate en vivo desde MLB Stats API, edición inmediata y publicación en 1 clic
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-mono ${
              hasOfficialLineup
                ? "bg-emerald-950/40 border-emerald-700/50 text-emerald-300"
                : isTodayGame
                ? "bg-amber-950/40 border-amber-600/50 text-amber-200"
                : "bg-[#131E3D] border-[#1E2B4D] text-slate-300"
            }`}
          >
            {hasOfficialLineup ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Lineup Oficial MLB</span>
              </>
            ) : isTodayGame ? (
              <>
                <Clock className="w-3.5 h-3.5 text-[#FDB827] shrink-0" />
                <span>Esperando lineup (auto 30s)</span>
              </>
            ) : (
              <span>Edición / Previa</span>
            )}
          </span>
        </div>
      </div>

      {/* Barra de juego + sincronización + fondo personalizado */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-6">
          <label
            htmlFor={gameSelectId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
          >
            Partido de Leones del Caracas
          </label>
          <select
            id={gameSelectId}
            name="gamePk"
            value={activeGamePk ?? ""}
            onChange={(e) => {
              const nextPk = parseInt(e.target.value, 10);
              if (!Number.isNaN(nextPk)) {
                setIsLoading(true);
                setFetchError(null);
                setActionFeedback(null);
                setPushResult(null);
                setSelectedGamePk(nextPk);
              }
            }}
            disabled={isLoading && !payload}
            className="w-full min-h-[42px] rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3.5 py-2 text-sm sm:text-xs text-slate-100 focus-visible:outline-2 focus-visible:outline-[#FDB827] focus-visible:outline-offset-2"
          >
            {payload?.availableGames?.length ? (
              payload.availableGames.map((game) => (
                <option key={game.gamePk} value={game.gamePk} className="bg-[#0D152B] text-slate-100">
                  {game.isToday ? "[HOY] " : ""}
                  {game.dateShort} • {game.isHome ? "vs" : "en"} {game.opponentName} ({game.timeDisplay})
                </option>
              ))
            ) : (
              <option value="" className="bg-[#0D152B] text-slate-300">
                {isLoading ? "Cargando calendario de juegos..." : "Partido manual"}
              </option>
            )}
          </select>
        </div>

        <div className="md:col-span-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isLoading || isSyncing}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#FDB827] focus-visible:outline-offset-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#FDB827] ${isLoading || isSyncing ? "animate-spin" : ""}`} />
            <span>Sincronizar MLB API</span>
          </button>

          <input
            ref={bgFileInputRef}
            id={bgUploadId}
            type="file"
            accept="image/*"
            onChange={handleBackgroundFileChange}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => bgFileInputRef.current?.click()}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-[#FDB827] focus-visible:outline-offset-2"
          >
            <ImagePlus className="w-3.5 h-3.5 text-[#FDB827]" />
            <span>Cambiar fondo</span>
          </button>

          {customBgSrc && (
            <button
              type="button"
              onClick={handleResetBackground}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-[#1E2B4D] text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-[#FDB827] focus-visible:outline-offset-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar fondo</span>
            </button>
          )}
        </div>
      </div>

      {/* Aviso si llegó lineup oficial mientras el editor tenía cambios manuales */}
      {pendingOfficialPayload && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200"
        >
          <span>
            MLB Stats API publicó el lineup oficial de este encuentro. Tus cambios manuales siguen protegidos.
          </span>
          <button
            type="button"
            onClick={() => applyPayloadToEditor(pendingOfficialPayload)}
            className="px-3 py-1.5 rounded-lg bg-[#FDB827] hover:bg-[#FDB827]/90 text-[#070B19] font-bold font-mono shrink-0"
          >
            Aplicar lineup oficial
          </button>
        </div>
      )}

      {fetchError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-700/50 text-xs text-rose-200 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Cuerpo principal: Editor a la izquierda, Canvas + Acciones a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Editor en vivo */}
        <div className="lg:col-span-7 space-y-5">
          {/* Metadatos del Partido */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-[#FDB827] font-mono mb-1 flex items-center gap-2">
              <span>Datos del Encuentro</span>
              {isManualEdited && (
                <span className="text-[11px] font-normal text-slate-400 normal-case">
                  • Edición manual activa
                </span>
              )}
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor={opponentId} className="block text-xs text-slate-400 mb-1">
                  Rival (Cabecera)
                </label>
                <input
                  id={opponentId}
                  type="text"
                  value={opponentShort}
                  onChange={(e) => {
                    markDirty();
                    setOpponentShort(e.target.value.toUpperCase());
                  }}
                  placeholder="MAGALLANES"
                  className="w-full min-h-[40px] rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3 py-2 text-sm sm:text-xs font-bold text-white uppercase placeholder-slate-500 focus-visible:outline-2 focus-visible:outline-[#FDB827]"
                />
              </div>

              <div>
                <label htmlFor={dateId} className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#FDB827]" />
                  <span>Fecha</span>
                </label>
                <input
                  id={dateId}
                  type="text"
                  value={dateShort}
                  onChange={(e) => {
                    markDirty();
                    setDateShort(e.target.value.toUpperCase());
                  }}
                  placeholder="14NOV"
                  className="w-full min-h-[40px] rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3 py-2 text-sm sm:text-xs font-mono text-white uppercase placeholder-slate-500 focus-visible:outline-2 focus-visible:outline-[#FDB827]"
                />
              </div>

              <div>
                <label htmlFor={timeId} className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#FDB827]" />
                  <span>Hora</span>
                </label>
                <input
                  id={timeId}
                  type="text"
                  value={timeCompact}
                  onChange={(e) => {
                    markDirty();
                    setTimeCompact(e.target.value.toUpperCase());
                  }}
                  placeholder="7:00PM"
                  className="w-full min-h-[40px] rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3 py-2 text-sm sm:text-xs font-mono text-white uppercase placeholder-slate-500 focus-visible:outline-2 focus-visible:outline-[#FDB827]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={pitcherId} className="block text-xs text-slate-400 mb-1">
                  Pitcher Abridor
                </label>
                <input
                  id={pitcherId}
                  type="text"
                  value={pitcherName}
                  onChange={(e) => {
                    markDirty();
                    setPitcherName(e.target.value);
                  }}
                  placeholder="POR ANUNCIAR"
                  className="w-full min-h-[40px] rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3 py-2 text-sm sm:text-xs font-semibold text-white uppercase placeholder-slate-500 focus-visible:outline-2 focus-visible:outline-[#FDB827]"
                />
              </div>

              <div>
                <label htmlFor={stadiumId} className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#FDB827]" />
                  <span>Estadio</span>
                </label>
                <input
                  id={stadiumId}
                  type="text"
                  value={stadiumName}
                  onChange={(e) => {
                    markDirty();
                    setStadiumName(e.target.value);
                  }}
                  placeholder="ESTADIO MONUMENTAL SIMON BOLIVAR"
                  className="w-full min-h-[40px] rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3 py-2 text-sm sm:text-xs text-white uppercase placeholder-slate-500 focus-visible:outline-2 focus-visible:outline-[#FDB827]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={trans1Id} className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-[#FDB827]" />
                  <span>Transmisión (Línea 1)</span>
                </label>
                <input
                  id={trans1Id}
                  type="text"
                  value={transmissionLine1}
                  onChange={(e) => {
                    markDirty();
                    setTransmissionLine1(e.target.value);
                  }}
                  placeholder="TRANSMISIÓN IVC,"
                  className="w-full min-h-[40px] rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3 py-2 text-sm sm:text-xs text-white placeholder-slate-500 focus-visible:outline-2 focus-visible:outline-[#FDB827]"
                />
              </div>

              <div>
                <label htmlFor={trans2Id} className="block text-xs text-slate-400 mb-1">
                  Transmisión (Línea 2)
                </label>
                <input
                  id={trans2Id}
                  type="text"
                  value={transmissionLine2}
                  onChange={(e) => {
                    markDirty();
                    setTransmissionLine2(e.target.value);
                  }}
                  placeholder="BeisbolPlay, La Mega"
                  className="w-full min-h-[40px] rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3 py-2 text-sm sm:text-xs text-white placeholder-slate-500 focus-visible:outline-2 focus-visible:outline-[#FDB827]"
                />
              </div>
            </div>
          </fieldset>

          {/* Orden al Bate (1-9) */}
          <fieldset className="space-y-2.5 pt-2 border-t border-[#1E2B4D]/80">
            <legend className="text-xs font-semibold uppercase tracking-wider text-[#FDB827] font-mono mb-1">
              Orden al Bate (1 al 9)
            </legend>

            <div className="space-y-2">
              {slots.map((slot, index) => {
                const posSelectId = `${baseId}-slot-pos-${index}`;
                const playerInputId = `${baseId}-slot-name-${index}`;
                const hasCustomPosition =
                  slot.position &&
                  !POSITION_OPTIONS.includes(slot.position as (typeof POSITION_OPTIONS)[number]);

                return (
                  <div key={slot.order} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="w-6 text-center text-xs font-mono font-bold text-[#FDB827] shrink-0"
                    >
                      {slot.order}.
                    </span>

                    <div className="w-20 shrink-0">
                      <label htmlFor={posSelectId} className="sr-only">
                        Posición del bateador {slot.order}
                      </label>
                      <select
                        id={posSelectId}
                        value={slot.position}
                        onChange={(e) => handleSlotChange(index, "position", e.target.value)}
                        className="w-full min-h-[38px] rounded-lg border border-[#1E2B4D] bg-[#070B19] px-2 py-1.5 text-sm sm:text-xs font-mono font-bold text-slate-100 focus-visible:outline-2 focus-visible:outline-[#FDB827]"
                      >
                        {POSITION_OPTIONS.map((pos) => (
                          <option key={pos} value={pos} className="bg-[#0D152B] text-slate-100">
                            {pos}
                          </option>
                        ))}
                        {hasCustomPosition && (
                          <option value={slot.position} className="bg-[#0D152B] text-slate-100">
                            {slot.position}
                          </option>
                        )}
                      </select>
                    </div>

                    <div className="flex-1 min-w-0">
                      <label htmlFor={playerInputId} className="sr-only">
                        Nombre del bateador {slot.order}
                      </label>
                      <input
                        id={playerInputId}
                        type="text"
                        value={slot.playerName}
                        onChange={(e) => handleSlotChange(index, "playerName", e.target.value)}
                        placeholder={`Bateador #${slot.order}`}
                        className="w-full min-h-[38px] rounded-lg border border-[#1E2B4D] bg-[#070B19] px-3 py-1.5 text-sm sm:text-xs font-medium text-white uppercase placeholder-slate-500 focus-visible:outline-2 focus-visible:outline-[#FDB827]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        </div>

        {/* Columna Derecha: Vista Previa Canvas + 4 Acciones */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-[#1E2B4D] bg-[#070B19] p-3 flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={LINEUP_CARD_WIDTH}
              height={LINEUP_CARD_HEIGHT}
              role="img"
              aria-label={`Vista previa de la tarjeta de lineup vs ${opponentShort || "rival"}`}
              className="aspect-[9/16] w-full max-w-[340px] rounded-xl shadow-2xl border border-[#1E2B4D]/80 bg-[#041421] block"
            />
          </div>

          {/* Botones de Acción */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FDB827] hover:bg-[#FDB827]/90 text-[#070B19] font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Descargar PNG HD (1080×1920)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyImage}
                disabled={isExporting}
                className="min-h-[42px] px-3 py-2 rounded-xl bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-xs font-mono text-slate-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#FDB827]"
              >
                {copiedImage ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">Copiada</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#FDB827] shrink-0" />
                    <span>Copiar Imagen</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareImage}
                disabled={isExporting}
                className="min-h-[42px] px-3 py-2 rounded-xl bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-xs font-mono text-slate-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#FDB827]"
              >
                <Share2 className="w-4 h-4 text-[#FDB827] shrink-0" />
                <span>Compartir</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSendLineupPush}
              disabled={sendingPush}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 font-bold text-xs font-mono flex items-center justify-center gap-2 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              {sendingPush ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Enviando alerta a suscriptores...</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>1-Click: Enviar Push de Lineup</span>
                </>
              )}
            </button>
          </div>

          {/* Región de feedback de acciones */}
          {actionFeedback && (
            <div
              role={actionFeedback.type === "error" ? "alert" : "status"}
              aria-live="polite"
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                actionFeedback.type === "success"
                  ? "bg-emerald-950/40 border-emerald-700/50 text-emerald-200"
                  : actionFeedback.type === "error"
                  ? "bg-rose-950/40 border-rose-700/50 text-rose-200"
                  : "bg-[#131E3D] border-[#1E2B4D] text-slate-200"
              }`}
            >
              {actionFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    actionFeedback.type === "error" ? "text-rose-400" : "text-[#FDB827]"
                  }`}
                />
              )}
              <div className="space-y-0.5">
                <p>{actionFeedback.message}</p>
                {pushResult && pushResult.cleanedCount > 0 && (
                  <p className="text-[11px] text-slate-400">
                    Suscripciones inactivas depuradas: {pushResult.cleanedCount}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
