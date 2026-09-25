# Implementation Plan: Mobile Responsive Orientation (Landscape / Portrait Mode)

> **Feature**: `001-mobile-orientation-landscape-portrait`  
> **App**: `republicaraquista-web` (REPUBLICARAQUISTAPP)  
> **Stack**: Next.js 16 (App Router + Turbopack) + React 19 + Tailwind CSS v4 + Recharts + PWA  
> **Author**: Jorge Leonardo Loreto • AI Data Scientist  
> **Date**: 2026-09-25

---

## 1. Executive Summary & Viability Verdict

### ¿Es viable?
**SÍ, 100% viable, técnicamente limpio y con un ROI de UX extraordinario.**

En plataformas sabermétricas deportivas, el contenido es intrínsecamente horizontal (boxscores de 9 entradas, tablas de lanzadores de 15 columnas, curvas temporales de Win Expectancy y gráficos lado a lado). En un teléfono en vertical (375-430 px de ancho), los usuarios sufren scroll horizontal constante y apiñamiento de datos.

Al habilitar la rotación reactiva:
- **Modo Vertical (Portrait, consumo en una mano)**: Navegación rápida, resúmenes, tarjetas de KPIs, feeds de partidos y radar polar centrado.
- **Modo Horizontal (Landscape / "Modo Consola / Estadio")**: Se desbloquean 800-932 px de ancho natural para desplegar tablas completas de 10 salidas de pitcheo sin scroll, gráficos de Win Expectancy WPA estilo transmisión de TV y visualización panorámica del lienzo Thomas Nestico.

---

## 2. Root Cause Analysis: ¿Por qué hoy no gira?

