"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Search, Loader2, Sparkles } from "lucide-react";
import { PitcherProfile } from "@/types/pitching";
import { CARACAS_FEATURED_PITCHERS } from "@/lib/pitching-constants";

interface PitchingSearchProps {
  onSelectPitcher: (pitcher: PitcherProfile) => void;
  selectedPitcherId?: number;
}

export function PitchingSearch({ onSelectPitcher, selectedPitcherId }: PitchingSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PitcherProfile[]>(CARACAS_FEATURED_PITCHERS);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(CARACAS_FEATURED_PITCHERS);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/pitching/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center relative" ref={dropdownRef}>
      {/* Central Input Box */}
      <div className="w-full relative flex items-center bg-[#0D152B]/90 border border-[#FDB827]/40 rounded-2xl p-2 sm:p-2.5 shadow-[0_10px_35px_rgba(0,0,0,0.5)] focus-within:border-[#FDB827] focus-within:ring-2 focus-within:ring-[#FDB827]/20 transition-all">
        <Search className="w-5 h-5 text-[#FDB827] ml-2 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar lanzador por nombre o ID (ej: Albert Suárez, Erick Leal, Tarik Skubal...)"
          className="w-full bg-transparent border-none text-slate-100 placeholder-slate-400 text-xs sm:text-sm px-3 focus:outline-none"
        />
        {isSearching ? (
          <Loader2 className="w-4 h-4 text-[#FDB827] animate-spin mr-2 shrink-0" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery("");
              setResults(CARACAS_FEATURED_PITCHERS);
            }}
            className="text-slate-400 hover:text-slate-200 text-xs px-2"
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* Quick Access Chips */}
      <div className="w-full flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3">
        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium mr-1">
          <Sparkles className="w-3 h-3 text-[#FDB827]" />
          Referentes Caraquistas:
        </span>
        {CARACAS_FEATURED_PITCHERS.map((p) => {
          const isSelected = p.id === selectedPitcherId;
          return (
            <button
              key={p.id}
              onClick={() => {
                onSelectPitcher(p);
                setIsOpen(false);
              }}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                isSelected
                  ? "bg-[#FDB827] text-slate-950 border-[#FDB827] font-bold shadow-[0_0_10px_rgba(253,184,39,0.3)]"
                  : "bg-[#0D152B] text-slate-300 border-[#1E2B4D] hover:border-[#FDB827]/60 hover:text-[#FDB827]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FDB827]" />
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-14 left-0 right-0 z-30 mt-2 bg-[#0D152B] border border-[#1E2B4D] rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-[#1E2B4D]/60 backdrop-blur-md">
          {results.map((p) => {
            const isSelected = p.id === selectedPitcherId;
            return (
              <button
                key={p.id}
                onClick={() => {
                  onSelectPitcher(p);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors ${
                  isSelected ? "bg-[#1E2B4D]/60" : "hover:bg-[#1E2B4D]/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#070B19] border border-[#1E2B4D] shrink-0 relative">
                    <Image
                      src={p.photoUrl}
                      alt={p.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                      {p.name}
                      {p.hasCaracasHistory && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#002D62] text-[#FDB827] border border-[#FDB827]/40 font-bold">
                          CAR
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {p.team} • {p.position} ({p.throws}HP)
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400">#{p.id}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
