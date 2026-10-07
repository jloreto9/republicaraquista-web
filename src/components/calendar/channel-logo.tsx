"use client";

import React from "react";

export interface ChannelInfo {
  id: string;
  name: string;
  shortName: string;
  type: "open_tv" | "cable" | "streaming";
  typeLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const CHANNELS: Record<string, ChannelInfo> = {
  televen: {
    id: "televen",
    name: "Televen",
    shortName: "Televen",
    type: "open_tv",
    typeLabel: "Señal Abierta",
    badgeBg: "bg-red-950/40",
    badgeBorder: "border-red-600/40",
    badgeText: "text-red-400",
  },
  venevision: {
    id: "venevision",
    name: "Venevisión",
    shortName: "Venevisión",
    type: "open_tv",
    typeLabel: "Señal Abierta",
    badgeBg: "bg-blue-950/40",
    badgeBorder: "border-blue-500/40",
    badgeText: "text-blue-300",
  },
  meridiano: {
    id: "meridiano",
    name: "Meridiano TV",
    shortName: "Meridiano",
    type: "open_tv",
    typeLabel: "Señal Abierta",
    badgeBg: "bg-rose-950/40",
    badgeBorder: "border-rose-600/40",
    badgeText: "text-rose-400",
  },
  ivc: {
    id: "ivc",
    name: "IVC",
    shortName: "IVC",
    type: "cable",
    typeLabel: "Cable / TV Paga",
    badgeBg: "bg-sky-950/40",
    badgeBorder: "border-sky-600/40",
    badgeText: "text-sky-300",
  },
  bym: {
    id: "bym",
    name: "ByM Sport",
    shortName: "ByM Sport",
    type: "cable",
    typeLabel: "Cable / Inter",
    badgeBg: "bg-cyan-950/40",
    badgeBorder: "border-cyan-500/40",
    badgeText: "text-cyan-300",
  },
  one_baseball: {
    id: "one_baseball",
    name: "1Baseball",
    shortName: "1Baseball",
    type: "cable",
    typeLabel: "1Baseball Network",
    badgeBg: "bg-amber-950/40",
    badgeBorder: "border-amber-600/40",
    badgeText: "text-amber-300",
  },
  beisbolplay: {
    id: "beisbolplay",
    name: "BeisbolPlay",
    shortName: "BeisbolPlay",
    type: "streaming",
    typeLabel: "Streaming App",
    badgeBg: "bg-orange-950/40",
    badgeBorder: "border-orange-500/40",
    badgeText: "text-orange-300",
  },
  youtube: {
    id: "youtube",
    name: "LVBP YouTube",
    shortName: "YouTube",
    type: "streaming",
    typeLabel: "Streaming Gratis",
    badgeBg: "bg-red-950/30",
    badgeBorder: "border-red-500/30",
    badgeText: "text-red-300",
  },
};

/**
 * Parsea un string de transmisión (ej. "ByM Sport, Venevisión, BeisbolPlay")
 * a un array estructurado de canales reconocidos.
 */
export function parseChannels(transmission?: string): ChannelInfo[] {
  if (!transmission || transmission === "Por confirmar") return [];

  const rawList = transmission.split(",").map((s) => s.trim().toLowerCase());
  const result: ChannelInfo[] = [];
  const addedIds = new Set<string>();

  for (const raw of rawList) {
    let matchedId: string | null = null;
    if (raw.includes("televen")) matchedId = "televen";
    else if (raw.includes("venevisi")) matchedId = "venevision";
    else if (raw.includes("meridiano")) matchedId = "meridiano";
    else if (raw.includes("ivc")) matchedId = "ivc";
    else if (raw.includes("bym")) matchedId = "bym";
    else if (raw.includes("1baseball") || raw.includes("1base")) matchedId = "one_baseball";
    else if (raw.includes("beisbolplay") || raw.includes("beisbol play")) matchedId = "beisbolplay";
    else if (raw.includes("youtube") || raw.includes("lvbp")) matchedId = "youtube";

    if (matchedId && !addedIds.has(matchedId) && CHANNELS[matchedId]) {
      result.push(CHANNELS[matchedId]);
      addedIds.add(matchedId);
    }
  }

  return result;
}

interface ChannelLogoIconProps {
  channelId: string;
  size?: number;
  className?: string;
}

/**
 * Renderiza el logotipo vectorial oficial de cada canal/plataforma
 */
export function ChannelLogoIcon({ channelId, size = 20, className = "" }: ChannelLogoIconProps) {
  const normId = channelId.toLowerCase();

  switch (normId) {
    case "televen":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="Televen"
        >
          {/* Círculo Rojo Televen */}
          <circle cx="12" cy="12" r="11" fill="#E51B24" />
          <circle cx="12" cy="12" r="11" stroke="#FF5E66" strokeWidth="0.8" opacity="0.6" />
          {/* Número 10 estilizado blanco */}
          <path
            d="M7.8 7.5L9.6 6.5V17.5H7.8V7.5Z"
            fill="#FFFFFF"
          />
          <path
            d="M14.5 6.2C12.5 6.2 11.2 8.2 11.2 12C11.2 15.8 12.5 17.8 14.5 17.8C16.5 17.8 17.8 15.8 17.8 12C17.8 8.2 16.5 6.2 14.5 6.2ZM14.5 16.2C13.5 16.2 12.8 14.8 12.8 12C12.8 9.2 13.5 7.8 14.5 7.8C15.5 7.8 16.2 9.2 16.2 12C16.2 14.8 15.5 16.2 14.5 16.2Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "venevision":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="Venevisión"
        >
          {/* Fondo azul real */}
          <rect width="24" height="24" rx="6" fill="#002D72" />
          <rect width="24" height="24" rx="6" stroke="#2663C4" strokeWidth="0.8" opacity="0.6" />
          {/* Corona V Venevisión dorada */}
          <path
            d="M5 7L9 17.5L12 10.5L15 17.5L19 7L16.2 7.8L14.2 14.2L12 8.5L9.8 14.2L7.8 7.8L5 7Z"
            fill="#FFD100"
          />
          <circle cx="12" cy="7" r="1.2" fill="#E51B24" />
          <circle cx="8" cy="6.2" r="1" fill="#FFD100" />
          <circle cx="16" cy="6.2" r="1" fill="#FFD100" />
        </svg>
      );

    case "meridiano":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="Meridiano TV"
        >
          {/* Fondo Rojo Carmesí */}
          <rect width="24" height="24" rx="6" fill="#D91A2A" />
          <rect width="24" height="24" rx="6" stroke="#FF4D5E" strokeWidth="0.8" opacity="0.6" />
          {/* M de Meridiano */}
          <path
            d="M5.5 17.5V6.5H8L12 12.8L16 6.5H18.5V17.5H16.2V10.2L12.8 15.5H11.2L7.8 10.2V17.5H5.5Z"
            fill="#FFFFFF"
          />
          {/* Órbita dorada */}
          <path
            d="M4.5 16.5C8 18.2 16 18.2 19.5 16.5"
            stroke="#FFD100"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case "ivc":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="IVC"
        >
          {/* Fondo Azul Oscuro IVC */}
          <rect width="24" height="24" rx="6" fill="#0A2540" />
          <rect width="24" height="24" rx="6" stroke="#1E4B82" strokeWidth="0.8" opacity="0.6" />
          {/* Texto IVC */}
          <text
            x="12"
            y="15.5"
            fill="#FFFFFF"
            fontSize="9"
            fontWeight="900"
            fontFamily="Arial, Helvetica, sans-serif"
            textAnchor="middle"
            letterSpacing="-0.5"
          >
            IVC
          </text>
          {/* Acento deportivo celeste */}
          <rect x="5.5" y="18" width="13" height="1.8" rx="0.9" fill="#00C9FF" />
        </svg>
      );

