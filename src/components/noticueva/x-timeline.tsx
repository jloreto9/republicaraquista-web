"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { EmbeddedTweet } from "@/types/noticueva";
import { DEFAULT_EMBEDDED_TWEETS } from "@/lib/tweet-constants";
import {
  ExternalLink,
  MessageCircle,
  Share2,
  Check,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export function XTimeline() {
  const [activeTab, setActiveTab] = useState<"embedded" | "timeline">("embedded");
  const [tweets, setTweets] = useState<EmbeddedTweet[]>(DEFAULT_EMBEDDED_TWEETS);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState(false);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Cargar tuits embebidos desde API
  useEffect(() => {
    async function loadTweets() {
      try {
        const res = await fetch("/api/noticueva/tweets");
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setTweets(json.data);
        }
      } catch (err) {
        console.warn("Usando tuits embebidos por defecto:", err);
      }
    }
    loadTweets();
  }, []);

  // Cargar y procesar widgets de Twitter/X cuando se active la pestaña de Timeline
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const initTwitterWidgets = () => {
      // @ts-ignore
      if (window.twttr && window.twttr.widgets) {
        // @ts-ignore
        window.twttr.widgets.load(timelineContainerRef.current);
        setTimelineLoading(false);
      }
    };

    if (activeTab === "timeline") {
      setTimelineLoading(true);
      setTimelineError(false);

      if (!document.getElementById("twitter-wjs")) {
        const script = document.createElement("script");
        script.id = "twitter-wjs";
        script.src = "https://platform.twitter.com/widgets.js";
        script.async = true;
        script.charset = "utf-8";
        script.onload = () => {
          initTwitterWidgets();
        };
        document.body.appendChild(script);
      } else {
        initTwitterWidgets();
      }

      // Timeout de seguridad: Si tras 4 segundos X no cargó debido a Rate Limit 429
      timer = setTimeout(() => {
        setTimelineLoading(false);
        const hasIframe = timelineContainerRef.current?.querySelector("iframe");
        if (!hasIframe) {
          setTimelineError(true);
        }
      }, 4000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeTab]);

  const handleShareTweet = (tweet: EmbeddedTweet) => {
    if (navigator.share) {
      navigator.share({
        title: "Tuit de @RepubCaraquista",
        text: tweet.text,
        url: tweet.url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${tweet.text}\n${tweet.url}`);
      setCopiedId(tweet.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="rounded-2xl bg-[#0D152B]/85 border border-[#1E2B4D] p-4 sm:p-5 shadow-lg space-y-4 flex flex-col h-full">
      {/* Header del Feed de X */}
      <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#070B19] border border-[#1E2B4D] flex items-center justify-center text-slate-100 font-black text-sm">
            𝕏
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>Feed de X</span>
            </h3>
            <p className="text-[11px] font-mono text-[#FDB827]">
              @RepubCaraquista
            </p>
          </div>
        </div>

        <a
          href="https://x.com/RepubCaraquista"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] hover:border-[#FDB827]/40 text-xs text-slate-300 hover:text-white transition-all font-mono"
        >
          <span>Seguir</span>
          <ExternalLink className="w-3 h-3 text-[#FDB827]" />
        </a>
      </div>

      {/* Selector de Pestañas: Tuits Embebidos vs Timeline */}
      <div className="flex items-center p-0.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-xs font-mono">
        <button
          onClick={() => setActiveTab("embedded")}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg transition-all ${
            activeTab === "embedded"
              ? "bg-[#131E3D] text-[#FDB827] font-bold shadow-sm border border-[#FDB827]/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>Tuits Embebidos ({tweets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg transition-all ${
            activeTab === "timeline"
              ? "bg-[#131E3D] text-[#FDB827] font-bold shadow-sm border border-[#FDB827]/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <RefreshCw className="w-3 h-3" />
          <span>Timeline en Vivo</span>
        </button>
      </div>

      {/* Contenido según pestaña */}
      {activeTab === "embedded" ? (
        /* Lista de Tuits Embebidos Garantizados */
        <div className="flex-1 min-h-[480px] max-h-[720px] overflow-y-auto scrollbar-thin space-y-3.5 pr-1">
          {tweets.map((t) => (
            <article
              key={t.id}
              className="p-4 rounded-xl bg-[#070B19]/70 border border-[#1E2B4D] hover:border-[#FDB827]/40 transition-all space-y-3"
            >
              {/* Cabecera del Tuit */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#FDB827]/40 bg-[#0D152B] p-0.5 shrink-0">
                    <Image
                      src="/assets/logo.png"
                      alt={t.authorName}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-100">
                        {t.authorName}
                      </span>
                      <span className="text-[10px] text-[#FDB827]">✓</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {t.handle}
                    </span>
                  </div>
                </div>

                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                  title="Abrir en 𝕏"
                >
                  <span className="text-xs font-black">𝕏</span>
                </a>
              </div>

              {/* Contenido del Tuit */}
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                {t.text}
              </p>

              {/* Footer del Tuit: Fecha y Acciones */}
              <div className="pt-2 border-t border-[#1E2B4D]/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>{t.date}</span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleShareTweet(t)}
                    className="p-1 rounded hover:bg-[#131E3D] hover:text-[#FDB827] transition-colors"
                    title="Compartir tuit"
                  >
                    {copiedId === t.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#131E3D] hover:bg-[#1E2B4D] text-[#FDB827] text-[10px] font-semibold transition-colors"
                  >
                    <span>Ver en 𝕏</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Pestaña de Timeline de Twitter con Widget Oficial y Fallback */
        <div
          ref={timelineContainerRef}
          className="flex-1 min-h-[480px] max-h-[720px] overflow-y-auto scrollbar-thin rounded-xl bg-[#070B19]/50 border border-[#1E2B4D]/60 p-2 space-y-3"
        >
          {timelineLoading && (
            <div className="p-6 text-center text-xs font-mono text-slate-400 space-y-2">
              <RefreshCw className="w-5 h-5 text-[#FDB827] animate-spin mx-auto" />
              <p>Conectando con la API de 𝕏...</p>
            </div>
          )}

          {timelineError && (
            <div className="p-4 rounded-xl bg-[#131E3D]/80 border border-[#FDB827]/30 text-xs text-slate-300 space-y-3 text-center">
              <AlertCircle className="w-6 h-6 text-[#FDB827] mx-auto" />
              <p className="leading-relaxed">
                Debido a restricciones recientes de la plataforma 𝕏 (bloqueo de timelines anónimos o límite de tasa), algunos navegadores no permiten cargar el timeline completo.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1 font-mono">
                <button
                  onClick={() => setActiveTab("embedded")}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-[#070B19] hover:bg-[#1a2852] border border-[#1E2B4D] text-xs text-[#FDB827]"
                >
                  Ver Tuits Embebidos
                </button>
                <a
                  href="https://x.com/RepubCaraquista"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg bg-[#FDB827] text-[#070B19] font-bold text-xs"
                >
                  <span>Abrir en 𝕏</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          <a
            className="twitter-timeline"
            data-theme="dark"
            data-chrome="noheader nofooter noborders transparent"
            data-height="650"
            href="https://twitter.com/RepubCaraquista?ref_src=twsrc%5Etfw"
          >
            Posts by @RepubCaraquista
          </a>
        </div>
      )}
    </div>
  );
}
