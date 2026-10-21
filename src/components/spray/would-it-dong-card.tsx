"use client";

import React, { useState } from "react";
import Image from "next/image";
import { BattedBall } from "@/types/spray";
import { evaluateWouldItDong } from "@/lib/stadiums-service";
import { CheckCircle2, XCircle, Sparkles, X, Compass, Ruler } from "lucide-react";

interface WouldItDongCardProps {
  ball: BattedBall;
  onClose?: () => void;
}

export function WouldItDongCard({ ball, onClose }: WouldItDongCardProps) {
  const [mode, setMode] = useState<"8-teams" | "9-stadiums">("8-teams");

  const result = evaluateWouldItDong(ball, mode);

  // Veredicto sabermétrico descriptivo
  const hrStadiums = result.checks.filter((c) => c.isHr).map((c) => c.stadium.shortName);
  const outStadiums = result.checks.filter((c) => !c.isHr).map((c) => c.stadium.shortName);

  let explanation = "";
  if (result.hrParksCount === result.totalParks) {
    explanation = `Batazo indiscutible ("No-Doubter"): superó la barda en los ${result.totalParks} estadios de la liga sin importar dimensiones.`;
  } else if (result.hrParksCount === 0) {
    explanation = `No habría sido jonrón en ninguno de los ${result.totalParks} estadios. Se quedó corto en todos los perímetros.`;
  } else if (ball.event === "Home Run" && result.hrParksCount < result.totalParks) {
    explanation = `Fue jonrón en su estadio original, pero en ${outStadiums.length} parques (${outStadiums.join(", ")}) no habría salido por profundidad de barda.`;
  } else if (ball.event !== "Home Run" && result.hrParksCount > 0) {
    explanation = `Batazo de out o extra-base que habría sido JONRÓN en ${result.hrParksCount} estadios más accesibles: ${hrStadiums.join(", ")}.`;
  } else {
    explanation = `Habría sido jonrón en ${result.hrParksCount} de ${result.totalParks} estadios de la LVBP.`;
  }

  return (
    <div className="relative w-full rounded-2xl bg-[#0D152B] border border-[#1E2B4D] p-5 shadow-2xl text-slate-100 space-y-4">
      {/* Botón de Cierre */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title="Cerrar simulador"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Cabecera del Batazo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Simulador de Jonrones
            </span>
            <span className="text-xs font-mono font-bold text-[#FDB827]">
              Would It Dong?
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full border font-bold font-mono ${result.classificationBadgeColor}`}
            >
              {result.classificationLabel}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2">
            <span>{ball.batterName}</span>
            <span className="text-xs font-normal text-slate-400">• {ball.eventEs}</span>
          </h3>
        </div>

        {/* Toggle 8 Franquicias vs 9 Estadios */}
        <div className="flex items-center gap-1.5 bg-[#070B19] p-1 rounded-lg border border-[#1E2B4D] self-start sm:self-auto">
          <button
            onClick={() => setMode("8-teams")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              mode === "8-teams"
                ? "bg-[#FDB827] text-[#070B19]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            8 Franquicias
          </button>
          <button
            onClick={() => setMode("9-stadiums")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              mode === "9-stadiums"
                ? "bg-[#FDB827] text-[#070B19]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            9 Estadios
          </button>
        </div>
      </div>

      {/* KPIs del Batazo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#070B19] p-3 rounded-xl border border-[#1E2B4D] text-xs font-mono">
        <div>
          <span className="text-[10px] text-slate-400 font-sans uppercase flex items-center gap-1">
            <Ruler className="w-3 h-3 text-[#FDB827]" /> Distancia Real
          </span>
          <span className="text-base font-extrabold text-[#FDB827] mt-0.5 block">
            {ball.distanceFt} ft
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-sans uppercase flex items-center gap-1">
            <Compass className="w-3 h-3 text-blue-400" /> Ángulo de Spray
          </span>
          <span className="text-base font-bold text-slate-100 mt-0.5 block">
            {ball.sprayAngle}° ({ball.direction})
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-sans uppercase">Trayectoria</span>
          <span className="text-base font-bold text-slate-100 mt-0.5 block">
            {ball.trajectoryEs}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-sans uppercase">Dureza BIS</span>
          <span className="text-base font-bold text-slate-100 mt-0.5 block">
            {ball.hardnessEs}
          </span>
        </div>
      </div>

      {/* Explicación y Veredicto */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-800/40 text-xs text-blue-200 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-[#FDB827] shrink-0 mt-0.5" />
        <p className="leading-relaxed">{explanation}</p>
      </div>

      {/* Cuadrícula de Estadios */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Desglose por Estadio de la Liga ({result.hrParksCount} de {result.totalParks})
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {result.checks.map(({ stadium, isHr, fenceDistanceFt, marginFt }) => {
            return (
              <div
                key={stadium.id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isHr
                    ? "bg-emerald-950/25 border-emerald-500/40 hover:border-emerald-400"
                    : "bg-[#070B19]/70 border-[#1E2B4D] opacity-75 hover:opacity-100"
                }`}
              >
                {/* Logo y Nombre del Estadio */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#0D152B] border border-[#1E2B4D] flex items-center justify-center shrink-0 overflow-hidden">
                    {stadium.teamLogo ? (
                      <Image
                        src={stadium.teamLogo}
                        alt={stadium.teamAbbr}
                        width={24}
                        height={24}
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-[10px] font-bold font-mono text-[#FDB827]">
                        {stadium.teamAbbr}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 truncate">
                      {stadium.shortName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Barda: <span className="font-mono text-slate-300">{fenceDistanceFt} ft</span>
                    </div>
                  </div>
                </div>

                {/* Veredicto de Jonrón */}
                <div className="text-right shrink-0">
                  {isHr ? (
                    <div className="flex flex-col items-end">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> HR
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300 font-semibold">
                        +{marginFt} ft
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <XCircle className="w-3.5 h-3.5 text-rose-400/80" /> Corto
                      </span>
                      <span className="text-[10px] font-mono text-rose-300/80 font-semibold">
                        {marginFt} ft
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
