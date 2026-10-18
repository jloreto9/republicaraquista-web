"use client";

import React from "react";
import { Award, Briefcase, Shield, User } from "lucide-react";
import { StaffMember, LEONES_COACHING_STAFF } from "@/data/roster-data";
import { cn } from "@/lib/utils";

export function StaffTab() {
  const manager = LEONES_COACHING_STAFF.find((s) => s.category === "manager");
  const coaches = LEONES_COACHING_STAFF.filter((s) => s.category === "coach");
  const directivaYApoyo = LEONES_COACHING_STAFF.filter(
    (s) => s.category === "directiva" || s.category === "apoyo"
  );

  return (
    <div className="space-y-6">
      {/* ── Mánager Principal (Tarjeta Hero) ── */}
      {manager && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0D152B] via-[#131E3D] to-[#0D152B] border border-[#FDB827]/40 shadow-[0_4px_25px_rgba(253,184,39,0.08)] flex flex-col md:flex-row items-center gap-5">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-[#070B19] border-2 border-[#FDB827] shadow-[0_0_15px_rgba(253,184,39,0.3)] shrink-0 flex items-center justify-center">
            <User className="w-10 h-10 text-[#FDB827]" />
            {manager.number && (
              <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-[#070B19]/90 text-[10px] font-mono font-bold text-[#FDB827] border border-[#FDB827]/40">
                #{manager.number}
              </span>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h3 className="text-xl font-bold text-slate-100">{manager.name}</h3>
              <span className="px-2 py-0.5 rounded-full bg-[#FDB827] text-[#070B19] text-[10px] font-mono font-bold uppercase">
                {manager.role}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
              {manager.bio}
            </p>
          </div>
        </div>
      )}

      {/* ── Cuerpo Técnico de Coaches ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-[#FDB827]" />
          <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-300">
            Cuerpo de Coaches Oficial (LVBP 2026-2027)
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {coaches.map((staff) => (
            <div
              key={staff.name}
              className="p-3.5 rounded-xl bg-[#0D152B]/70 border border-[#1E2B4D] hover:border-[#FDB827]/40 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {staff.number && (
                      <span className="font-mono text-xs font-bold text-[#FDB827]">
                        #{staff.number}
                      </span>
                    )}
                    <h5 className="font-bold text-sm text-slate-100 truncate">
                      {staff.name}
                    </h5>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-[#FDB827]/90 mt-0.5 block">
                    {staff.role}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-lg bg-[#070B19] border border-[#1E2B4D] flex items-center justify-center shrink-0 text-slate-400">
                  <User className="w-4 h-4" />
                </div>
              </div>

              {staff.bio && (
                <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                  {staff.bio}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Gerencia Deportiva y Personal de Apoyo ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-4 h-4 text-sky-400" />
          <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-300">
            Gerencia Deportiva y Apoyo Técnico
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {directivaYApoyo.map((staff) => (
            <div
              key={staff.name}
              className="p-3.5 rounded-xl bg-[#0D152B]/50 border border-[#1E2B4D] flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h5 className="font-bold text-sm text-slate-100">{staff.name}</h5>
                  <span className="text-[11px] font-mono font-medium text-sky-400 mt-0.5 block">
                    {staff.role}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#070B19] border border-[#1E2B4D] flex items-center justify-center shrink-0 text-slate-400">
                  <Award className="w-4 h-4" />
                </div>
              </div>

              {staff.bio && (
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {staff.bio}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