    case "bym":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="ByM Sport"
        >
          {/* Fondo Pizarra ByM */}
          <rect width="24" height="24" rx="6" fill="#071527" />
          <rect width="24" height="24" rx="6" stroke="#12345B" strokeWidth="0.8" opacity="0.6" />
          {/* "ByM" en Cyan y Naranja */}
          <text
            x="11"
            y="13"
            fill="#00D2FF"
            fontSize="8"
            fontWeight="900"
            fontStyle="italic"
            fontFamily="Arial, sans-serif"
            textAnchor="middle"
          >
            ByM
          </text>
          <text
            x="12"
            y="19"
            fill="#FF5E1E"
            fontSize="5.5"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
            textAnchor="middle"
            letterSpacing="0.8"
          >
            SPORT
          </text>
        </svg>
      );

    case "one_baseball":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="1Baseball"
        >
          {/* Fondo Navy Escudo */}
          <rect width="24" height="24" rx="6" fill="#0B1A30" />
          <rect width="24" height="24" rx="6" stroke="#25477A" strokeWidth="0.8" opacity="0.6" />
          {/* Placa Home/Círculo rojo */}
          <circle cx="12" cy="11.5" r="7.5" fill="#C41224" />
          {/* Número 1 */}
          <path
            d="M10.2 9L12 7.5V15H10.2V9Z"
            fill="#FFFFFF"
          />
          {/* BASEBALL texto */}
          <rect x="5" y="17.2" width="14" height="3" rx="1.5" fill="#FDB827" />
          <text
            x="12"
            y="19.5"
            fill="#0B1A30"
            fontSize="3.2"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
            textAnchor="middle"
          >
            BASEBALL
          </text>
        </svg>
      );

    case "beisbolplay":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="BeisbolPlay"
        >
          {/* Fondo Azul Oscuro */}
          <rect width="24" height="24" rx="6" fill="#06101E" />
          <rect width="24" height="24" rx="6" stroke="#1D304E" strokeWidth="0.8" opacity="0.6" />
          {/* Letras BP con costura */}
          <circle cx="12" cy="12" r="8" fill="#0E2340" />
          {/* Costura naranja de béisbol */}
          <path
            d="M6.5 9.5C8 11.5 8 12.5 6.5 14.5"
            stroke="#FF6B00"
            strokeWidth="1.2"
            strokeDasharray="1.2 1"
          />
          <path
            d="M17.5 9.5C16 11.5 16 12.5 17.5 14.5"
            stroke="#FF6B00"
            strokeWidth="1.2"
            strokeDasharray="1.2 1"
          />
          {/* Play Triangle naranja */}
          <polygon points="10,8.5 16,12 10,15.5" fill="#FF6B00" />
        </svg>
      );

    case "youtube":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="YouTube"
        >
          {/* Botón Rojo YouTube */}
          <rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000" />
          <polygon points="10,8.5 16,12 10,15.5" fill="#FFFFFF" />
        </svg>
      );

    default:
      return null;
  }
}

