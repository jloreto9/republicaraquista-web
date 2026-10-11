import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { NotiCuevaFeed } from "@/components/noticueva/noticueva-feed";
import { getNotiCuevaPosts } from "@/lib/noticueva-service";
import { getActiveSeason } from "@/lib/constants";
import { Newspaper, Lock, ExternalLink, Sparkles, UserCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "NotiCueva por Gilberto Méndez | REPUBLICARAQUISTAPP",
  description:
    "Espacio editorial de República Caraquista: noticias, notas exclusivas e impresiones del dugout de los Leones del Caracas por Gilberto Méndez.",
};

export const revalidate = 60; // ISR: Actualización cada 60 segundos en Edge

export default async function NotiCuevaPage() {
  const activeSeason = await getActiveSeason();
  const posts = await getNotiCuevaPosts();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="NotiCueva por Gilberto Méndez"
        subtitle="Crónicas, Notas del Dugout & Pulso de los Leones del Caracas"
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Banner de Identidad Editorial Principal */}
        <section className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-[#002D62] via-[#0D152B] to-[#070B19] border border-[#FDB827]/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#070B19] border border-[#FDB827]/60 flex items-center justify-center text-[#FDB827] shadow-md shrink-0">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FDB827] font-bold">
                  Columna Editorial Oficial
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-base sm:text-xl font-black text-slate-100 tracking-tight">
                NotiCueva <span className="text-[#FDB827] font-extrabold font-serif">por Gilberto Méndez</span>
              </h2>
              <p className="text-xs text-slate-300">
                La información caraquista directa desde el terreno y la cueva melenuda.
              </p>
            </div>
          </div>

          <Link
            href="/admin"
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#0D152B]/90 hover:bg-[#131E3D] border border-[#1E2B4D] hover:border-[#FDB827]/50 text-slate-300 hover:text-white text-xs font-mono transition-all shrink-0 self-start sm:self-auto shadow-sm"
            title="Acceso para redactar notas (Gilberto Méndez)"
          >
            <Lock className="w-3.5 h-3.5 text-[#FDB827]" />
            <span>Acceso Redactor</span>
          </Link>
        </section>

        {/* Layout en 2 Columnas: Notas Editoriales (8 cols) + Lateral Informativo (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Principal: Artículos de la NotiCueva */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-2">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                <span>Notas Publicadas</span>
                {posts.length > 0 && (
                  <span className="text-xs font-mono text-slate-400 font-normal">
                    ({posts.length})
                  </span>
                )}
              </h3>
              <span className="text-[11px] font-mono text-[#FDB827]">
                Actualización continua
              </span>
            </div>

            <NotiCuevaFeed initialPosts={posts} />
          </div>

          {/* Columna Lateral: Tarjeta Editorial de Gilberto Méndez y Enlace Oficial a X */}
          <aside className="lg:col-span-4 space-y-5 sticky top-20">
            {/* Tarjeta del Cronista: Gilberto Méndez */}
            <div className="p-5 rounded-2xl bg-[#0D152B]/90 border border-[#1E2B4D] shadow-lg space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-[#1E2B4D]/60">
                <div className="w-12 h-12 rounded-xl bg-[#002D62] border border-[#FDB827]/60 flex items-center justify-center text-sm font-bold text-[#FDB827] shadow-md shrink-0">
                  GM
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-100">
                      Gilberto Méndez
                    </h4>
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://x.com/GilbertoMendez"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#FDB827] hover:underline font-mono inline-flex items-center gap-0.5"
                    >
                      @GilbertoMendez
                    </a>
                    <span className="text-slate-600 text-[10px]">•</span>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Cronista Oficial
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Voz editorial y cobertura exclusiva de la cueva caraquista. Impresiones del dugout, movimientos de róster, declaraciones de los protagonistas y análisis directo desde el terreno.
              </p>

            </div>

            {/* Tarjeta de la Cuenta Oficial en 𝕏 (@RepubCaraquista) */}
            <div className="p-5 rounded-2xl bg-[#0D152B]/90 border border-[#1E2B4D] shadow-lg space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2B4D]/60">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[#070B19] border border-[#1E2B4D] flex items-center justify-center text-slate-100 font-black text-sm">
                    𝕏
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 leading-tight">
                      RepubliCaraquista ®©
                    </h4>
                    <span className="text-[10px] text-[#FDB827] font-mono">
                      @RepubCaraquista
                    </span>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Sigue la cuenta oficial en 𝕏 para cobertura en vivo jugada a jugada, alineaciones confirmadas, videos del juego e interacción con la fanaticada melenuda.
              </p>

              <a
                href="https://x.com/RepubCaraquista"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#070B19] hover:bg-[#131E3D] border border-[#1E2B4D] hover:border-[#FDB827]/60 text-slate-100 hover:text-[#FDB827] text-xs font-mono font-bold flex items-center justify-center space-x-2 transition-all shadow-md group"
              >
                <span>Abrir @RepubCaraquista en 𝕏</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#FDB827] group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
