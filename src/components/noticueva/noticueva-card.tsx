"use client";

import { useState } from "react";
import Image from "next/image";
import { NotiCuevaPost } from "@/types/noticueva";
import { Calendar, User, ChevronDown, ChevronUp, Share2, Check } from "lucide-react";

interface NotiCuevaCardProps {
  post: NotiCuevaPost;
}

export function NotiCuevaCard({ post }: NotiCuevaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Formatear fecha en español
  const formattedDate = new Date(post.createdAt).toLocaleDateString("es-VE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const isLong = post.content.length > 280;
  const displayContent = !expanded && isLong ? `${post.content.slice(0, 280)}...` : post.content;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: `${post.title} - NotiCueva por Gilberto Méndez`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${post.title}\n${window.location.href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <article className="rounded-2xl bg-[#0D152B]/85 border border-[#1E2B4D] hover:border-[#FDB827]/40 transition-all p-5 shadow-lg space-y-4 flex flex-col justify-between">
      {/* Cabecera del Post: Autor, Fecha y Share */}
      <div className="flex items-center justify-between border-b border-[#1E2B4D]/60 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-[#002D62] border border-[#FDB827]/50 flex items-center justify-center text-xs font-bold text-[#FDB827] shadow-sm shrink-0">
            GM
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-100">
                {post.author}
              </span>
              <span className="text-[10px] font-mono text-[#FDB827] bg-[#FDB827]/10 px-1.5 py-0.2 rounded border border-[#FDB827]/30">
                NotiCueva
              </span>
            </div>
            <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-400">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleShare}
          title="Compartir nota"
          className="p-1.5 rounded-lg bg-[#070B19] hover:bg-[#131E3D] border border-[#1E2B4D] text-slate-400 hover:text-[#FDB827] transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Imagen opcional de portada */}
      {post.imageUrl && (
        <div className="relative w-full h-48 sm:h-56 rounded-xl overflow-hidden bg-[#070B19] border border-[#1E2B4D]">
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            className="object-cover hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        </div>
      )}

      {/* Título y Contenido */}
      <div className="space-y-2.5 flex-1">
        <h2 className="text-base sm:text-lg font-bold text-slate-100 leading-snug tracking-tight">
          {post.title}
        </h2>
        <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line font-sans">
          {displayContent}
        </div>
      </div>

      {/* Botón expandir si es largo */}
      {isLong && (
        <div className="pt-2 border-t border-[#1E2B4D]/40 flex justify-end">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center space-x-1 text-xs font-mono font-bold text-[#FDB827] hover:text-[#FDB827]/80 transition-colors"
          >
            <span>{expanded ? "Leer menos" : "Leer nota completa"}</span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}
    </article>
  );
}