interface ChannelIconStackProps {
  transmission?: string;
  maxIcons?: number;
  iconSize?: number;
}

/**
 * Pila compacta de logotipos de canales para la celda del calendario mensual
 */
export function ChannelIconStack({
  transmission,
  maxIcons = 3,
  iconSize = 18,
}: ChannelIconStackProps) {
  const channels = parseChannels(transmission);
  if (channels.length === 0) return null;

  // Priorizar canales de TV lineal (abierta y cable) primero
  const sorted = [...channels].sort((a, b) => {
    if (a.type !== "streaming" && b.type === "streaming") return -1;
    if (a.type === "streaming" && b.type !== "streaming") return 1;
    return 0;
  });

  const displayChannels = sorted.slice(0, maxIcons);
  const remainingCount = sorted.length - displayChannels.length;

  return (
    <div
      className="flex items-center gap-1 shrink-0"
      title={`Transmisión: ${transmission}`}
    >
      <div className="flex items-center -space-x-1 hover:space-x-1 transition-all">
        {displayChannels.map((ch) => (
          <div
            key={ch.id}
            className="rounded-md ring-1 ring-[#0D152B] shadow-sm hover:scale-110 hover:z-20 transition-transform"
          >
            <ChannelLogoIcon channelId={ch.id} size={iconSize} />
          </div>
        ))}
      </div>

      {remainingCount > 0 ? (
        <span className="text-[8px] font-mono font-bold text-slate-400 bg-[#131E3D] px-1 py-0.2 rounded border border-[#1E2B4D]">
          +{remainingCount}
        </span>
      ) : null}
    </div>
  );
}

interface ChannelBadgeCardProps {
  channel: ChannelInfo;
}

/**
 * Tarjeta rica e individual de canal para el modal de detalle del juego
 */
export function ChannelBadgeCard({ channel }: ChannelBadgeCardProps) {
  return (
    <div
      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${channel.badgeBg} ${channel.badgeBorder} hover:scale-[1.02] shadow-sm`}
    >
      <ChannelLogoIcon channelId={channel.id} size={28} />
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-bold text-slate-100 truncate">
          {channel.name}
        </span>
        <span className={`text-[9px] font-mono uppercase tracking-wider font-semibold ${channel.badgeText}`}>
          {channel.typeLabel}
        </span>
      </div>
    </div>
  );
}
