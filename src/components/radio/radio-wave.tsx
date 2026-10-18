"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface RadioWaveProps {
  isPlaying: boolean;
  className?: string;
  barColor?: string;
}

export function RadioWave({
  isPlaying,
  className,
  barColor = "bg-[#FDB827]",
}: RadioWaveProps) {
  return (
    <div
      className={cn("flex items-end gap-[2.5px] h-3.5 px-0.5", className)}
      aria-hidden="true"
      title={isPlaying ? "Audio en reproducción" : "Audio pausado"}
    >
      <span
        className={cn(
          "w-[3px] rounded-full transition-all duration-300",
          barColor,
          isPlaying ? "animate-pulse h-3.5" : "h-1 opacity-50"
        )}
        style={{
          animationDuration: isPlaying ? "0.6s" : "0s",
        }}
      />
      <span
        className={cn(
          "w-[3px] rounded-full transition-all duration-300",
          barColor,
          isPlaying ? "animate-pulse h-2" : "h-1 opacity-50"
        )}
        style={{
          animationDuration: isPlaying ? "0.45s" : "0s",
          animationDelay: isPlaying ? "0.15s" : "0s",
        }}
      />
      <span
        className={cn(
          "w-[3px] rounded-full transition-all duration-300",
          barColor,
          isPlaying ? "animate-pulse h-3" : "h-1 opacity-50"
        )}
        style={{
          animationDuration: isPlaying ? "0.75s" : "0s",
          animationDelay: isPlaying ? "0.3s" : "0s",
        }}
      />
      <span
        className={cn(
          "w-[3px] rounded-full transition-all duration-300",
          barColor,
          isPlaying ? "animate-pulse h-2.5" : "h-1 opacity-50"
        )}
        style={{
          animationDuration: isPlaying ? "0.55s" : "0s",
          animationDelay: isPlaying ? "0.1s" : "0s",
        }}
      />
    </div>
  );
}
