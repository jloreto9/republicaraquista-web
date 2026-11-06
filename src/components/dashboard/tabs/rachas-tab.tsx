"use client";

import { useState } from "react";
import Image from "next/image";
import { RachasTabData, BatterStreakItem, PitcherStreakItem, TeamStreakItem } from "@/types/streaks";
import { Flame, ShieldCheck, Target, TrendingUp, TrendingDown, Swords, Zap, Users } from "lucide-react";
import { getMlbFallbackHeadshotUrl } from "@/lib/constants";

interface RachasTabProps {
  data?: RachasTabData;
}

export function RachasTab({ data }: RachasTabProps) {
  const [filter, setFilter] = useState<"all" | "batters" | "pitchers" | "team">("all");

  if (!data) {
    return (
      <div className="p-6 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] text-center text-slate-400 font-mono text-xs">
        Información de rachas activas no disponible en este momento.
      </div>
    );
  }

  const { teamStreaks, hittingStreaks, onBaseStreaks, pitchingStreaks } = data;
  const totalBatterStreaks = (hittingStreaks?.length || 0) + (onBaseStreaks?.length || 0);
  const totalPitcherStreaks = pitchingStreaks?.length || 0;

  return (
    <div className="space-y-5">
      {/* ── ENCABEZADO Y SELECTOR DE FILTRO ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FDB827]/15 border border-[#FDB827]/30 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 text-[#FDB827]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span>Rachas Activas</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FDB827]/20 text-[#FDB827] font-mono border border-[#FDB827]/30">
                En Vivo • LVBP
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Seguidillas individuales y colectivas de Leones del Caracas
            </p>
          </div>
        </div>

        {/* Botones de Filtro Interno */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 bg-[#070B19] p-1 rounded-xl border border-[#1E2B4D]">
          {[
            { id: "all" as const, label: "Todo" },
            { id: "batters" as const, label: "Bateo", badge: totalBatterStreaks },
            { id: "pitchers" as const, label: "Pitcheo", badge: totalPitcherStreaks },
            { id: "team" as const, label: "Equipo" },
          ].map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#FDB827] text-[#070B19] font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#131E3D]"
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? "bg-[#070B19]/25 text-[#070B19] font-bold" : "bg-[#1E2B4D] text-slate-300"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SECCIÓN 1: RACHAS COLECTIVAS DE LEONES ── */}
      {(filter === "all" || filter === "team") && teamStreaks && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#FDB827]" />
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Rachas Colectivas • Leones del Caracas
              </h4>
            </div>
          </div>

          {/* 3 Tarjetas de Racha Principal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TeamStreakCard item={teamStreaks.general} title="Racha General" />
            <TeamStreakCard item={teamStreaks.home} title="Fortaleza Monumental" />
            <TeamStreakCard item={teamStreaks.away} title="En la Carretera" />
          </div>

          {/* Rachas Activas Frente a Rivales Directos (H2H) */}
          {teamStreaks.rivals && teamStreaks.rivals.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-2.5">
                <div className="flex items-center space-x-2">
                  <Swords className="w-3.5 h-3.5 text-[#FDB827]" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Rachas Activas Cara a Cara vs Rivales
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Series Particulares</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {teamStreaks.rivals.map((rival, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#070B19] border border-[#1E2B4D] flex items-center justify-between hover:border-[#FDB827]/40 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {rival.lastResult?.rivalLogo ? (
                        <div className="w-7 h-7 rounded-lg bg-[#0D152B] border border-[#1E2B4D] flex items-center justify-center p-1 shrink-0 overflow-hidden relative">
                          <Image
                            src={rival.lastResult.rivalLogo}
                            alt={rival.category}
                            width={22}
                            height={22}
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-[#0D152B] border border-[#1E2B4D] flex items-center justify-center font-mono text-[10px] text-slate-400 shrink-0">
                          VS
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate">{rival.category}</div>
                        <div className="text-[10px] font-mono text-slate-400 truncate">{rival.details}</div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          rival.trend === "winning"
                            ? "bg-[#196F3D]/25 text-emerald-400 border border-[#196F3D]/50"
                            : rival.trend === "losing"
                            ? "bg-[#922B21]/25 text-rose-400 border border-[#922B21]/50"
                            : "bg-[#1E2B4D] text-slate-400"
                        }`}
                      >
                        {rival.streak}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── SECCIÓN 2: BATEADORES ENCENDIDOS (HITS Y EMBASADO) ── */}
      {(filter === "all" || filter === "batters") && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[#FDB827]" />
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Bateadores Encendidos • Seguidillas Ofensivas
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Mínimo 2 juegos consecutivos
            </span>
          </div>

          {/* Rachas de Hit */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Juegos Consecutivos Conectando de Hit</span>
            </div>

            {hittingStreaks && hittingStreaks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hittingStreaks.map((b) => (
                  <BatterStreakCard key={b.playerId} streak={b} badgeType="hit" />
                ))}
              </div>
            ) : (
              <EmptyStreakNotice message="No hay bateadores con racha activa de 2 o más juegos con hit en este momento." />
            )}
          </div>

          {/* Rachas de Embasado */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Juegos Consecutivos Embasándose (Hit, BB o HBP)</span>
            </div>

            {onBaseStreaks && onBaseStreaks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {onBaseStreaks.map((b) => (
                  <BatterStreakCard key={b.playerId} streak={b} badgeType="on_base" />
                ))}
              </div>
            ) : (
              <EmptyStreakNotice message="No hay bateadores con racha activa de 3 o más juegos embasándose." />
            )}
          </div>
        </section>
      )}

      {/* ── SECCIÓN 3: BRAZOS INTOCABLES (PITCHEO) ── */}
      {(filter === "all" || filter === "pitchers") && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#FDB827]" />
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Brazos Intocables • Bullpen y Abridores
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Apariciones sin permitir carreras limpias (0.00 ERA)
            </span>
          </div>

          {pitchingStreaks && pitchingStreaks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pitchingStreaks.map((p) => (
                <PitcherStreakCard key={p.playerId} streak={p} />
              ))}
            </div>
          ) : (
            <EmptyStreakNotice message="No hay lanzadores con racha activa de apariciones consecutivas en blanco." />
          )}
        </section>
      )}
    </div>
  );
}

// ── SUBCOMPONENTES MODULARES ────────────────────────────────────────────────

function TeamStreakCard({ item, title }: { item: TeamStreakItem; title: string }) {
  const isWinning = item.trend === "winning";
  const isLosing = item.trend === "losing";

  return (
    <div className="p-4 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl space-y-2 flex flex-col justify-between hover:border-[#FDB827]/30 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
          {title}
        </span>
        <span
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
            isWinning
              ? "bg-[#196F3D]/25 text-emerald-400 border border-[#196F3D]/50"
              : isLosing
              ? "bg-[#922B21]/25 text-rose-400 border border-[#922B21]/50"
              : "bg-[#070B19] text-slate-400 border border-[#1E2B4D]"
          }`}
        >
          {isWinning ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : isLosing ? (
            <TrendingDown className="w-3.5 h-3.5" />
          ) : null}
          <span>{item.streak}</span>
        </span>
      </div>

      <div className="pt-1">
        <div className="text-[11px] text-slate-400 font-mono">{item.details}</div>
        {item.lastResult && (
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Último: {item.lastResult.score} vs {item.lastResult.rival} ({item.lastResult.won ? "G" : "P"})
          </div>
        )}
      </div>
    </div>
  );
}

function BatterStreakCard({
  streak,
  badgeType,
}: {
  streak: BatterStreakItem;
  badgeType: "hit" | "on_base";
}) {
  const [photoError, setPhotoError] = useState(false);
  const photoUrl = photoError ? getMlbFallbackHeadshotUrl(streak.playerId) : streak.playerPhoto;

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-lg flex items-center justify-between gap-3 hover:border-[#FDB827]/40 transition-colors">
      <div className="flex items-center space-x-3 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-[#070B19] border border-[#1E2B4D] overflow-hidden relative shrink-0">
          <Image
            src={photoUrl}
            alt={streak.playerName}
            fill
            className="object-cover"
            onError={() => setPhotoError(true)}
            unoptimized
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
              {streak.playerName}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#070B19] text-slate-400 border border-[#1E2B4D]">
              {streak.position}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-300 mt-0.5 truncate">
            {streak.statsSummary}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400/90 mt-0.5">
            {badgeType === "hit" ? (
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-[#FDB827]" />
                <span>Racha activa de hits</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3 text-emerald-400" />
                <span>Racha activa embasándose</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-lg sm:text-xl font-extrabold font-mono text-[#FDB827]">
          {streak.streakLength}
        </div>
        <div className="text-[9px] uppercase tracking-wider font-mono text-slate-400 font-bold">
          Juegos
        </div>
      </div>
    </div>
  );
}

function PitcherStreakCard({ streak }: { streak: PitcherStreakItem }) {
  const [photoError, setPhotoError] = useState(false);
  const photoUrl = photoError ? getMlbFallbackHeadshotUrl(streak.playerId) : streak.playerPhoto;

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-lg flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-colors">
      <div className="flex items-center space-x-3 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-[#070B19] border border-[#1E2B4D] overflow-hidden relative shrink-0">
          <Image
            src={photoUrl}
            alt={streak.playerName}
            fill
            className="object-cover"
            onError={() => setPhotoError(true)}
            unoptimized
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
              {streak.playerName}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {streak.role}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-300 mt-0.5 truncate">
            {streak.statsSummary}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400/90 mt-0.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>0.00 ERA en el tramo</span>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-lg sm:text-xl font-extrabold font-mono text-emerald-400">
          {streak.streakLength}
        </div>
        <div className="text-[9px] uppercase tracking-wider font-mono text-slate-400 font-bold">
          Apariciones
        </div>
      </div>
    </div>
  );
}

function EmptyStreakNotice({ message }: { message: string }) {
  return (
    <div className="p-4 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-center text-slate-400 font-mono text-xs">
      {message}
    </div>
  );
}
