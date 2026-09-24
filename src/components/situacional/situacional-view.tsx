"use client";

import React, { useState } from "react";
import { SituationalData } from "@/types/situational";
import {
  PieChart,
  Target,
  Users,
  Flame,
  Search,
  Info,
  Shield,
} from "lucide-react";

interface SituacionalViewProps {
  initialData: SituationalData;
}

export function SituacionalView({ initialData }: SituacionalViewProps) {
  const [activeTab, setActiveTab] = useState<"splits" | "lob" | "bvp">("splits");
  const [bvpSearch, setBvpSearch] = useState("");

  const { splits, lobSummary, lobBatterRanking, bvpRecords } = initialData;

  // Encontrar splits clave para KPIs
  const rispSplit = splits.find((s) => s.situacion.includes("RISP") && !s.situacion.includes("2 Outs"));
  const clutchSplit = splits.find((s) => s.situacion.includes("Clutch") || s.situacion.includes("2 Outs"));

  const filteredBvp = bvpRecords.filter((b) =>
    b.pitcherName.toLowerCase().includes(bvpSearch.toLowerCase()) ||
    b.opposingTeam.toLowerCase().includes(bvpSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
        <div className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-[#FDB827]" />
          <h1 className="text-xl font-bold text-slate-100">
            Splits Situacionales & LOB Tracker
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Rendimiento en situaciones de presión (RISP, Clutch, Bases Llenas), rastreo de corredores dejados en base (LOB Tracker) y enfrentamientos cara a cara BvP.
        </p>
      </div>

      {/* 4 KPIs Clave */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>AVG EN RISP</span>
            <Target className="w-4 h-4 text-[#FDB827]" />
          </div>
          <div className="text-xl font-mono font-extrabold text-[#FDB827]">
            {rispSplit?.avg || ".327"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            OPS en RISP: <span className="text-slate-200 font-mono font-bold">{rispSplit?.ops || ".915"}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>CLUTCH (2 OUTS RISP)</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-mono font-extrabold text-rose-400">
            {clutchSplit?.avg || ".311"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            OPS: <span className="text-slate-200 font-mono font-bold">{clutchSplit?.ops || ".882"}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>LOB AL TERMINAR INNING</span>
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-mono font-extrabold text-slate-100">
            {lobSummary.totalLobEnding}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Corredores en base con 3er out
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>TOTAL RISP LOB</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-mono font-extrabold text-amber-400">
            {lobSummary.totalRispLob}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Oportunidades en 2B/3B no remolcadas
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1E2B4D] gap-2">
        <button
          onClick={() => setActiveTab("splits")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === "splits"
              ? "bg-[#0D152B] text-[#FDB827] border-t-2 border-[#FDB827] border-x border-[#1E2B4D]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Splits Situacionales
        </button>
        <button
          onClick={() => setActiveTab("lob")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === "lob"
              ? "bg-[#0D152B] text-[#FDB827] border-t-2 border-[#FDB827] border-x border-[#1E2B4D]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          LOB Tracker (Dejados en Base)
        </button>
        <button
          onClick={() => setActiveTab("bvp")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === "bvp"
              ? "bg-[#0D152B] text-[#FDB827] border-t-2 border-[#FDB827] border-x border-[#1E2B4D]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Enfrentamientos Cara a Cara (BvP)
        </button>
      </div>

      {/* Tab 1: Splits Situacionales */}
      {activeTab === "splits" && (
        <div className="p-5 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#FDB827]" />
              Rendimiento Colectivo por Situación de Juego
            </h3>
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#070B19] border border-[#1E2B4D] text-[#FDB827]">
              Temporada 2025
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#1E2B4D] text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Situación</th>
                  <th className="py-2.5 px-3 text-center">PA</th>
                  <th className="py-2.5 px-3 text-center">AB</th>
                  <th className="py-2.5 px-3 text-center">H</th>
                  <th className="py-2.5 px-3 text-center">2B</th>
                  <th className="py-2.5 px-3 text-center">3B</th>
                  <th className="py-2.5 px-3 text-center">HR</th>
                  <th className="py-2.5 px-3 text-center">RBI</th>
                  <th className="py-2.5 px-3 text-center">BB</th>
                  <th className="py-2.5 px-3 text-center">SO</th>
                  <th className="py-2.5 px-3 text-right">AVG</th>
                  <th className="py-2.5 px-3 text-right">OBP</th>
                  <th className="py-2.5 px-3 text-right">SLG</th>
                  <th className="py-2.5 px-3 text-right">OPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2B4D]/60 font-mono">
                {splits.map((s, idx) => (
                  <tr
                    key={s.situacion}
                    className={`hover:bg-[#070B19]/50 transition-colors ${
                      idx === 0 ? "bg-[#070B19]/40 font-semibold" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-100 flex items-center gap-2">
                      {s.situacion}
                      {s.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/20 font-sans">
                          {s.badge}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-300">{s.pa}</td>
                    <td className="py-2.5 px-3 text-center text-slate-300">{s.ab}</td>
                    <td className="py-2.5 px-3 text-center text-slate-200">{s.h}</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">{s.doubles}</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">{s.triples}</td>
                    <td className="py-2.5 px-3 text-center text-slate-200">{s.hr}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">{s.rbi}</td>
                    <td className="py-2.5 px-3 text-center text-slate-300">{s.bb}</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">{s.so}</td>
                    <td className="py-2.5 px-3 text-right text-slate-100 font-bold">{s.avg}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{s.obp}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{s.slg}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#FDB827]">{s.ops}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: LOB Tracker */}
      {activeTab === "lob" && (
        <div className="p-5 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FDB827]" />
                LOB Tracker — Dejados en Base por Bateador
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Distingue entre el 3er out que cierra el inning y oportunidades no aprovechadas en medio de la entrada.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#070B19] border border-[#1E2B4D] text-[#FDB827]">
              Líderes de Oportunidades
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#1E2B4D] text-[10px] uppercase tracking-wider text-slate-400 font-sans">
                  <th className="py-2.5 px-3">Bateador</th>
                  <th className="py-2.5 px-3 text-center">PA Total</th>
                  <th className="py-2.5 px-3 text-center">PA en RISP</th>
                  <th className="py-2.5 px-3 text-center">RBI</th>
                  <th className="py-2.5 px-3 text-center">AVG en RISP</th>
                  <th className="py-2.5 px-3 text-right">LOB Terminar Inning</th>
                  <th className="py-2.5 px-3 text-right">RISP LOB Terminar</th>
                  <th className="py-2.5 px-3 text-right">RISP LOB Dentro</th>
                  <th className="py-2.5 px-3 text-right font-bold text-[#FDB827]">Total RISP LOB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2B4D]/60 font-mono">
                {lobBatterRanking.map((b) => (
                  <tr key={b.batterId} className="hover:bg-[#070B19]/50 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-100">{b.batterName}</td>
                    <td className="py-2.5 px-3 text-center text-slate-300">{b.pa}</td>
                    <td className="py-2.5 px-3 text-center text-slate-200">{b.paRisp}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">{b.rbi}</td>
                    <td className="py-2.5 px-3 text-center text-[#FDB827] font-bold">{b.avgRisp}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{b.lobEnding}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{b.rispLobEnding}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{b.rispLobMid}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-400">{b.totalRispLob}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: BvP */}
      {activeTab === "bvp" && (
        <div className="p-5 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#FDB827]" />
                Enfrentamientos Directos Bateador vs Lanzador (BvP)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Historial cara a cara acumulado frente a lanzadores abridores y relevistas rivales.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar lanzador o equipo..."
                value={bvpSearch}
                onChange={(e) => setBvpSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-[#070B19] border border-[#1E2B4D] rounded-lg text-slate-200 focus:outline-none focus:border-[#FDB827]/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#1E2B4D] text-[10px] uppercase tracking-wider text-slate-400 font-sans">
                  <th className="py-2.5 px-3">Lanzador Rival</th>
                  <th className="py-2.5 px-3">Equipo</th>
                  <th className="py-2.5 px-3 text-center">PA</th>
                  <th className="py-2.5 px-3 text-center">AB</th>
                  <th className="py-2.5 px-3 text-center">H</th>
                  <th className="py-2.5 px-3 text-center">HR</th>
                  <th className="py-2.5 px-3 text-center">RBI</th>
                  <th className="py-2.5 px-3 text-center">BB</th>
                  <th className="py-2.5 px-3 text-center">SO</th>
                  <th className="py-2.5 px-3 text-right">AVG</th>
                  <th className="py-2.5 px-3 text-right">OBP</th>
                  <th className="py-2.5 px-3 text-right">SLG</th>
                  <th className="py-2.5 px-3 text-right">OPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2B4D]/60 font-mono">
                {filteredBvp.map((b) => (
                  <tr key={b.pitcherId} className="hover:bg-[#070B19]/50 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-100">{b.pitcherName}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-400">{b.opposingTeam}</td>
                    <td className="py-2.5 px-3 text-center text-slate-300">{b.pa}</td>
                    <td className="py-2.5 px-3 text-center text-slate-300">{b.ab}</td>
                    <td className="py-2.5 px-3 text-center text-slate-200">{b.h}</td>
                    <td className="py-2.5 px-3 text-center text-slate-200">{b.hr}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">{b.rbi}</td>
                    <td className="py-2.5 px-3 text-center text-slate-300">{b.bb}</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">{b.so}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-100">{b.avg}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{b.obp}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{b.slg}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#FDB827]">{b.ops}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Nota Metodológica */}
      <div className="p-4 rounded-xl bg-[#0D152B]/60 border border-[#1E2B4D] text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <Info className="w-4 h-4 text-[#FDB827]" />
          <span>Glosario Sabermétrico Situacional</span>
        </div>
        <p>
          • <strong>RISP:</strong> Corredores en Posición Anotadora (Segunda y/o Tercera base).
        </p>
        <p>
          • <strong>Clutch (2 Outs RISP):</strong> Situación de máxima presión ofensiva donde un out termina la entrada.
        </p>
        <p>
          • <strong>LOB al Terminar Inning:</strong> Corredores varados en base en el momento en que se concreta el 3er out.
        </p>
        <p>
          • <strong>RISP LOB Dentro de Inning:</strong> Oportunidad con 0 o 1 out donde el bateador fue retirado o no remolcó a los corredores en posición anotadora.
        </p>
      </div>
    </div>
  );
}
