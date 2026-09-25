"use client";

import { useState, useEffect } from "react";

export interface OrientationState {
  isLandscape: boolean;
  isMobileLandscape: boolean;
  orientationType: string;
}

export function useOrientation(): OrientationState {
  const [state, setState] = useState<OrientationState>({
    isLandscape: false,
    isMobileLandscape: false,
    orientationType: "portrait-primary",
  });

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === "undefined") return;

      const landscapeQuery = window.matchMedia("(orientation: landscape)").matches;
      const type =
        window.screen?.orientation?.type ||
        (landscapeQuery ? "landscape-primary" : "portrait-primary");

      const width = window.innerWidth;
      const height = window.innerHeight;

      // Móvil en apaisado: pantalla apaisada con altura muy reducida (típica de teléfonos: 320px a 500px)
      const isMobileLandscape = landscapeQuery && height <= 520 && width <= 1024;

      setState({
        isLandscape: landscapeQuery,
        isMobileLandscape,
        orientationType: type,
      });
    };

    checkOrientation();

    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    if (window.screen?.orientation?.addEventListener) {
      window.screen.orientation.addEventListener("change", checkOrientation);
    }

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
      if (window.screen?.orientation?.removeEventListener) {
        window.screen.orientation.removeEventListener("change", checkOrientation);
      }
    };
  }, []);

  return state;
}
