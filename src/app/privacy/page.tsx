import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  Server,
  Smartphone,
  Mail,
  CheckCircle2,
  Video,
  KeyRound,
  ExternalLink,
  FileText,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy • Política de Privacidad • REPUBLICARAQUISTAPP",
  description:
    "Política de Privacidad (Privacy Policy) oficial de REPUBLICARAQUISTAPP para web, PWA y verificación de Google API Services / YouTube Data API v3.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PrivacyPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Política de Privacidad"
        subtitle="Privacy Policy • Web, PWA & Google API Services"
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
            href="/terms"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-[#FDB827] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827] rounded"
          >
            <FileText className="w-3.5 h-3.5 text-[#FDB827]" aria-hidden="true" />
            <span>Condiciones de Uso / Terms of Service</span>
          </Link>
        </div>

        {/* Encabezado Principal */}
        <section className="p-6 sm:p-7 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] relative overflow-hidden shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FDB827]/10 border border-[#FDB827]/30 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-[#FDB827]" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                Política de Privacidad / Privacy Policy — REPUBLICARAQUISTAPP
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
                Última actualización: <strong>14 de noviembre de 2026</strong>. Aplica a la
                plataforma web y Progressive Web App (PWA){" "}
                <span className="font-mono text-[#FDB827]">https://republicaraquistapp.com/</span>,
                su cliente Android (TWA) y las integraciones privadas de Google API Services
                operadas por su titular.
              </p>
            </div>
          </div>
        </section>

        {/* Secciones Legales */}
        <div className="space-y-4">
          {/* 1. Responsable */}
          <section className="p-5 sm:p-6 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm sm:text-base">
              <Lock className="w-4 h-4 text-[#FDB827] shrink-0" aria-hidden="true" />
              <h2>1. Identificación del Responsable / Data Controller</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              <strong>REPUBLICARAQUISTAPP</strong> es una plataforma analítica y multimedia
              desarrollada, publicada y operada por{" "}
              <strong>Jorge Leonardo Loreto</strong> (Economista y AI Data Scientist), bajo la
              marca deportiva <strong>República Caraquista</strong> (
              <span className="text-[#FDB827] font-mono">@RepubCaraquista</span> /{" "}
              <span className="text-[#FDB827] font-mono">@JorgeLoreto</span>).
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              Su propósito es exclusivamente informativo, estadístico y de divulgación deportiva
              sobre los Leones del Caracas y la Liga Venezolana de Béisbol Profesional (LVBP).
            </p>
          </section>

          {/* 2. Datos Generales Web y PWA */}
          <section className="p-5 sm:p-6 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-4">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm sm:text-base">
              <Eye className="w-4 h-4 text-[#FDB827] shrink-0" aria-hidden="true" />
              <h2>2. Tratamiento General de Datos en Web y PWA / General Web &amp; PWA Data Handling</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
              <div className="border-l-2 border-emerald-400/70 pl-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Lo que NO recopilamos de los visitantes</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>No solicitamos registro de cuentas ni contraseñas.</li>
                  <li>No recopilamos nombres, correos electrónicos ni teléfonos de usuarios.</li>
                  <li>No almacenamos datos financieros ni métodos de pago.</li>
                  <li>No rastreamos ubicación GPS en segundo plano.</li>
                  <li>No vendemos, alquilamos ni comercializamos datos personales.</li>
                </ul>
              </div>

              <div className="border-l-2 border-[#FDB827]/70 pl-4 space-y-2">
                <div className="flex items-center gap-2 text-[#FDB827] font-semibold text-xs sm:text-sm">
                  <Server className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Telemetría técnica anónima y PWA</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>Métricas agregadas y anónimas de rendimiento web (Vercel Analytics).</li>
                  <li>Consultas agregadas de rutas y diagnósticos técnicos de errores.</li>
                  <li>Caché local del navegador y Service Worker para soporte offline (PWA).</li>
                  <li>
                    Suscripción voluntaria a notificaciones Web Push únicamente si el usuario la
                    activa explícitamente en su navegador.
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1E2B4D]/80 space-y-2">
              <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs sm:text-sm">
                <Smartphone className="w-4 h-4 text-[#FDB827] shrink-0" aria-hidden="true" />
                <span>Permisos en Android (Trusted Web Activity)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-[70ch]">
                El cliente Android empaquetado como TWA utiliza únicamente los permisos estándar de
                red{" "}
                <code className="font-mono text-[#FDB827]">android.permission.INTERNET</code> y{" "}
                <code className="font-mono text-[#FDB827]">
                  android.permission.ACCESS_NETWORK_STATE
                </code>
                . No solicita acceso a cámara, micrófono, contactos, archivos locales ni sensores
                biométricos.
              </p>
            </div>
          </section>

          {/* 3. Google API Services & YouTube Data API v3 */}
          <section className="p-5 sm:p-6 rounded-xl bg-[#0D152B] border border-[#FDB827]/40 space-y-4">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm sm:text-base">
              <Video className="w-4 h-4 text-[#FDB827] shrink-0" aria-hidden="true" />
              <h2>
                3. Servicios de API de Google y YouTube Data API v3 / Google API Services Disclosure
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              REPUBLICARAQUISTAPP integra la <strong>YouTube Data API v3</strong> de Google
              exclusivamente como herramienta operativa privada del propietario de la aplicación (
              <strong>Jorge Leonardo Loreto</strong> / canal oficial{" "}
              <span className="font-mono text-[#FDB827]">@RepubCaraquista</span>). Los visitantes
              públicos de la web o PWA <strong>no</strong> inician sesión con cuentas de Google ni
              otorgan acceso a sus canales personales.
            </p>

            {/* Scopes */}
            <div className="pt-3 border-t border-[#1E2B4D]/80 space-y-2.5">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-[#FDB827] shrink-0" aria-hidden="true" />
                <span>Alcances (OAuth Scopes) Solicitados y Finalidad</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <li className="border-l-2 border-[#FDB827]/60 pl-3">
                  <code className="font-mono text-[#FDB827] break-all">
                    https://www.googleapis.com/auth/youtube.upload
                  </code>
                  <p className="mt-1 text-slate-300">
                    Utilizado exclusivamente para la publicación automatizada de cápsulas de video y
                    YouTube Shorts históricos sobre los Leones del Caracas y la LVBP en el canal
                    oficial del propietario.
                  </p>
                </li>
                <li className="border-l-2 border-[#FDB827]/60 pl-3">
                  <code className="font-mono text-[#FDB827] break-all">
                    https://www.googleapis.com/auth/youtube
                  </code>
                  <p className="mt-1 text-slate-300">
                    Utilizado únicamente para consultar la lista y metadatos de videos ya publicados
                    en el canal oficial del propietario con el fin de detectar duplicados antes de
                    subir nuevo contenido histórico y mantener consistencia de metadatos.
                  </p>
                </li>
              </ul>
            </div>

            {/* Token Storage & No Sharing */}
            <div className="pt-3 border-t border-[#1E2B4D]/80 space-y-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              <p>
                <strong>Almacenamiento privado de credenciales:</strong> Los tokens OAuth 2.0
                (access y refresh tokens) se resguardan en almacenamiento privado del lado del
                servidor con acceso restringido exclusivamente al propietario y su flujo de
                automatización. Nunca se exponen en el navegador, código cliente ni repositorios
                públicos.
              </p>
              <p>
                <strong>Prohibición de venta o transferencia a terceros:</strong> Ningún dato
                obtenido mediante las APIs de Google o YouTube se vende, alquila, comparte o
                transfiere a terceros, intermediarios de datos ni redes publicitarias, ni se emplea
                para publicidad dirigida o entrenamiento de modelos de inteligencia artificial
                generalistas.
              </p>
              <p>
                <strong>Revocación de acceso:</strong> El titular de la cuenta autorizada puede
                revocar los permisos concedidos en cualquier momento desde la página de permisos de
                seguridad de Google en{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[#FDB827] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827] rounded"
                >
                  <span>https://myaccount.google.com/permissions</span>
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </a>
                , invalidando de inmediato cualquier token asociado.
              </p>
            </div>

            {/* Mandatory Limited Use Disclosure */}
            <div className="pt-4 border-t border-[#1E2B4D]/80 space-y-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-[#FDB827]">
                Cumplimiento de Uso Limitado / Google API Services User Data Policy (Limited Use)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-[70ch]">
                <strong>Declaración en español:</strong> El uso y la transferencia a cualquier otra
                aplicación de la información recibida de las APIs de Google por parte de
                REPUBLICARAQUISTAPP cumplirán estrictamente con la{" "}
                <em>Política de Datos de Usuario de los Servicios de API de Google</em>, incluidos
                los requisitos de <strong>Uso Limitado (Limited Use)</strong>.
              </p>
              <blockquote className="border-l-2 border-[#FDB827] pl-4 py-1 text-xs sm:text-sm text-slate-100 leading-relaxed max-w-[70ch]">
                REPUBLICARAQUISTAPP&apos;s use and transfer to any other app of information
                received from Google APIs will adhere to{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FDB827] underline underline-offset-2 hover:text-[#FDB827]/80"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </blockquote>
            </div>
          </section>

          {/* 4. Infraestructura */}
          <section className="p-5 sm:p-6 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm sm:text-base">
              <Server className="w-4 h-4 text-[#FDB827] shrink-0" aria-hidden="true" />
              <h2>4. Proveedores de Infraestructura y Fuentes de Datos</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              La plataforma opera sobre proveedores de infraestructura que mantienen estándares de
              seguridad y cumplimiento reconocidos en la industria:
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong>Vercel Inc.</strong>: Alojamiento edge, CDN y analítica web agregada sin
                cookies publicitarias.
              </li>
              <li>
                <strong>Supabase Inc. (PostgreSQL)</strong>: Almacenamiento relacional de
                estadísticas deportivas históricas y tablas de la LVBP.
              </li>
              <li>
                <strong>MLB Stats API</strong>: Fuente pública de telemetría deportiva y registros
                play-by-play.
              </li>
              <li>
                <strong>Google LLC (YouTube Data API v3)</strong>: Publicación y verificación de
                duplicados en el canal oficial del propietario.
              </li>
            </ul>
          </section>

          {/* 5. Menores de Edad */}
          <section className="p-5 sm:p-6 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-2">
            <h2 className="text-slate-100 font-bold text-sm sm:text-base">
              5. Protección de Menores / Children&apos;s Privacy
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              REPUBLICARAQUISTAPP es una aplicación informativa apta para todo público. No
              recopilamos deliberadamente información personal identificable de menores de 13 años ni
              disponemos de formularios de registro para visitantes.
            </p>
          </section>

          {/* 6. Contacto */}
          <section className="p-5 sm:p-6 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] space-y-3">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm sm:text-base">
              <Mail className="w-4 h-4 text-[#FDB827] shrink-0" aria-hidden="true" />
              <h2>6. Contacto y Consultas / Contact Information</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
              Para consultas sobre esta Política de Privacidad, el tratamiento de datos o la
              integración con Google API Services, comuníquese directamente con el responsable:
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
