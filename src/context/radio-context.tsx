"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Station, RADIO_STATIONS } from "@/components/radio/radio-stations";

export type RadioStatus = "idle" | "buffering" | "playing" | "error";

interface RadioContextType {
  currentStation: Station;
  setStation: (station: Station) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  status: RadioStatus;
  setStatus: (status: RadioStatus) => void;
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  retry: () => void;
}

const RadioContext = createContext<RadioContextType | undefined>(undefined);

const STORAGE_KEY_STATION = "rc_radio_station_id";
const STORAGE_KEY_VOLUME = "rc_radio_volume";

export function RadioProvider({ children }: { children: ReactNode }) {
  const [currentStation, setCurrentStationState] = useState<Station>(RADIO_STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [status, setStatus] = useState<RadioStatus>("idle");
  const [volume, setVolumeState] = useState<number>(0.85);
  const [prevVolume, setPrevVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  // Cargar preferencias guardadas en localStorage tras montar
  useEffect(() => {
    try {
      const savedStationId = localStorage.getItem(STORAGE_KEY_STATION);
      if (savedStationId) {
        const found = RADIO_STATIONS.find((s) => s.id === savedStationId);
        if (found) {
          setCurrentStationState(found);
        }
      }

      const savedVol = localStorage.getItem(STORAGE_KEY_VOLUME);
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          setVolumeState(parsed);
          setPrevVolume(parsed > 0 ? parsed : 0.85);
          if (parsed === 0) setIsMuted(true);
        }
      }
    } catch {
      // Ignorar errores de localStorage en entornos restringidos
    }
  }, []);

  const setStation = useCallback((station: Station) => {
    setCurrentStationState(station);
    try {
      localStorage.setItem(STORAGE_KEY_STATION, station.id);
    } catch {
      // ignore
    }
  }, []);

  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    if (clamped > 0) {
      setPrevVolume(clamped);
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, clamped.toString());
    } catch {
      // ignore
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(prevVolume > 0 ? prevVolume : 0.85);
    } else {
      setIsMuted(true);
      setVolume(0);
    }
  }, [isMuted, prevVolume, setVolume]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const retry = useCallback(() => {
    setRetryTrigger((prev) => prev + 1);
    setIsPlaying(true);
  }, []);

  return (
    <RadioContext.Provider
      value={{
        currentStation,
        setStation,
        isPlaying,
        setIsPlaying,
        togglePlay,
        status,
        setStatus,
        volume: isMuted ? 0 : volume,
        setVolume,
        isMuted,
        toggleMute,
        isExpanded,
        setIsExpanded,
        retry,
      }}
    >
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio(): RadioContextType {
  const context = useContext(RadioContext);
  if (!context) {
    throw new Error("useRadio debe utilizarse dentro de un <RadioProvider>");
  }
  return context;
}
