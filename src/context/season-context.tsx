"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ACTIVE_SEASON, AVAILABLE_SEASONS } from "@/lib/constants";

interface SeasonContextType {
  season: number;
  setSeason: (season: number) => void;
  availableSeasons: number[];
  seasonLabel: string;
}

const SeasonContext = createContext<SeasonContextType>({
  season: ACTIVE_SEASON,
  setSeason: () => {},
  availableSeasons: AVAILABLE_SEASONS,
  seasonLabel: "2026-27",
});

const STORAGE_KEY = "republicaraquista_season";

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const [season, setSeasonState] = useState<number>(ACTIVE_SEASON);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (AVAILABLE_SEASONS.includes(parsed)) {
          setSeasonState(parsed);
          document.cookie = `rc_season=${parsed}; path=/; max-age=31536000; SameSite=Lax`;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const setSeason = (newSeason: number) => {
    if (!AVAILABLE_SEASONS.includes(newSeason)) return;
    setSeasonState(newSeason);
    try {
      localStorage.setItem(STORAGE_KEY, String(newSeason));
      document.cookie = `rc_season=${newSeason}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore storage errors
    }
  };

  const seasonLabel = `${season}-${String(season + 1).slice(-2)}`;

  return (
    <SeasonContext.Provider
      value={{
        season,
        setSeason,
        availableSeasons: AVAILABLE_SEASONS,
        seasonLabel,
      }}
    >
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  const context = useContext(SeasonContext);
  if (!context) {
    throw new Error("useSeason debe utilizarse dentro de un SeasonProvider");
  }
  return context;
}
