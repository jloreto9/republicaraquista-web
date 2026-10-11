import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { NotiCuevaFeed } from "@/components/noticueva/noticueva-feed";
import { XTimeline } from "@/components/noticueva/x-timeline";
import { getNotiCuevaPosts } from "@/lib/noticueva-service";
import { getActiveSeason } from "@/lib/constants";
import { Newspaper, Lock } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NotiCueva por Gilberto Méndez | REPUBLICARAQUISTAPP",
  description:
    "Espacio editorial de República Caraquista: noticias, notas exclusivas e impresiones del dugout de los Leones del Caracas por Gilberto Méndez, junto al feed en vivo de X (@RepubCaraquista).",
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
        {/* Banner de Identidad Editorial */}
        <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#002D62] via-[#0D152B] to-[#070B19] border border-[#FDB827]/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              <h2 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
                NotiCueva <span className="text-[#FDB827] font-extrabold font-serif">por Gilberto Méndez</span>
              </h2>
              <p className="text-xs text-slate-300">
                La información caraquista directa desde el terreno y la cueva melenuda.
              </p>
            </div>
          </div>

          <Link
            href="/admin"
            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0D152B]/80 hover:bg-[#131E3D] border border-[#1E2B4D] hover:border-[#FDB827]/40 text-slate-300 hover:text-white text-xs font-mono transition-all shrink-0 self-start sm:self-auto"
            title="Acceso para redactar notas (Gilberto Méndez)"
          >
            <Lock className="w-3 h-3 text-[#FDB827]" />
            <span>Acceso Redactor</span>
          </Link>
        </section>

        {/* Layout en 2 Columnas: NotiCueva (7 cols) + Feed de X (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Principal: Artículos de la NotiCueva */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
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

          {/* Columna Lateral: Feed Oficial de X (@RepubCaraquista) */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
            <XTimeline />
          </div>
        </div>
      </main>
    </div>
  );
}
