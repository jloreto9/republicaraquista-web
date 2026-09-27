"use client";

import { useState } from "react";
import { CALENDAR_FEED_URLS } from "@/lib/constants";
import { Copy, Check, Download, ExternalLink, HelpCircle, X } from "lucide-react";

export function CalendarSubscribeBar() {
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleCopyWebcal = () => {
    navigator.clipboard.writeText(CALENDAR_FEED_URLS.webcalIcs);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
      {/* Glow de fondo caraquista */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#FDB827]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#002D62]/40 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        {/* Titular e información */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FDB827] animate-ping" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#FDB827] font-semibold">
              Sincronización en Vivo
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            Sincroniza el Calendario en tu Móvil
          </h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Agrega los 56 juegos de Leones del Caracas a tu calendario personal. Las horas y canales de transmisión se actualizarán solos en tu dispositivo.
          </p>
        </div>

        {/* Botones de suscripción para Android e iOS */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Botón Android / Google Calendar */}
          <a
            href={CALENDAR_FEED_URLS.googleCalendar}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] hover:border-[#FDB827]/50 text-slate-100 transition-all shadow-md group"
            title="Añadir a Google Calendar (Android / Web)"
          >
            {/* Logo de Google Calendar en SVG */}
            <svg
              className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="3" y="4" width="18" height="17" rx="3" fill="#FFFFFF" />
              <path d="M3 8.5H21V4C21 3.44772 20.5523 3 20 3H4C3.44772 3 3 3.44772 3 4V8.5Z" fill="#1A73E8" />
              <rect x="7" y="1" width="2" height="4" rx="1" fill="#1A73E8" />
              <rect x="15" y="1" width="2" height="4" rx="1" fill="#1A73E8" />
              <circle cx="8" cy="12" r="1.25" fill="#EA4335" />
              <circle cx="12" cy="12" r="1.25" fill="#FBBC04" />
              <circle cx="16" cy="12" r="1.25" fill="#34A853" />
              <circle cx="8" cy="16" r="1.25" fill="#1A73E8" />
              <circle cx="12" cy="16" r="1.25" fill="#EA4335" />
              <circle cx="16" cy="16" r="1.25" fill="#FBBC04" />
            </svg>
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-mono leading-none">Android / Web</div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                Google Calendar
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#FDB827] transition-colors" />
              </div>
            </div>
          </a>

          {/* Botón Apple Calendar / iOS */}
          <a
            href={CALENDAR_FEED_URLS.webcalIcs}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] hover:border-[#FDB827]/50 text-slate-100 transition-all shadow-md group"
            title="Suscribir en Apple Calendar (iPhone / iPad / Mac)"
          >
            {/* Logo de Apple en SVG */}
            <svg
              className="w-5 h-5 shrink-0 fill-current text-slate-100 group-hover:text-[#FDB827] group-hover:scale-110 transition-transform"
              viewBox="0 0 170 170"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.85-12-14.42-6.09-9.33-11.1-20.2-15.04-32.61-3.94-12.41-5.91-23.95-5.91-34.61 0-14.75 3.94-27.18 11.83-37.3 7.89-10.12 17.76-15.35 29.61-15.69 4.35 0 9.4 1.16 15.15 3.48 5.75 2.32 9.53 3.53 11.34 3.63 1.45 0 5.48-1.28 12.08-3.84 6.6-2.56 12.08-3.72 16.44-3.48 12.74.87 23.09 5.66 31.06 14.37-11.1 6.74-16.54 15.99-16.32 27.76.22 9.35 3.82 17.29 10.8 23.82 6.98 6.53 15.3 10.12 24.96 10.77-2.18 6.53-4.9 12.84-8.16 18.93zM119.22 31.84c0-7.18 2.61-13.93 7.83-20.25 5.22-6.32 11.64-10.45 19.26-12.39.22 1.3.33 2.5.33 3.59 0 7.18-2.73 14.15-8.18 20.91-5.45 6.76-12.06 10.78-19.82 12.06-.22-1.3-.42-2.61-.42-3.92z" />
            </svg>
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-mono leading-none">iPhone / Mac</div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                Apple Calendar
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#FDB827] transition-colors" />
              </div>
            </div>
          </a>

          {/* Botón Copiar Enlace Webcal */}
          <button
            onClick={handleCopyWebcal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#070B19] hover:bg-[#131E3D] border border-[#1E2B4D] text-slate-300 hover:text-slate-100 transition-colors text-xs font-medium"
            title="Copiar URL para suscripción manual"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copiar Webcal</span>
              </>
            )}
          </button>

          {/* Botón Descargar .ICS Raw */}
          <a
            href={CALENDAR_FEED_URLS.rawIcs}
            download="calendario_republica_caraquista.ics"
            className="p-2 rounded-xl bg-[#070B19] hover:bg-[#131E3D] border border-[#1E2B4D] text-slate-400 hover:text-[#FDB827] transition-colors"
            title="Descargar archivo .ics directo"
          >
            <Download className="w-4 h-4" />
          </a>

          {/* Botón Ayuda / Instrucciones */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 rounded-xl bg-[#070B19] hover:bg-[#131E3D] border border-[#1E2B4D] text-slate-400 hover:text-[#FDB827] transition-colors"
            title="Ver instrucciones de sincronización"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal / Popup de Instrucciones */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FDB827]" />
                <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
                  Cómo Sincronizar el Calendario
                </h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#131E3D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-[#070B19] border border-[#1E2B4D]/60 space-y-1.5">
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <span className="text-[#1A73E8] font-bold">Android / Google Calendar:</span>
                </div>
                <p className="text-slate-400">
                  Toca el botón <strong>Google Calendar</strong>. Se abrirá la web de Google Calendar en tu navegador o móvil y te preguntará si deseas añadir el calendario de Leones. Presiona <em>&quot;Añadir&quot;</em>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#070B19] border border-[#1E2B4D]/60 space-y-1.5">
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <span className="text-slate-100 font-bold">iPhone / iPad (iOS):</span>
                </div>
                <p className="text-slate-400">
                  Toca el botón <strong>Apple Calendar</strong>. iOS te mostrará un mensaje emergente: <em>&quot;¿Deseas suscribirte al calendario?&quot;</em>. Confirma y quedará sincronizado en tu app Calendario.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#070B19] border border-[#1E2B4D]/60 space-y-1.5">
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <span className="text-slate-100 font-bold">Mac (macOS):</span>
                </div>
                <p className="text-slate-400">
                  Abre la app Calendario en Mac, ve a <strong>Archivo → Nueva suscripción de calendario…</strong>, pega el enlace copiado con el botón <em>&quot;Copiar Webcal&quot;</em> y haz clic en Suscribirse.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 rounded-xl bg-[#FDB827] text-[#070B19] font-bold text-xs hover:bg-[#FDB827]/90 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
