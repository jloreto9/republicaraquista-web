# Especificación de Feature: Ticker Superior en Vivo y Curva de Probabilidad de Ganar en Game Center

**Slug:** `016-live-ticker-gamecenter-win-probability`  
**Autor:** Antigravity & Jorge Leonardo Loreto (@JorgeLoreto)  
**Fecha:** 2026-11-04  
**Estado:** Aprobado para Especificación y Planificación (Spec-Kit Track 2)  

---

## 1. Contexto y Objetivos de Producto

En **República Caraquista** (`https://republicaraquistapp.vercel.app/`), el usuario requiere dos componentes críticos de experiencia de usuario en tiempo real inspirados en la interfaz de alto impacto visual ("Centro de Mando"):

1. **Ticker Superior de Partidos LVBP en Tiempo Real (`LiveTicker`):**
   - Una barra superior global, visible de forma horizontal y responsiva, que muestre el estado de toda la jornada de la LVBP (los 8 equipos: Caracas, Magallanes, La Guaira, Lara, Aragua, Zulia, Anzoátegui y Margarita).
   - Capaz de presentar:
     - Partidos **En Vivo (`● EN VIVO`)**: Marcador actual, entrada activa (ej. `ALTA 6.ª`, `BAJA 3.ª`), equipos con abreviaturas o logos.
     - Partidos **Finalizados (`FINAL` o `AYER`)**: Marcador final de encuentros recientes.
     - Partidos **Programados (`HOY 7:00 PM`)**: Hora de inicio y duelo de abridores si está disponible.
   - Navegación directa: Al hacer clic en un partido de Leones del Caracas (o juego de interés de la LVBP), redirige directamente al Game Center (`/game-center?gamePk={id}`) para ver la telemetría en vivo.

