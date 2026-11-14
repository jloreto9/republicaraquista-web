import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import {
  ArrowLeft,
  Scale,
  ShieldCheck,
  Database,
  Video,
  Copyright,
  AlertTriangle,
  Mail,
  FileText,
  ExternalLink,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Condiciones de Uso • Terms of Service • REPUBLICARAQUISTAPP",
  description:
    "Condiciones de Uso y Términos de Servicio (Terms of Service) de REPUBLICARAQUISTAPP para web, PWA y servicios integrados.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TermsPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Condiciones de Uso"
        subtitle="Terms of Service • REPUBLICARAQUISTAPP"
      />

      <main className="flex-1 p-4 sm:p-6 max-w-4xl w-full mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#FDB827] hover:text-[#FDB827]/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827] rounded"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Volver al Centro de Mando</span>
          </Link>

          <Link
            href="/privacy"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-[#FDB827] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827] rounded"
          >
            <FileText className="w-3.5 h-3.5 text-[#FDB827]" aria-hidden="true" />
            <span>Política de Privacidad / Privacy Policy</span>
          </Link>
        </div>

        {/* Encabezado Principal */}
        <section className="p-6 sm:p-7 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] relative overflow-hidden shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FDB827]/10 border border-[#FDB827]/30 flex items-center justify-center shrink-0">
              <Scale className="w-6 h-6 text-[#FDB827]" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                Condiciones de Uso / Terms of Service — REPUBLICARAQUISTAPP
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
                Fecha de vigencia: <strong>14 de noviembre de 2026</strong>. Al acceder o utilizar{" "}
                <span className="font-mono text-[#FDB827]">https://republicaraquistapp.com/</span>{" "}
                (en su versión web, PWA o cliente Android), aceptas cumplir con los presentes
                términos de servicio operados por <strong>Jorge Leonardo Loreto</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Secciones Legales */}
        <div className="space-y-4">
          {/* 1. Uso Aceptable */}
          <section className="p-5 sm:p-6 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm sm:text-base">
              <ShieldCheck className="w-4 h-4 text-[#FDB827] shrink-0" aria-hidden="true" />
              <h2>1. Aceptación y Uso Aceptable / Acceptable Use</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              <strong>REPUBLICARAQUISTAPP</strong> es una plataforma de consulta estadística y
              analítica deportiva sobre los Leones del Caracas y la Liga Venezolana de Béisbol
              Profesional (LVBP), puesta a disposición para uso personal, informativo y no
              comercial.
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed max-w-[70ch]">
              <li>
                Está prohibido realizar scraping automatizado masivo, ataques de denegación de
                servicio o eludir controles de seguridad y límites de tasa de la plataforma.
              </li>
              <li>
                Está prohibido redistribuir, revender o presentar los conjuntos de datos procesados,
                modelos propietarios o gráficos generados como producto comercial propio sin
                autorización expresa del titular.
              </li>
              <li>
                Está prohibido intentar acceder a rutas internas, credenciales o procesos de
                automatización restringidos al propietario.
              </li>
            </ul>
          </section>

          {/* 2. Analítica Deportiva y MLB Stats API */}
          <section className="p-5 sm:p-6 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm sm:text-base">
              <Database className="w-4 h-4 text-[#FDB827] shrink-0" aria-hidden="true" />
              <h2>
                2. Analítica Deportiva y Atribución a MLB Stats API / Sports Analytics &amp; Attribution
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              Los indicadores estadísticos avanzados, calificaciones ELO, métricas de expectativa de
              victoria (WPA / RE24), proyecciones y probabilidades mostradas en la plataforma tienen
              carácter estrictamente informativo, estadístico y educativo. No constituyen asesoría
              financiera, recomendación de inversión ni incitación a apuestas deportivas.
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              La telemetría pública de marcadores y registros play-by-play proviene de{" "}
              <strong>MLB Stats API</strong>. REPUBLICARAQUISTAPP es un proyecto independiente y no
              mantiene afiliación institucional oficial con la Liga Venezolana de Béisbol
              Profesional (LVBP), Leones del Caracas BBC ni Major League Baseball (MLB).
            </p>
          </section>

          {/* 3. Uso de Google / YouTube API */}
          <section className="p-5 sm:p-6 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm sm:text-base">
              <Video className="w-4 h-4 text-[#FDB827] shrink-0" aria-hidden="true" />
              <h2>3. Uso y Cumplimiento de Google / YouTube Data API v3</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              REPUBLICARAQUISTAPP integra la <strong>YouTube Data API v3</strong> exclusivamente bajo
              la autorización del propietario de la plataforma para automatizar la publicación y
              verificación de duplicados de YouTube Shorts históricos en su canal oficial (
              <span className="font-mono text-[#FDB827]">@RepubCaraquista</span>).
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              Dicha integración se sujeta al cumplimiento de los{" "}
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#FDB827] underline underline-offset-2 hover:text-[#FDB827]/80"
              >
                <span>Términos de Servicio de YouTube</span>
                <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
              </a>{" "}
              y de la{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#FDB827] underline underline-offset-2 hover:text-[#FDB827]/80"
              >
                <span>Google API Services User Data Policy (Limited Use)</span>
                <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
              </a>
              , conforme a lo detallado en nuestra{" "}
              <Link
                href="/privacy"
                className="text-[#FDB827] underline underline-offset-2 hover:text-[#FDB827]/80"
              >
                Política de Privacidad
              </Link>
              .
            </p>
          </section>

          {/* 4. Propiedad Intelectual */}
          <section className="p-5 sm:p-6 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm sm:text-base">
              <Copyright className="w-4 h-4 text-[#FDB827] shrink-0" aria-hidden="true" />
              <h2>4. Propiedad Intelectual / Intellectual Property</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              El código fuente, arquitectura de software, modelos analíticos propios, diseño de
              interfaz, visualizaciones exportables y contenidos editoriales originales de
              REPUBLICARAQUISTAPP pertenecen a <strong>Jorge Leonardo Loreto</strong>. Las marcas,
              logotipos de equipos y denominaciones oficiales pertenecen a sus respectivos
              titulares y se emplean únicamente con fines informativos de identificación deportiva.
            </p>
          </section>

          {/* 5. Exención de Garantías */}
          <section className="p-5 sm:p-6 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm sm:text-base">
              <AlertTriangle className="w-4 h-4 text-[#FDB827] shrink-0" aria-hidden="true" />
              <h2>
                5. Exención de Garantías y Limitación de Responsabilidad / Disclaimer &amp; Liability
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              La plataforma se ofrece <em>&quot;tal cual&quot;</em> (<em>as is</em>) y según
              disponibilidad. Aunque se realizan esfuerzos continuos por mantener la precisión de
              los datos y la continuidad del servicio, no se garantiza la ausencia de interrupciones,
              demoras en fuentes externas (como MLB Stats API o proveedores en la nube) o errores
              estadísticos puntuales, ni se asume responsabilidad por decisiones tomadas a partir de
              la información mostrada.
            </p>
          </section>

          {/* 6. Responsabilidad, Cambios y Contacto */}
          <section className="p-5 sm:p-6 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm sm:text-base">
              <Mail className="w-4 h-4 text-[#FDB827] shrink-0" aria-hidden="true" />
              <h2>6. Responsabilidad Aplicable, Cambios y Contacto / Governing Responsibility</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              REPUBLICARAQUISTAPP opera bajo la responsabilidad directa de su autor y mantenedor{" "}
              <strong>Jorge Leonardo Loreto</strong>, quien podrá actualizar estas Condiciones de
              Uso en cualquier momento publicando la nueva versión y su fecha de vigencia en esta
              página.
            </p>
            <div className="pt-2 border-t border-[#1E2B4D]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-slate-300">
                <span className="text-slate-400">Responsable / Owner: </span>
                <span className="text-slate-100 font-semibold">Jorge Leonardo Loreto</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[#FDB827]">
                <a
                  href="https://x.com/RepubCaraquista"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827] rounded"
                >
                  @RepubCaraquista
                </a>
                <span className="text-slate-500" aria-hidden="true">
                  •
                </span>
                <a
                  href="https://x.com/JorgeLoreto"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827] rounded"
                >
                  @JorgeLoreto
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
