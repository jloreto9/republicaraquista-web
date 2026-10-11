"use client";

import { useEffect, useState } from "react";
import { MessageSquare, ExternalLink } from "lucide-react";

export function XTimeline() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Cargar script oficial de widgets de Twitter/X
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    script.onload = () => {
      setLoaded(true);
      // @ts-ignore
      if (window.twttr && window.twttr.widgets) {
        // @ts-ignore
        window.twttr.widgets.load();
      }
    };
    document.body.appendChild(script);

    return () => {
      // Limpieza segura
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="rounded-2xl bg-[#0D152B]/80 border border-[#1E2B4D] p-4 sm:p-5 shadow-lg space-y-4 flex flex-col h-full">
      {/* Header del Feed de X */}
      <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#070B19] border border-[#1E2B4D] flex items-center justify-center text-slate-100 font-black text-sm">
            𝕏
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>Feed Oficial de X</span>
            </h3>
            <p className="text-[11px] font-mono text-[#FDB827]">
              @republicaraquista
            </p>
          </div>
        </div>

        <a
          href="https://x.com/republicaraquista"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] hover:border-[#FDB827]/40 text-xs text-slate-300 hover:text-white transition-all font-mono"
        >
          <span>Seguir</span>
          <ExternalLink className="w-3 h-3 text-[#FDB827]" />
        </a>
      </div>

      {/* Contenedor del Timeline */}
      <div className="flex-1 min-h-[500px] max-h-[750px] overflow-y-auto scrollbar-thin rounded-xl bg-[#070B19]/50 border border-[#1E2B4D]/60 p-2">
        <a
          className="twitter-timeline"
          data-theme="dark"
          data-chrome="noheader nofooter noborders transparent"
          data-height="700"
          href="https://x.com/republicaraquista?ref_src=twsrc%5Etfw"
        >
          Cargando tuits de @republicaraquista...
        </a>

        {/* Fallback si el script de X está bloqueado por extensiones */}
        <noscript>
          <div className="p-6 text-center space-y-3 text-slate-400 text-xs">
            <MessageSquare className="w-8 h-8 text-[#FDB827] mx-auto opacity-70" />
            <p>Visita nuestra cuenta oficial en X para ver las últimas publicaciones:</p>
            <a
              href="https://x.com/republicaraquista"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#FDB827] text-[#070B19] font-bold font-mono text-xs hover:bg-[#FDB827]/90 transition-all"
            >
              <span>Abrir @republicaraquista en 𝕏</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </noscript>
      </div>
    </div>
  );
}
