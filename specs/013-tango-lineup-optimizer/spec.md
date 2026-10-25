# Especificación de Feature: Optimizador de Lineup Sabermétrico (Tom Tango)

**Slug:** `013-tango-lineup-optimizer`  
**Autor:** Antigravity & Jorge Leonardo Loreto (@JorgeLoreto)  
**Fecha:** 2026-10-25  
**Estado:** Especificado (Fase 1 de Spec-Kit)  

---

## 1. Contexto y Objetivos

En el béisbol tradicional, la construcción del orden al bate (1 al 9) ha estado dominada por dogmas empíricos: el bateador más rápido como primer bate (#1), un tocador de bola o bateador de contacto como segundo (#2), el mejor bateador del equipo como tercer bate (#3) y el jonronero clásico como cuarto bate (#4).

En la obra canónica de sabermetría moderna ***The Book: Playing the Percentages in Baseball*** (Tom Tango, Mitchel Lichtman y Andrew Dolphin, 2006), se demostró mediante simulaciones estocásticas de millones de entradas y análisis de frecuencias situacionales que el orden tradicional suboptimiza la producción de carreras. Particularmente:
- El turno **#2** es el segundo más frecuente en apariciones al plato (PA) y toma turnos con frecuencia sin outs o con corredor en primera: **debe ser ocupado por el mejor bateador integral del equipo (mayor wOBA)**.
- El turno **#3** es el más sobrevalorado en la historia del juego: en la 1ra entrada con frecuencia batea con 2 outs y bases vacías (tras out de #1 o #2). Por tanto, debe ser apenas el **5to mejor bateador**, no el mejor.
- El turno **#1** exige **máximo porcentaje de embasado (OBP)** por encima de cualquier otra consideración para no regalar outs iniciales.
- El turno **#4** debe maximizar el **poder aislado (ISO / SLG)** pues batea en el mayor número de situaciones con corredores en posición anotadora.
- El turno **#9** funciona como un **segundo leadoff**: requiere el mejor OBP de la parte baja del orden para enlazar con la artillería pesada del 1-2-3.

El objetivo de esta funcionalidad es agregar una nueva sub-pestaña interactiva al **Tracker de Lineups** de República Caraquista (`/bullpen` ➔ *Tracker Lineups 1-9*): **"Optimizador de Lineup (Tom Tango)"**, permitiendo al fanático y analista evaluar la alineación titular de cualquier juego de los Leones del Caracas (o combinaciones personalizadas), compararla contra la distribución óptima de Tom Tango y visualizar la ganancia proyectada en carreras por juego (R/G) y en la temporada de 56 juegos de la LVBP.

---

## 2. Requerimientos Funcionales

### RF01: Integración en el Tracker de Lineups (`/bullpen`)
- En la vista [src/components/bullpen/bullpen-view.tsx](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/bullpen/bullpen-view.tsx), dentro de la pestaña principal `activeTab === "lineups"` (Tracker Lineups 1-9), añadir la 5ta sub-pestaña:
  - `card`: Tarjeta de Juego (Scorecard)
  - `frequent`: Alineaciones Frecuentes
  - `heatmap`: Matriz de Calor (1 al 9)
  - `player`: Impacto por Jugador
  - **`optimizer`**: **Optimizador Tom Tango (The Book)**

### RF02: Motor de Optimización Sabermétrica de Tom Tango (`src/lib/tango-lineup-engine.ts`)
- Implementar la matriz de ponderación y apalancamiento situacional de *The Book* ajustada a la LVBP (56 juegos):
  - **Ponderador de Apariciones al Plato por Slot:**
    - Slot 1: ~4.67 PA/G (261.5 PA/temporada)
    - Slot 2: ~4.54 PA/G (254.2 PA/temporada)
    - Slot 3: ~4.41 PA/G (247.0 PA/temporada)
    - Slot 4: ~4.28 PA/G (239.7 PA/temporada)
    - Slot 5: ~4.15 PA/G (232.4 PA/temporada)
    - Slot 6: ~4.02 PA/G (225.1 PA/temporada)
    - Slot 7: ~3.89 PA/G (217.8 PA/temporada)
    - Slot 8: ~3.76 PA/G (210.6 PA/temporada)
    - Slot 9: ~3.63 PA/G (203.3 PA/temporada)
- **Algoritmo Determinístico de Asignación:**
  1. **Slot #2 (Mejor Bateador Integral):** Bateador con mayor wOBA del pool de 9.
  2. **Slot #1 (Leadoff / Embasador Élite):** Bateador con mayor OBP entre los 8 restantes.
  3. **Slot #4 (Cleanup Principal):** Bateador con mayor poder aislado (ISO = SLG - AVG) entre los 7 restantes.
  4. **Slot #5 (Segundo Cleanup / Poder):** Bateador con mayor SLG entre los 6 restantes.
  5. **Slot #3 (Contacto / Bate Puro):** Bateador con mayor wOBA entre los 5 restantes (5to en el orden de jerarquía).
  6. **Slot #9 (Segundo Leadoff):** Bateador con mayor OBP de los 4 restantes (para crear mesa al 1-2-3).
  7. **Slots #6, #7, #8:** Los 3 bateadores restantes ordenados descendentemente por wOBA.
- **Cálculo de Carreras Esperadas (BaseRuns Ponderado):**
  - Producción de carreras por slot según apalancamiento de OBP, SLG y wOBA.
  - Bonificación por alternancia de manos (platoon switches para evitar racimos del mismo lado).
  - Cálculo de Carreras por Juego (R/G), Carreras por Temporada de 56 Juegos (R/56G) y Delta de optimización ($\Delta R$).

### RF03: Interfaz de Usuario y Componente (`TangoLineupOptimizerTab`)
- Selector de juego base pre-cargado desde el historial de partidos de la temporada (ej. Leones vs Magallanes, Tiburones, etc.) o alineación canónica de Leones.
- **Panel de KPIs de Impacto:**
  - Carreras Proyectadas Orden Actual (R/G y R/Temporada)
  - Carreras Proyectadas Orden Óptimo Tango (R/G y R/Temporada)
  - Ganancia Proyectada ($\Delta R$ en 56 juegos)
  - Score de Balance Platoon (% de alternancia Zurdo/Derecho)
- **Tabla Comparativa Slot por Slot:**
  - Columnas: Slot, Bateador Actual (AVG/OBP/SLG/wOBA), Bateador Óptimo Tango (Rol táctico asignado), Justificación de *The Book*.
- **Módulo Didáctico / Glosario Desplegable:**
  - Resumen pedagógico de *The Book*: ¿Por qué el #2 es el mejor bateador? ¿Por qué el #3 está sobrevalorado? ¿Por qué el #9 necesita OBP?

---

## 3. Contrato de Datos e Interfaces

```typescript
export interface TangoPlayer {
  playerId: number;
  playerName: string;
  position: string;
  bats: 'R' | 'L' | 'S'; // Derecho, Zurdo, Ambidiestro
  avg: number;
  obp: number;
  slg: number;
  woba: number;
  wrcPlus: number;
  iso: number;
}

export interface TangoSlotContribution {
  slot: number;
  player: TangoPlayer;
  role: string;
  paGame: number;
  paSeason: number;
  runsContributedGame: number;
  runsContributedSeason: number;
  explanation: string;
}

export interface TangoLineupMetrics {
  runsPerGame: number;
  runsPerSeason: number;
  teamWoba: number;
  platoonBalanceScore: number;
  contributions: TangoSlotContribution[];
}

export interface TangoOptimizationResult {
  currentLineup: TangoSlotContribution[];
  optimizedLineup: TangoSlotContribution[];
  currentMetrics: TangoLineupMetrics;
  optimizedMetrics: TangoLineupMetrics;
  deltaRunsPerGame: number;
  deltaRunsPerSeason: number;
}
```

---

## 4. Criterios de Aceptación (Definición de Terminado)

1. **CA01:** La pestaña `Tracker Lineups 1-9` en `/bullpen` muestra la nueva sub-pestaña *"Optimizador de Lineup (Tom Tango)"* con ícono y estilo uniforme.
2. **CA02:** Al seleccionar cualquier juego del historial o el lineup titular de Leones, el optimizador calcula la alineación recomendada siguiendo exactamente las reglas de *The Book*.
3. **CA03:** Se muestra la comparativa precisa de carreras esperadas slot por slot y la ganancia total proyectada en 56 juegos de temporada regular.
4. **CA04:** La interfaz incluye el glosario explicativo y las justificaciones tácticas para cada posición en el orden (1 al 9).
5. **CA05:** La compilación con `npx tsc --noEmit` y `npm run build` pasa con 0 errores de TypeScript y 0 regresiones.
