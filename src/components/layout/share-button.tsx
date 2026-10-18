"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  url?: string;
  title?: string;
  text?: string;
  compact?: boolean;
  className?: string;
}

export function ShareButton({
  url,
  title = "REPUBLICARAQUISTAPP • Analítica & Segunda Pantalla de Leones del Caracas",
  text = "¡Sigue a los Leones del Caracas en vivo con estadísticas sabermétricas y jugada a jugada en REPUBLICARAQUISTAPP! 🦁⚾",
  compact = false,
  className = "",
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Obtener URL actual del navegador si no viene por prop
  const getShareUrl = () => {
    if (url) return url;
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return "https://republicaraquistapp.vercel.app";
  };

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Manejar compartir con Web Share API nativo si existe y si el usuario está en móvil
  const handleNativeShare = async () => {
    const shareUrl = getShareUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: shareUrl,
        });
        setIsOpen(false);
        return true;
      } catch (err) {
        // Si el usuario canceló el share nativo, no hacemos nada
        if ((err as Error).name !== "AbortError") {
          console.error("Error al compartir:", err);
        }
      }
    }
    return false;
  };

  const handleCopyLink = async () => {
    const shareUrl = getShareUrl();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Error al copiar enlace:", err);
    }
  };

  const shareUrl = getShareUrl();
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text}\n\n${shareUrl}`)}`;
  const xTwitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}&via=RepubCaraquista`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <div className={cn("relative inline-block text-left", className)} ref={menuRef}>
      {/* Botón disparador */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Compartir en redes y WhatsApp"
        aria-expanded={isOpen}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FDB827]/40",
          compact
            ? "p-2 bg-[#0D152B] border-[#1E2B4D] text-slate-300 hover:text-[#FDB827] hover:border-[#FDB827]/40"
            : "px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[#0D152B] border-[#1E2B4D] hover:border-[#FDB827]/50 text-slate-200 hover:text-white shadow-sm"
        )}
      >
        <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FDB827] shrink-0" />
        {!compact && (
          <span className="text-xs font-semibold tracking-wide">
            Compartir
          </span>
        )}
      </button>

      {/* Menú desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0D152B] border border-[#1E2B4D] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1.5 border-b border-[#1E2B4D]/60 mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Compartir enlace
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {title}
            </p>
          </div>

          <div className="space-y-1">
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 text-xs font-medium text-slate-200 rounded-lg hover:bg-[#1E2B4D]/60 transition-colors group"
            >
              <div className="w-6 h-6 rounded-md bg-[#25D366]/15 flex items-center justify-center text-[#25D366] shrink-0">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-100 group-hover:text-[#25D366] transition-colors">
                  WhatsApp
                </p>
                <p className="text-[10px] text-slate-400">
                  Grupos y chats
                </p>
              </div>
            </a>

            {/* X / Twitter */}
            <a
              href={xTwitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 text-xs font-medium text-slate-200 rounded-lg hover:bg-[#1E2B4D]/60 transition-colors group"
            >
              <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-white shrink-0">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-100 group-hover:text-[#FDB827] transition-colors">
                  X (Twitter)
                </p>
                <p className="text-[10px] text-slate-400">
                  Publicar post
                </p>
              </div>
            </a>

            {/* Telegram */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 text-xs font-medium text-slate-200 rounded-lg hover:bg-[#1E2B4D]/60 transition-colors group"
            >
              <div className="w-6 h-6 rounded-md bg-[#229ED9]/15 flex items-center justify-center text-[#229ED9] shrink-0">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.535-.194 1.006.128.832.941z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-100 group-hover:text-[#229ED9] transition-colors">
                  Telegram
                </p>
                <p className="text-[10px] text-slate-400">
                  Canales y mensajes
                </p>
              </div>
            </a>

            {/* Facebook */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 text-xs font-medium text-slate-200 rounded-lg hover:bg-[#1E2B4D]/60 transition-colors group"
            >
              <div className="w-6 h-6 rounded-md bg-[#1877F2]/15 flex items-center justify-center text-[#1877F2] shrink-0">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-100 group-hover:text-[#1877F2] transition-colors">
                  Facebook
                </p>
                <p className="text-[10px] text-slate-400">
                  Compartir en feed
                </p>
              </div>
            </a>

            {/* Compartir con app nativa (si está disponible en móvil) */}
            {typeof navigator !== "undefined" && typeof (navigator as any).share === "function" && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 text-xs font-medium text-slate-200 rounded-lg hover:bg-[#1E2B4D]/60 transition-colors text-left group"
              >
                <div className="w-6 h-6 rounded-md bg-[#FDB827]/15 flex items-center justify-center text-[#FDB827] shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-100 group-hover:text-[#FDB827] transition-colors">
                    Más aplicaciones...
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Menú nativo de tu dispositivo
                  </p>
                </div>
              </button>
            )}

            <div className="border-t border-[#1E2B4D]/60 pt-1 mt-1">
              {/* Copiar enlace directo */}
              <button
                type="button"
                onClick={handleCopyLink}
                className={cn(
                  "flex items-center gap-2.5 w-full px-2.5 py-2 text-xs font-medium rounded-lg transition-colors text-left",
                  copied
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "text-slate-200 hover:bg-[#1E2B4D]/60"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                  copied ? "bg-emerald-500/30 text-emerald-300" : "bg-slate-700/40 text-slate-300"
                )}>
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">
                    {copied ? "¡Enlace copiado!" : "Copiar enlace"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {copied ? "Listo para pegar en cualquier chat" : "Copiar al portapapeles"}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