2. **Curva de Probabilidad de Ganar (Win Expectancy / WPA) en el Game Center:**
   - En la vista interactiva de Game Center (`/game-center`), integrar en la pestaña principal de **GameCast (Segunda Pantalla)** la curva gráfica de probabilidad de ganar en tiempo real.
   - Calculada jugada a jugada mediante la matriz Tango RE24 de 24 estados y leverage index a través del motor existente [`src/lib/wpa-engine.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/wpa-engine.ts).
   - Renderizada con diseño oscuro Caracas Navy/Oro (`#FDB827`), con indicador en tiempo real del porcentaje de victoria actual (ej. `68% Leones` o `Tigres 32%`), línea de paridad al 50%, y llamada visual destacada en jugadas de alto apalancamiento ($\Delta\text{WPA} \ge 10\%$, ej. *"Jonrón de Peña · +14%"*).

---

## 2. Requerimientos Funcionales (RF)

### RF01: Servicio y API de Jornada LVBP para el Ticker (`/api/ticker`)
- Crear o extender el endpoint `/api/ticker` (Edge runtime o Serverless con `revalidate = 30`) que devuelva el listado de partidos relevantes de la LVBP:
  - Partidos de la fecha actual (`today`).
  - Si aún no han comenzado o no hay juegos hoy, incluir los resultados de la jornada inmediata anterior (`yesterday`) para no dejar el ticker vacío.
- Contrato de datos del partido en el Ticker:
  ```typescript
  export interface TickerGame {
    id: number;
    gamePk: number;
    gameDate: string;
    status: "Preview" | "Live" | "Final";
    statusLabel: string; // ej: "FINAL", "ALTA 6.ª", "HOY 7:00 PM"
    isLive: boolean;
    homeTeam: {
      id: number;
      name: string;
      abbreviation: string;
      score: number;
      isLeones: boolean;
    };
    awayTeam: {
      id: number;
      name: string;
      abbreviation: string;
      score: number;
      isLeones: boolean;
    };
    currentInningOrdinal?: string; // ej: "6.ª"
    isTopInning?: boolean;
    venue?: string;
  }
  ```
- Estrategia de revalidación en Vercel:
  - Si hay al menos un juego con `isLive === true`: revalidación cada 20 segundos (`s-maxage=20, stale-while-revalidate=40`).
  - Si todos son `Final` o `Preview`: revalidación cada 5 minutos (`s-maxage=300`).

### RF02: Componente UI `LiveTicker` Global
- Componente de cliente ligero (`src/components/layout/live-ticker.tsx`), integrado en `src/app/layout.tsx` (en el encabezado del contenedor principal de contenido, encima de las páginas).
- Estilo y Maquetación:
  - Altura contenida (`h-9` o `h-10`), fondo oscuro `#070B19` con sutil borde inferior `#1E2B4D`.
  - Scroll horizontal suave y limpio con indicador de degradado lateral o control de desplazamiento táctil sin barras de scroll invasivas (`no-scrollbar`).
  - Badge semántico para cada juego:
    - En Vivo: Punto pulsante verde `● EN VIVO` y entrada en texto esmeralda/ámbar.
    - Finalizado: Etiqueta neutra `AYER` o `FINAL`.
    - Programado: Texto ámbar/gris con hora (ej. `7:00 PM`).
  - Abreviaturas y Marcador: Formato compacto `CAR 4 - 2 ARA` con realce en negrita del equipo con ventaja/ganador y el oro caraquista `#FDB827` cuando juegue Leones del Caracas.
  - Al pulsar sobre un juego, enlazar a `/game-center?gamePk={gamePk}`.

### RF03: Integración de la Curva de Probabilidad de Ganar en Game Center
- Diseñar el componente `GameWinProbabilityCard` (`src/components/game-center/game-win-probability-card.tsx`).
- Ubicación en Game Center:
  - En la pestaña **GameCast (Segunda Pantalla)**, ubicado estratégicamente junto a la tabla de Linescore o el Diamante interactivo (reemplazando el bloque estático de estatus oficial o complementándolo).
- Especificación Visual y Métricas del Gráfico:
  - **Header de la Tarjeta**:
    - Título: `Probabilidad de ganar`.
    - Métrica Actual: Porcentaje en vivo en tipografía de alto contraste (ej: `68% Leones` en oro `#FDB827`, o el equipo en ventaja).
  - **Lienzo del Gráfico**:
    - Línea de equilibrio en el 50% con trazo discontinuo sutil (`stroke="#334155" strokeDasharray="3 3"`).
    - Curva continua y suavizada con gradiente caraquista `#FDB827` en zona favorable de Leones y acento carmesí o neutro si el rival domina.
    - Punto de llamada / callout automático en la jugada con mayor impacto de $\Delta\text{WPA}$ reciente o del partido (ej. *"Jonrón de Peña · +14%"*).
    - Tooltip interactivo al pasar el cursor o pulsar: Muestra la jugada (`description`), el inning, el marcador resultante y el cambio de probabilidad ($\Delta\text{WPA}$).

### RF04: Enlace de Telemetría WPA con GameCenterData
- En [`src/lib/game-center-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/game-center-service.ts), al procesar los datos de un `gamePk`, calcular o adjuntar el historial de probabilidades `wpaPlays` usando el motor [`processGameWpa`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/wpa-engine.ts).
- Exponer en `GameCenterData`:
  ```typescript
  export interface GameCenterData {
    // ... campos existentes
    winProbability?: {
      currentHomeWp: number; // 0.0 - 1.0
      currentAwayWp: number;
      leonesWp: number;
      dominantTeamName: string;
      keyPlay?: {
        description: string;
        deltaWpa: number;
        inning: number;
        half: string;
      };
      trend: Array<{
        playIndex: number;
        inning: number;
        half: string;
        homeWp: number;
        leonesWp: number;
        description: string;
        scoreStr: string;
      }>;
    };
  }
  ```

---

## 3. Invariantes y Guardrails

1. **Cero Statcast en LVBP (`GEMINI.md` §1.1.1):** No introducir métricas ópticas inventadas. La probabilidad de victoria deriva estrictamente de la matriz empírica Tango RE24 de 24 estados sobre el estado real de outs, corredores y marcador.
2. **Cero Impacto de Regresión:** El Game Center debe mantener al 100% sus funcionalidades actuales (hoja de anotación scorecard, boxscore, jugada a jugada, alertas push de carreras).
3. **Escalera Ponytail:** Reutilizar [`src/lib/wpa-engine.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/wpa-engine.ts) sin reescribir la lógica matemática de Tango; solo proyectar el resultado hacia la nueva tarjeta UI.
4. **Resiliencia en Vercel:** Si la API de MLB no devuelve PBP (por ejemplo en juegos pre-iniciados), la tarjeta de probabilidad debe renderizar un estado vacío limpio o el 50% inicial sin lanzar excepciones ni romper el renderizado del servidor.
