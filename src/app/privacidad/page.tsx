import Link from "next/link";
import { Header } from "@/components/layout/header";
import { ArrowLeft, Shield, Lock, Eye, Server, Smartphone, Mail, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad • REPUBLICARAQUISTAPP",
  description:
    "Política de Privacidad, tratamiento de datos y términos de servicio de REPUBLICARAQUISTAPP para web y Google Play Store.",
};

export default function PrivacidadPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Política de Privacidad"
        subtitle="Cumplimiento Legal y Tratamiento de Datos • Web & Google Play"
      />

      <main className="flex-1 p-4 sm:p-6 max-w-4xl w-full mx-auto space-y-6">
        {/* Botón de retorno */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-[#FDB827] hover:text-[#FDB827]/80 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Centro de Mando</span>
        </Link>

        {/* Hero Card */}
        <div className="p-6 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FDB827]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FDB827]/10 border border-[#FDB827]/30 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-[#FDB827]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#1E2B4D] text-[#FDB827] text-[10px] font-mono font-semibold uppercase tracking-wider mb-2">
                Compromiso de Privacidad y Transparencia
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
                Política de Privacidad de REPUBLICARAQUISTAPP
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                Última actualización: <strong>10 de octubre de 2026</strong>. Aplica a la aplicación web,
                PWA y la distribución oficial en <strong>Google Play Store</strong> para dispositivos Android.
              </p>
            </div>
          </div>
        </div>

        {/* Secciones Legales */}
        <div className="space-y-4">
          {/* 1. Responsable */}
          <section className="p-5 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm">
              <Lock className="w-4 h-4 text-[#FDB827]" />
              <h2>1. Identificación del Responsable</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>REPUBLICARAQUISTAPP</strong> es una plataforma analítica y sabermétrica desarrollada y mantenida por{" "}
              <strong>Jorge Leonardo Loreto</strong> (Economista y AI Data Scientist) bajo la marca y comunidad deportiva{" "}
              <strong>República Caraquista</strong> (<span className="text-[#FDB827] font-mono">@republicaraquista</span>).
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              El objetivo de la plataforma es estrictamente estadístico, deportivo y de divulgación sabermétrica sobre los
              Leones del Caracas y la Liga Venezolana de Béisbol Profesional (LVBP).
            </p>
          </section>

          {/* 2. Datos Recopilados */}
          <section className="p-5 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm">
              <Eye className="w-4 h-4 text-[#FDB827]" />
              <h2>2. Datos que Recopilamos (y lo que NO Recopilamos)</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-lg bg-[#070B19] border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lo que NO recopilamos</span>
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>No solicitamos cuentas ni contraseñas.</li>
                  <li>No recopilamos nombres, correos ni teléfonos.</li>
                  <li>No almacenamos datos bancarios ni de pago.</li>
                  <li>No rastreamos ubicación GPS en segundo plano.</li>
                  <li>No vendemos ni comercializamos información.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-lg bg-[#070B19] border border-[#FDB827]/20 space-y-2">
                <div className="flex items-center gap-2 text-[#FDB827] font-bold text-xs">
                  <Server className="w-4 h-4" />
                  <span>Información técnica anónima</span>
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>Métricas anónimas de rendimiento de carga (Vercel).</li>
                  <li>Rutas consultadas agregadas (sin identificar al usuario).</li>
                  <li>Diagnósticos técnicos de caídas o errores de renderizado.</li>
                  <li>Caché local del navegador para soporte offline (PWA).</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Permisos en Android */}
          <section className="p-5 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm">
              <Smartphone className="w-4 h-4 text-[#FDB827]" />
              <h2>3. Permisos del Dispositivo en Android (Google Play)</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Nuestra aplicación empaquetada como <em>Trusted Web Activity (TWA)</em> requiere exclusivamente los permisos
              estándar de red necesarios para el funcionamiento de cualquier cliente web moderno:
            </p>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-[#070B19] border border-[#1E2B4D] flex items-center justify-between">
                <span className="text-slate-300">android.permission.INTERNET</span>
                <span className="text-[#FDB827] text-[10px]">Consultar marcadores en vivo y estadísticas</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#070B19] border border-[#1E2B4D] flex items-center justify-between">
                <span className="text-slate-300">android.permission.ACCESS_NETWORK_STATE</span>
                <span className="text-[#FDB827] text-[10px]">Detectar conexión activa para modo offline</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              La aplicación no solicita acceso a tu cámara, micrófono, libreta de contactos, almacenamiento de archivos ni
              sensores biométricos.
            </p>
          </section>

          {/* 4. Proveedores e Infraestructura */}
          <section className="p-5 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm">
              <Server className="w-4 h-4 text-[#FDB827]" />
              <h2>4. Servicios de Terceros e Infraestructura</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              La plataforma se apoya en proveedores de nube líderes en la industria que cumplen con los más altos estándares
              de seguridad (ISO 27001, SOC 2 y GDPR):
            </p>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Vercel Inc. (Estados Unidos)</strong>: Distribución de borde (Edge Hosting), CDN y analítica agregada sin cookies invasivas.
              </li>
              <li>
                <strong>Supabase Inc. (PostgreSQL)</strong>: Almacenamiento seguro y procesamiento relacional de estadísticas históricas de la LVBP.
              </li>
              <li>
                <strong>MLB Stats API</strong>: Origen de telemetría deportiva pública y play-by-play oficial.
              </li>
            </ul>
          </section>

          {/* 5. Menores de Edad */}
          <section className="p-5 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-2">
            <h2 className="text-slate-100 font-bold text-sm">5. Protección de Menores</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              REPUBLICARAQUISTAPP es una aplicación apta para todo público (clasificación PEGI 3 / Everyone). No recopilamos
              deliberadamente datos de menores de 13 años. Dado que no existen formularios de registro ni recolección de PII,
              el uso por parte de menores no implica riesgo para su privacidad.
            </p>
          </section>

          {/* 6. Contacto */}
          <section className="p-5 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm">
              <Mail className="w-4 h-4 text-[#FDB827]" />
              <h2>6. Contacto y Consultas</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Si tienes preguntas, dudas o inquietudes sobre esta política o el tratamiento de datos de la plataforma, puedes
              comunicarte directamente con el autor:
            </p>
            <div className="p-3 rounded-lg bg-[#070B19] border border-[#1E2B4D] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-400">Responsable: </span>
                <span className="text-slate-100 font-semibold">Jorge Leonardo Loreto</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[#FDB827]">
                <a
                  href="https://twitter.com/republicaraquista"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  @republicaraquista
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
