"use client";

import React from "react";
import Image from "next/image";

export interface ChannelInfo {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string;
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
    logoUrl: "/assets/channels/televen.svg",
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
    logoUrl: "/assets/channels/venevision.svg",
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
    logoUrl: "/assets/channels/meridiano.png",
    type: "open_tv",
    typeLabel: "Señal Abierta",
    badgeBg: "bg-rose-950/40",
    badgeBorder: "border-rose-600/40",
    badgeText: "text-rose-400",
  },
  ivc: {
    id: "ivc",
    name: "IVC Networks",
    shortName: "IVC",
    logoUrl: "/assets/channels/ivc.png",
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
    logoUrl: "/assets/channels/bym.png",
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
    logoUrl: "/assets/channels/one_baseball.png",
    type: "cable",
    typeLabel: "1Baseball Network",
    badgeBg: "bg-amber-950/40",
    badgeBorder: "border-amber-600/40",
    badgeText: "text-amber-300",
  },
  simpletv: {
    id: "simpletv",
    name: "SimpleTV",
    shortName: "SimpleTV",
    logoUrl: "/assets/channels/simpletv.png",
    type: "cable",
    typeLabel: "SimplePlus / TV Paga",
    badgeBg: "bg-purple-950/40",
    badgeBorder: "border-purple-600/40",
    badgeText: "text-purple-300",
  },
  beisbolplay: {
    id: "beisbolplay",
    name: "BeisbolPlay",
    shortName: "BeisbolPlay",
    logoUrl: "/assets/channels/beisbolplay.png",
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
    logoUrl: "/assets/channels/youtube.svg",
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
    else if (raw.includes("simple") || raw.includes("simpletv")) matchedId = "simpletv";
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
 * Renderiza el logotipo oficial de cada canal/plataforma desde public/assets/channels/
 */
export function ChannelLogoIcon({ channelId, size = 20, className = "" }: ChannelLogoIconProps) {
  const normId = channelId.toLowerCase();
  const channel = CHANNELS[normId];

  if (channel?.logoUrl) {
    return (
      <div
        className={`relative flex items-center justify-center shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={channel.logoUrl}
          alt={channel.name}
          width={size * 2}
          height={size * 2}
          className="w-full h-full object-contain"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 rounded bg-slate-800 text-[10px] font-mono text-slate-300 ${className}`}
      style={{ width: size, height: size }}
    >
      TV
    </div>
  );
}

interface ChannelIconStackProps {
  transmission?: string;
  maxIcons?: number;
  iconSize?: number;
}

/**
 * Pila compacta de logotipos de canales para la celda del calendario mensual
 * con contenedores Dark Navy circulares y alto contraste.
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
      <div className="flex items-center -space-x-1.5 hover:space-x-1 transition-all">
        {displayChannels.map((ch) => (
          <div
            key={ch.id}
            title={`${ch.name} (${ch.typeLabel})`}
            className="w-5 h-5 rounded-full bg-[#070B19] border border-[#1E2B4D] ring-1 ring-[#0D152B] p-0.5 flex items-center justify-center shadow-sm hover:scale-125 hover:z-30 hover:border-[#FDB827]/60 transition-all duration-150 cursor-pointer"
          >
            <ChannelLogoIcon channelId={ch.id} size={iconSize - 2} />
          </div>
        ))}
      </div>

      {remainingCount > 0 ? (
        <span
          title={`+${remainingCount} canal(es) adicional(es)`}
          className="text-[8px] font-mono font-bold text-slate-300 bg-[#131E3D] px-1 py-0.5 rounded-full border border-[#1E2B4D]"
        >
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
      className="flex items-center gap-3 p-2.5 rounded-xl border border-[#1E2B4D] bg-[#070B19]/90 hover:bg-[#131E3D] hover:border-[#FDB827]/40 transition-all shadow-md group"
    >
      <div className="w-10 h-10 rounded-xl bg-[#0B132B] border border-[#1E2B4D] p-1.5 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 group-hover:border-[#FDB827]/50 transition-all">
        <ChannelLogoIcon channelId={channel.id} size={30} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-[#FDB827] transition-colors truncate">
          {channel.name}
        </span>
        <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${channel.badgeText}`}>
          {channel.typeLabel}
        </span>
      </div>
    </div>
  );
}
