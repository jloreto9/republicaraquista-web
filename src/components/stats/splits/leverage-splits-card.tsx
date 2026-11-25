"use client";

import React, { useEffect, useState } from "react";
import {
  PlayerLeverageResult,
  PlayerSplitRow,
  PitcherSplitRow,
  LeverageTier,
} from "@/types/player-splits";
import { Gauge, Info, Flame } from "lucide-react";

interface LeverageSplitsCardProps {
  playerId: number;
  type: "batter" | "pitcher";
  season: number;
  lateCloseBatterRows?: PlayerSplitRow[];
  lateClosePitcherRows?: PitcherSplitRow[];
}

function getTierBadgeStyle(tier: LeverageTier): string {
  if (tier === "high") {
    return "bg-rose-500/15 text-rose-300 border-rose-500/35";
  }
  if (tier === "mid") {
    return "bg-[#FDB827]/15 text-[#FDB827] border-[#FDB827]/35";
  }
  return "bg-slate-800/80 text-slate-300 border-slate-700";
}

function getWpaColor(wpa: number): string {
  if (wpa > 0.005) return "text-emerald-400 font-bold";
  if (wpa < -0.005) return "text-rose-400 font-bold";
  return "text-slate-300";
}

export function LeverageSplitsCard({
  playerId,
  type,
  season,
  lateCloseBatterRows = [],
  lateClosePitcherRows = [],
}: LeverageSplitsCardProps) {
  const requestKey = `${playerId}-${type}-${season}`;
  const [fetchState, setFetchState] = useState<{
    key: string;
    data: PlayerLeverageResult | null;
    errorMsg: string | null;
  }>({
    key: "",
    data: null,
    errorMsg: null,
  });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    fetch(`/api/stats/player-leverage?player_id=${playerId}&type=${type}&season=${season}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted) return;
        if (json?.success && json.leverage) {
          setFetchState({ key: requestKey, data: json.leverage, errorMsg: null });
        } else {
          setFetchState({
            key: requestKey,
            data: null,
            errorMsg: "No se pudo calcular el desglose de presión (LI) para este jugador.",
          });
        }
      })
      .catch((err) => {
        if (!isMounted || (err instanceof Error && err.name === "AbortError")) return;
        console.error("Error cargando Leverage Splits:", err);
        setFetchState({
          key: requestKey,
          data: null,
          errorMsg: "Error de conexión al calcular Leverage Index.",
        });
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [playerId, type, season, requestKey]);

  const loading = fetchState.key !== requestKey;
  const data = loading ? null : fetchState.data;
  const errorMsg = loading ? null : fetchState.errorMsg;

  const isPitcher = type === "pitcher";
  const hasLateClose = isPitcher
    ? lateClosePitcherRows.length > 0
    : lateCloseBatterRows.length > 0;

  return (
    <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden shadow-sm">
      {/* Encabezado */}
      <div className="px-4 py-3 bg-[#070B19]/80 border-b border-[#1E2B4D] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <Gauge className="w-4 h-4 text-[#FDB827] shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              Rendimiento por Presión (Leverage Index) &amp; Late &amp; Close
            </h3>
            <p className="text-[11px] text-slate-400">
              Desempeño jugada a jugada según la tensión real del partido (aLI y WPA)
            </p>
          </div>
        </div>

        {data && !loading && (
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="px-2.5 py-1 rounded-lg bg-[#0D152B] border border-[#1E2B4D] text-slate-300">
              aLI Promedio:{" "}
              <span className="text-[#FDB827] font-bold">{data.avgLiStr}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#0D152B] border border-[#1E2B4D] text-slate-300">
              WPA Total:{" "}
              <span className={getWpaColor(data.totalWpa)}>{data.totalWpaStr}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#0D152B] border border-[#1E2B4D] text-slate-400">
              {data.gamesAnalyzed} juegos PBP
            </span>
          </div>
        )}
      </div>

      {/* Cuerpo */}
      {loading ? (
        <div className="p-5 space-y-3 animate-pulse">
          <div className="h-4 w-48 bg-[#131E3D] rounded" />
          <div className="space-y-2">
            <div className="h-9 bg-[#070B19]/70 rounded-lg border border-[#1E2B4D]/60" />
            <div className="h-9 bg-[#070B19]/70 rounded-lg border border-[#1E2B4D]/60" />
            <div className="h-9 bg-[#070B19]/70 rounded-lg border border-[#1E2B4D]/60" />
          </div>
        </div>
      ) : errorMsg || !data ? (
        <div className="p-6 text-center text-xs font-mono text-slate-400">
          {errorMsg ?? "Sin datos de presión disponibles para esta temporada."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            {!isPitcher ? (
              <table className="w-full text-left text-xs min-w-[980px]">
                <thead>
                  <tr className="bg-[#070B19]/50 text-slate-400 font-mono border-b border-[#1E2B4D] text-[10px]">
                    <th className="py-2.5 px-3 font-semibold">NIVEL DE PRESIÓN</th>
                    <th className="py-2.5 px-2 text-center text-[#FDB827]">aLI</th>
                    <th className="py-2.5 px-2 text-center">WPA</th>
                    <th className="py-2.5 px-1.5 text-center">PA</th>
                    <th className="py-2.5 px-1.5 text-center">AB</th>
                    <th className="py-2.5 px-1.5 text-center">C</th>
                    <th className="py-2.5 px-1.5 text-center font-bold text-slate-200">H</th>
                    <th className="py-2.5 px-1.5 text-center">2B</th>
                    <th className="py-2.5 px-1.5 text-center">3B</th>
                    <th className="py-2.5 px-1.5 text-center text-[#FDB827]">HR</th>
                    <th className="py-2.5 px-1.5 text-center">CI</th>
                    <th className="py-2.5 px-1.5 text-center">BB</th>
                    <th className="py-2.5 px-1.5 text-center">SO</th>
                    <th className="py-2.5 px-2 text-center font-semibold text-slate-100">AVG</th>
                    <th className="py-2.5 px-2 text-center text-sky-400 font-semibold">OBP</th>
                    <th className="py-2.5 px-2 text-center text-sky-400 font-semibold">SLG</th>
                    <th className="py-2.5 px-2.5 text-center font-bold text-[#FDB827]">OPS</th>
                    <th className="py-2.5 px-2 text-center">BB%</th>
                    <th className="py-2.5 px-2 text-center">K%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2B4D]/60 font-mono text-[11px]">
                  {(data.batterRows ?? []).map((row) => (
                    <tr key={row.tier} className="hover:bg-[#131E3D]/50 transition-colors">
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getTierBadgeStyle(
                            row.tier
                          )}`}
                        >
                          {row.splitName}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">{row.avgLiStr}</td>
                      <td className={`py-2.5 px-2 text-center ${getWpaColor(row.wpa)}`}>{row.wpaStr}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-300">{row.pa}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-300">{row.ab}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400">{row.r}</td>
                      <td className="py-2.5 px-1.5 text-center font-bold text-slate-100">{row.h}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400">{row.doubles}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400">{row.triples}</td>
                      <td className="py-2.5 px-1.5 text-center font-bold text-[#FDB827]">{row.hr}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-200">{row.rbi}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400">{row.bb}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400">{row.so}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-100">{row.avg}</td>
                      <td className="py-2.5 px-2 text-center text-sky-400 font-semibold">{row.obp}</td>
                      <td className="py-2.5 px-2 text-center text-sky-400 font-semibold">{row.slg}</td>
                      <td className="py-2.5 px-2.5 text-center font-bold text-[#FDB827]">{row.ops}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{row.bbPct}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{row.kPct}</td>
                    </tr>
                  ))}

                  {/* Fila adicional Late & Close oficial de MLB Stats API si existe */}
                  {hasLateClose &&
                    lateCloseBatterRows.map((lc, idx) => (
                      <tr
                        key={`lc-bat-${idx}`}
                        className="bg-[#002D62]/25 hover:bg-[#002D62]/40 transition-colors border-t border-[#FDB827]/25"
                      >
                        <td className="py-2.5 px-3 font-sans">
                          <div className="flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-[#FDB827] shrink-0" />
                            <span className="font-semibold text-slate-100">{lc.splitName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-500">--</td>
                        <td className="py-2.5 px-2 text-center text-slate-500">--</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-300">{lc.pa}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-300">{lc.ab}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-400">{lc.r}</td>
                        <td className="py-2.5 px-1.5 text-center font-bold text-slate-100">{lc.h}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-400">{lc.doubles}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-400">{lc.triples}</td>
                        <td className="py-2.5 px-1.5 text-center font-bold text-[#FDB827]">{lc.hr}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-200">{lc.rbi}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-400">{lc.bb}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-400">{lc.so}</td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-100">{lc.avg}</td>
                        <td className="py-2.5 px-2 text-center text-sky-400 font-semibold">{lc.obp}</td>
                        <td className="py-2.5 px-2 text-center text-sky-400 font-semibold">{lc.slg}</td>
                        <td className="py-2.5 px-2.5 text-center font-bold text-[#FDB827]">{lc.ops}</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">{lc.bbPct}</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">{lc.kPct}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs min-w-[1020px]">
                <thead>
                  <tr className="bg-[#070B19]/50 text-slate-400 font-mono border-b border-[#1E2B4D] text-[10px]">
                    <th className="py-2.5 px-3 font-semibold">NIVEL DE PRESIÓN</th>
                    <th className="py-2.5 px-2 text-center text-[#FDB827]">aLI</th>
                    <th className="py-2.5 px-2 text-center">WPA</th>
                    <th className="py-2.5 px-2 text-center font-bold text-slate-100">IP</th>
                    <th className="py-2.5 px-1.5 text-center">BF</th>
                    <th className="py-2.5 px-1.5 text-center">H</th>
                    <th className="py-2.5 px-1.5 text-center">C</th>
                    <th className="py-2.5 px-1.5 text-center">CL</th>
                    <th className="py-2.5 px-1.5 text-center">BB</th>
                    <th className="py-2.5 px-1.5 text-center font-bold text-[#FDB827]">SO</th>
                    <th className="py-2.5 px-1.5 text-center">HR</th>
                    <th className="py-2.5 px-2 text-center font-bold text-[#FDB827]">ERA</th>
                    <th className="py-2.5 px-2 text-center text-sky-400 font-semibold">WHIP</th>
                    <th className="py-2.5 px-2 text-center">BAA</th>
                    <th className="py-2.5 px-2 text-center">OPS Opp</th>
                    <th className="py-2.5 px-1.5 text-center">K/9</th>
                    <th className="py-2.5 px-1.5 text-center">BB/9</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2B4D]/60 font-mono text-[11px]">
                  {(data.pitcherRows ?? []).map((row) => (
                    <tr key={row.tier} className="hover:bg-[#131E3D]/50 transition-colors">
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getTierBadgeStyle(
                            row.tier
                          )}`}
                        >
                          {row.splitName}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">{row.avgLiStr}</td>
                      <td className={`py-2.5 px-2 text-center ${getWpaColor(row.wpa)}`}>{row.wpaStr}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-100">{row.ipDisplay}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400">{row.bf ?? "-"}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-300">{row.h}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400">{row.r}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400">{row.er}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400">{row.bb}</td>
                      <td className="py-2.5 px-1.5 text-center font-bold text-[#FDB827]">{row.so}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400">{row.hr}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">
                        {row.eraAvailable === false || row.era === "--" ? (
                          <span className="text-slate-500">--</span>
                        ) : (
                          row.era
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center text-sky-400 font-semibold">{row.whip}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{row.baa}</td>
                      <td className="py-2.5 px-2 text-center text-slate-200 font-bold">{row.oppOps || "-"}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400">{row.kPer9}</td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400">{row.bbPer9}</td>
                    </tr>
                  ))}

                  {hasLateClose &&
                    lateClosePitcherRows.map((lc, idx) => (
                      <tr
                        key={`lc-pit-${idx}`}
                        className="bg-[#002D62]/25 hover:bg-[#002D62]/40 transition-colors border-t border-[#FDB827]/25"
                      >
                        <td className="py-2.5 px-3 font-sans">
                          <div className="flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-[#FDB827] shrink-0" />
                            <span className="font-semibold text-slate-100">{lc.splitName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-500">--</td>
                        <td className="py-2.5 px-2 text-center text-slate-500">--</td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-100">{lc.ipDisplay}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-400">{lc.bf ?? "-"}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-300">{lc.h}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-400">{lc.r}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-400">{lc.er}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-400">{lc.bb}</td>
                        <td className="py-2.5 px-1.5 text-center font-bold text-[#FDB827]">{lc.so}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-400">{lc.hr}</td>
                        <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">
                          {lc.eraAvailable === false || lc.era === "--" ? (
                            <span className="text-slate-500">--</span>
                          ) : (
                            lc.era
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center text-sky-400 font-semibold">{lc.whip}</td>
                        <td className="py-2.5 px-2 text-center text-slate-300">{lc.baa}</td>
                        <td className="py-2.5 px-2 text-center text-slate-200 font-bold">{lc.oppOps || "-"}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-400">{lc.kPer9}</td>
                        <td className="py-2.5 px-1.5 text-center text-slate-400">{lc.bbPer9}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Leyenda Explicativa de Leverage Index (LI) */}
          <div className="px-4 py-3 bg-[#070B19]/70 border-t border-[#1E2B4D] space-y-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FDB827]">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Guía de Leverage Index (LI), aLI y WPA</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="px-3 py-2 rounded-lg bg-[#0D152B] border border-[#1E2B4D]">
                <div className="font-mono font-bold text-slate-200 text-[10px]">
                  Baja Presión (LI &lt; 0.85)
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  Juegos abiertos (ventaja ≥4 carreras) o primeros episodios sin amenazas reales (ej. 2do inning arriba 6-0).
                </p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-[#0D152B] border border-[#1E2B4D]">
                <div className="font-mono font-bold text-[#FDB827] text-[10px]">
                  Presión Media (0.85 – 1.50)
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  Marcador cerrado en la zona media del juego (ej. empate o diferencia de 1–2 carreras en el 5to–6to inning).
                </p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-[#0D152B] border border-[#1E2B4D]">
                <div className="font-mono font-bold text-rose-300 text-[10px]">
                  Alta Presión (LI &gt; 1.50)
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  Momentos decisivos: del 7mo inning en adelante con ventaja mínima o empate y tráfico en bases (ej. 9no inning empate en el Monumental con corredor en 2da).
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-200">aLI</strong> mide la presión promedio enfrentada en cada turno (1.00 = promedio de liga).{" "}
              <strong className="text-slate-200">WPA</strong> suma cuánta probabilidad de victoria aportó o restó el jugador con cada resultado.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
