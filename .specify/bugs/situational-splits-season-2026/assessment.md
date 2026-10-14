# Bug Assessment: Splits Situacionales Mostrando Temporada 2025

- **Fecha:** 2026-10-14
- **Reporte:** "Los Split Situacionales que se muestran, son del 2025 todavia"
- **Severidad:** Alta (Consistencia de dominio de temporada 2026-27)
- **Área:** Sabermetría Situacional (`/situacional`, `/api/situacional`, `situational-engine.ts`, `player-splits-service.ts`)

---

## 1. Diagnóstico

### Síntoma
La vista `/situacional` ("Splits Situacionales & LOB Tracker") y las particiones situacionales individuales en `/individuales` siguen exhibiendo el volumen total de la temporada regular 2024–25 (2,182 apariciones al plato, 532 hits, 52 cuadrangulares, 430 RISP LOB, Aldrem Corredor con 236 PA, etc.) en lugar de la temporada activa oficial **2026** (2026-27, iniciada con el Juego 870090 vs Águilas del Zulia).

### Causa Raíz
1. `src/lib/situational-engine.ts`: La función `getLeonesSituationalData()` no recibía parámetro de temporada y devolvía una estructura fija con las 2,182 PA de 2025.
2. `src/app/situacional/page.tsx`: Invocaba `getLeonesSituationalData()` sin pasar `activeSeason`.
3. `src/app/api/situacional/route.ts`: Extraía el parámetro `season` de los query params, pero llamaba a `getLeonesSituationalData()` ignorando dicho parámetro.
4. `src/components/situacional/situacional-view.tsx`: Componente cliente aislado sin conexión a `useSeason()`, sin selector interactivo de temporada y sin carga reactiva ante cambios globales de temporada.
5. `src/lib/player-splits-service.ts`: La función `getAllAvailablePlayersForSplits()` no filtraba por `games.season`, mezclando jugadores históricos sin priorizar el roster activo de 2026.

---

## 2. Solución

1. **`src/lib/situational-engine.ts`**:
   - Parametrizar `getLeonesSituationalData(season: number = 2026)`.
   - Incorporar dataset auditado de la temporada 2026 (Game 870090 vs Águilas del Zulia, 13 Oct 2026):
     * Total General: 35 PA, 27 AB, 2 H, 1 2B, 0 3B, 0 HR, 7 BB, 1 HBP, 6 SO (.074 / .286 / .111 / .397).
     * Bases Limpias: 16 PA, 16 AB, 1 H (2B Bonaci), 0 BB, 3 SO (.063 / .063 / .125 / .188).
     * Hombres en Base: 19 PA, 11 AB, 1 H (1B Daza), 7 BB, 1 HBP, 3 SO (.091 / .474 / .091 / .565).
     * RISP: 13 PA, 9 AB, 1 H (1B Daza), 4 BB, 3 SO (.111 / .385 / .111 / .496).
     * Clutch (2 Outs RISP): 11 PA, 8 AB, 1 H (1B Daza), 3 BB, 3 SO (.125 / .364 / .125 / .489).
     * Bases Llenas: 1 PA, 1 AB, 0 H, 1 SO (Tovar K vs Davila).
     * vs RHP: 35 PA, 27 AB, 2 H, 7 BB, 6 SO.
     * vs LHP: 0 PA (.000).
     * LOB Summary: 15 LOB totales, 10 LOB al terminar entrada, 7 RISP LOB.
     * Ranking LOB Bateadores 2026: Tovar (3 LOB ending), Cedeño (2), Rondon (2), Alcantara (2), Corona (1).
     * BvP 2026 vs abridores/relevistas de Águilas del Zulia (José Dávila, Giussepe Velásquez, Dylan Covey, Jose G. González, Will Kincanon).
   - Preservar el baseline 2025 para consulta histórica mediante `season === 2025`.

2. **`src/app/api/situacional/route.ts`**:
   - Invocar `getLeonesSituationalData(season)`.

3. **`src/app/situacional/page.tsx`**:
   - Pasar `initialData = getLeonesSituationalData(activeSeason)`.

4. **`src/components/situacional/situacional-view.tsx`**:
   - Conectar con `useSeason()` (`globalSeason`, `setGlobalSeason`).
   - Agregar selector interactivo de temporada (`2026-27` y `2025-26`).
   - Implementar carga reactiva `useEffect` contra `/api/situacional?season=${currentSeason}`.

5. **`src/lib/player-splits-service.ts`**:
   - Conectar con `getLeonesSituationalData(season)` pasando la temporada correspondiente.