1. **Bloqueo Rígido en Manifiestos PWA**:
   - Tanto [`public/manifest.json`](file:///c:/Users/Administrator/Projets/republicaraquista-web/public/manifest.json#L9) como [`src/app/manifest.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/manifest.ts#L13) tienen hardcodeado:
     ```json
     "orientation": "portrait"
     ```
     Al instalarse como PWA en iOS o Android, el sistema operativo congela la ventana e ignora la rotación física del giroscopio.
2. **Ausencia de `viewport-fit=cover`**:
   - [`src/app/layout.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/layout.tsx#L20) define el viewport sin `viewportFit: "cover"`, lo que provoca barras negras ("letterboxing") en landscape y colisiones con el notch o Dynamic Island.
3. **Bottom Navigation Bar No Adaptada a Altura Reducida**:
   - En landscape, un teléfono tiene una altura de apenas 375 a 430 px. Un bottom nav fijo de 64-80 px devora el 20-25% de la pantalla útil si no se compacta o recoloca.

---

## 3. Technical Architecture & Design Decisions

### 3.1. Desbloqueo en Manifiestos PWA
- Modificar `orientation` de `"portrait"` a `"any"` tanto en `public/manifest.json` como en `src/app/manifest.ts`.

### 3.2. Viewport & Safe Areas en `layout.tsx`
- Enriquecer el objeto `viewport`:
  ```typescript
  export const viewport: Viewport = {
    themeColor: "#070B19",
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
  };
  ```
- Soporte de Safe Areas CSS para notches en landscape:
  `padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right);`

### 3.3. Detección de Dispositivo Móvil Apaisado (CSS & Tailwind)
Para evitar que un monitor de PC o tablet se confunda con un teléfono horizontal, se define el token semántico de Tailwind o clase utilitaria:
```css
/* Teléfono móvil en landscape: ancho amplio pero altura crítica reducida */
@media (orientation: landscape) and (max-height: 500px) and (max-width: 1024px) {
  /* Reglas específicas para mobile landscape */
}
```

En Tailwind v4, se aprovecha la variante nativa `landscape:` combinada con `max-h-[500px]`:
- Cabeceras: `h-14 landscape:max-h-[500px]:h-10`
- Bottom Navigation: `h-16 landscape:max-h-[500px]:h-11` o convertir a rail lateral flotante.
- Padding de contenedor: `px-4 landscape:max-h-[500px]:px-6`

### 3.4. Hook React `useOrientation()`
Un hook cliente ultraligero (`src/hooks/use-orientation.ts`) basado en `window.matchMedia('(orientation: landscape)')` y `screen.orientation`:
```typescript
"use client";

import { useState, useEffect } from "react";

export function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  useEffect(() => {
    const update = () => {
      const landscape = window.matchMedia("(orientation: landscape)").matches;
      const shortHeight = window.innerHeight <= 500 && window.innerWidth <= 1024;
      setIsLandscape(landscape);
      setIsMobileLandscape(landscape && shortHeight);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return { isLandscape, isMobileLandscape };
}
```

---

## 4. Matriz de Adaptación por Vista Sabermétrica

| Vista | Experiencia en Portrait (Vertical) | Experiencia Optimizada en Landscape (Horizontal) |
| :--- | :--- | :--- |
| **`/pitching` (Pitching Summary)** | Tarjeta Nestico escalada verticalmente; tabla de 10 juegos con scroll horizontal forzado. | **Modo Consola Dual**: Headshot + Tríptico a la izquierda; **Tabla completa de 10 juegos a la derecha sin scroll horizontal**; botón HD expandido. |
| **`/individuales` (Líderes)** | Tabla condensada (5-6 columnas visibles); el resto oculto o bajo scroll horizontal. | **Matriz Sabermétrica Completa**: Todas las columnas (AVG, OBP, SLG, OPS, ISO, BABIP, wOBA, wRC+) visibles de un solo golpe visual. |
| **`/wpa` (Win Expectancy)** | Curva de 9 entradas comprimida o con etiquetas apiñadas. | **Timeline Broadcast**: Curva temporal de 9 entradas extendida horizontalmente, idéntica a una transmisión de TV o escritorio. |
| **`/spray-charts`** | Diamante arriba, matriz 3x3 de disciplina abajo (scroll vertical largo). | **Split Screen**: Diamante interactivo a la izquierda (50%) y Mapa de Calor 3x3 a la derecha (50%). |
| **`/matchup` (Matchup 360)** | Radar polar centrado; desglose en lista vertical por categoría. | **Cara a Cara Panorámico**: Jugador 1 a la izquierda, Radar Polar al centro, Jugador 2 a la derecha. |
| **`/` (Centro de Mando)** | Scoreboard en tarjetas apiladas; series en carrusel vertical. | **Scoreboard Ticker Horizontal**: Línea de marcadores estilo ticker de MLB Network. |

---

## 5. Implementation Tasks & Phasing

- [ ] **Fase 1: Configuración de Plataforma & PWA**
  - Actualizar `public/manifest.json` y `src/app/manifest.ts` (`orientation: "any"`).
  - Añadir `viewportFit: "cover"` en `src/app/layout.tsx`.
  - Configurar variables CSS seguras en `src/app/globals.css` (`safe-area-inset`).
- [ ] **Fase 2: Hook y Utilidades React**
  - Crear `src/hooks/use-orientation.ts`.
  - Crear componente `OrientationIndicator` (tooltip visual opcional "Gira tu teléfono para vista completa de datos").
- [ ] **Fase 3: Adaptación del Layout Global (`MobileNav` & `Sidebar`)**
  - Compactar `MobileNav` en `landscape:max-h-[500px]` para que no devore altura vertical.
  - Asegurar que el contenido principal tenga padding lateral resguardado contra notch.
- [ ] **Fase 4: Adaptación de Vistas Críticas (`/pitching`, `/individuales`, `/wpa`)**
  - `/pitching`: Layout side-by-side en mobile landscape para la tabla de 10 salidas de Thomas Nestico.
  - `/individuales`: Desplegar anchos completos en la tabla de líderes.
  - `/wpa`: Renderizar Recharts con `aspectRatio` adaptativo según `isMobileLandscape`.
- [ ] **Fase 5: Verificación & Testing Multi-Dispositivo**
  - Probar en simulador / DevTools (iPhone 14/15/16 Pro, Samsung Galaxy S23/S24, Google Pixel).
  - Validar rotación suave en 0°, 90°, 270°.
  - Verificar que en escritorio y iPad no se disparen reglas de teléfono apaisado.

---

## 6. Success Criteria

1. La PWA instalada en pantalla de inicio de iPhone o Android rota libremente al girar el dispositivo.
2. En orientación horizontal en teléfono, ninguna tabla sabermétrica corta datos críticos ni se solapa con el notch o isla dinámica.
3. La barra de navegación inferior no ocupa más del 12% de la altura de la pantalla en modo horizontal.
4. Cero regresiones en la experiencia de escritorio o tablets.
