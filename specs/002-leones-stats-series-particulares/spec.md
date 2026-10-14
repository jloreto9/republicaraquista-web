# Feature Specification: Series Particulares & Fix de Estadísticas Situacionales en Leones Stats

> **Feature**: `002-leones-stats-series-particulares`  
> **App**: `republicaraquista-web` (REPUBLICARAQUISTAPP)  
> **Status**: Ready for Implementation  
> **Author**: Jorge Leonardo Loreto • AI Data Scientist  
> **Date**: 2026-10-14  

---

## 1. Problem Statement & Root Cause

En la pestaña **Leones Stats** del Centro de Mando (`/`):

1. **Falta de Series Particulares**:
   No existe el desglose de enfrentamientos particulares (Head-to-Head) contra los otros 7 equipos de la LVBP (Magallanes, Tiburones, Cardenales, Águilas, Caribes, Bravos, Tigres), impidiendo ver cómo marcha la serie ante cada rival en la temporada regular activa (8 juegos programados por rival).

2. **Bug de Contaminación de Datos Históricos (Causa Raíz)**:
   En `src/lib/leones-stats-service.ts`, las métricas situacionales `remontados`, `up`, `terreneadas`, `starters`, `relievers`, `saves` y `extraInning` se estaban asignando directamente desde la constante `BASELINE_2025_STATS` y un string hardcodeado `"1-2"`:
   ```ts
   // BUG: Caída estática en datos 2025 incluso cuando season = 2026
   remontados: BASELINE_2025_STATS.remontados, // -> 2
   up: BASELINE_2025_STATS.up,                 // -> "21-5"
   terreneadas: BASELINE_2025_STATS.terreneadas, // -> 2
   starters: BASELINE_2025_STATS.starters,     // -> "7-15"
   relievers: BASELINE_2025_STATS.relievers,   // -> "17-17"
   saves: BASELINE_2025_STATS.saves,           // -> 12
   extraInning: "1-2"
   ```
   Como en la temporada 2026-2027 Leones solo ha disputado **1 juego** (derrota 8-0 ante Águilas del Zulia, OCT: 0G-1P), el panel mostraba cifras absurdas (Arriba: 21-5, Abridores: 7-15, etc.). Además, `getWeeklyRecords` retornaba `BASELINE_2025_WEEKS` incondicionalmente, desplegando 11 semanas completas del 2025 en lugar del progreso real de 2026.

---

## 2. Proposed Solution

1. **Cálculo Dinámico y Aislamiento Limpio por Temporada**:
   - En `getLeonesAdvancedStats(season)`:
     - Para `season === 2025`: Preservar la línea base auditada canónica `BASELINE_2025_STATS`.
     - Para `season === 2026` (y temporadas dinámicas):
       - Si no hay juegos disputados aún: retornar contadores en 0 limpios (0G-0P, 0 remontados, 0-0 arriba, 0 terreneadas, 0-0 abridores, 0-0 relevistas, 0 salvados, 0-0 extras, 0-0 ult-10).
       - Si hay juegos disputados en Supabase (`status` in Final, Completed, etc.):
         - Calcular dinámicamente `wins`, `losses`, `homeWins`, `awayWins`, `dayWins`, `nightWins`, `shutouts`, `oneRunWins`, `oneRunLosses`, `daysRecord` y meses (`oct`, `nov`, `dec`).
         - Calcular o inferir decisiones de lanzador: para juego 1 (ZUL 8, CAR 0), el abridor de Leones cargó con la derrota (`starters: "0-1"`, `relievers: "0-0"`, `saves: 0`).
         - Preservar contadores de presión en 0 (`remontados: 0`, `up: "0-0"`, `terreneadas: 0`, `extraInning: "0-0"`).
         - `last10`: Récord real de los últimos hasta 10 juegos (ej. `"0-1"`).

2. **Series Particulares contra los 7 Rivales (Head-to-Head)**:
   - Crear interfaz y servicio `getHeadToHeadRecords(season)`:
     - Itera sobre los 7 rivales de la LVBP (`LVBP_TEAM_IDS` excluyendo 695).
     - Calcula: `rivalId`, `rivalName`, `rivalAbbr`, `rivalLogo`, `gamesPlayed`, `scheduledGames` (8 de regular según calendario oficial), `wins`, `losses`, `record` (`"0G-1P"`), `pct` (`".000"`), `runsFor`, `runsAgainst`, `runDiff`, `homeRecord`, `awayRecord`, `statusText` (`"ZUL lidera 1-0"`, `"Empatada 0-0"`).
   - Renderizar una tarjeta interactiva con cuadrícula de 7 rivales en `leones-stats-tab.tsx` ubicada inmediatamente debajo de la cuadrícula de Estadísticas de Situación.

3. **Desglose Semana a Semana Dinámico 2026-2027**:
   - En `getWeeklyRecords(season)`:
     - Para `season === 2025`: Mantener `BASELINE_2025_WEEKS`.
     - Para `season === 2026`: Generar las 11 semanas del calendario oficial 2026-2027 (Semana 1 activa con 1 juego disputado, 0G-1P, 0 CF, 8 CP, -8 DIF; Semanas 2 a 11 inicializadas con sus fechas oficiales).

---

## 3. Acceptance Criteria

- [ ] En temporada 2026, la pestaña "Leones Stats" NO muestra valores de 2025 (no aparece "Arriba: 21-5", "Abridores: 7-15", etc.).
- [ ] Con 1 juego disputado en 2026 (0-8 vs ZUL):
  - Total Juegos: 1 (0-1)
  - Home Club: 0-0 | Visitante: 0-1
  - Remontados: 0 | Arriba: 0-0 | Terreneadas: 0
  - Abridores: 0-1 | Relevistas: 0-0 | Salvados: 0
  - Extrainning: 0-0 | Ult-10: 0-1
  - OCT: 0G-1P | NOV: 0G-0P | DEC: 0G-0P
  - Martes: 0G-1P | Otros días: 0G-0P
- [ ] Aparece la sección "Series Particulares (Récord vs. Rivales)" con los 7 equipos de la LVBP.
- [ ] En la serie vs Águilas del Zulia muestra: 1 juego jugado, récord 0G-1P, 0 CF, 8 CP, -8 DIF, 7 juegos restantes de los 8 programados.
- [ ] En las series vs los otros 6 rivales muestra: 0 juegos jugados, récord 0G-0P, 8 juegos restantes.
- [ ] La tabla de semanas muestra la estructura de 2026-2027 con Semana 1 reflejando el récord actual.
- [ ] Al seleccionar la temporada 2025, se conservan intactos los datos auditados de la 2025-26.
- [ ] `npm run build` compila con 0 errores de TypeScript y linting.
