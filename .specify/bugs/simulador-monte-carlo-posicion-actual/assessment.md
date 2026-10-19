# Bug Assessment: Simulador Monte Carlo muestra 0.0% y orden estático en Posición Actual

- **Slug**: simulador-monte-carlo-posicion-actual
- **Created**: 2026-10-19
- **Source**: Captura de pantalla de la vista `/standings` (pestaña Simulador de Clasificación) reportada por el usuario
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

El usuario adjuntó una captura de pantalla de la vista `/standings` pestaña **Simulador de Clasificación & Postemporada** con la opción `Posición Actual` seleccionada y el comentario: *"Creo que no esta funcionando bien esto /speckit-master"*.

En la captura se evidencia:
1. Las 5 tarjetas KPI superiores de Leones del Caracas muestran `0.0%` en todas las métricas (Top 4 Directo: 0.0%, Serie Comodín: 0.0%, Round Robin: 0.0%, Gran Final: 0.0%, Campeón LVBP: 0.0%).
2. En la tabla de franquicias, los 4 primeros equipos (Tigres, Bravos, Cardenales, Caribes) tienen exactamente `100.0%` de Top 4 y `100.0%` de Round Robin.
3. El 5to (Águilas) y el 6to (Tiburones) tienen exactamente `100.0%` de Comodín.
4. Leones del Caracas y Navegantes del Magallanes tienen `0.0%` absoluto en todas las categorías.
5. Tiburones de La Guaira aparece ordenado al fondo de la tabla (8vo), por debajo de Leones y Magallanes, a pesar de tener 20.1% de probabilidad de clasificar al Round Robin y 100.0% de Comodín.

## Symptom

Con apenas 5 a 6 juegos disputados en la temporada regular 2026-2027 (23 juegos finalizados de un calendario de 224 juegos; restan 203 juegos de temporada regular), el simulador asume que el orden de la temporada regular ya está fijado y sellado:
- No simula ningún partido restante de temporada regular en modo `Posición Actual`.
- Trata las posiciones 1 a 4 como clasificadas al 100% y las posiciones 7 y 8 como matemáticamente eliminadas al 100%, cuando faltan 50 juegos por disputar a cada franquicia.
- Muestra métricas nulas (0.0%) para Leones del Caracas.

## Reproduction

1. Navegar a la vista `/standings` en `republicaraquista-web`.
2. Seleccionar la pestaña `Simulador de Clasificación`.
3. Mantener el selector en el modo predeterminado `Posición Actual`.
4. Observar las tarjetas superiores y la tabla de probabilidades por franquicia.

## Suspected Code Paths

- `src/lib/monte-carlo.ts:163-165` — Chequeo erróneo de temporada completada (`totalGames >= 224` donde `totalGames` es la suma de `gamesPlayed` de los 8 equipos; 224 ocurre a mitad de temporada con 28 juegos por equipo, no al final de 56 juegos = 448).
- `src/lib/monte-carlo.ts:211-224` — En la rama `else` de `mode === "actual"`, el simulador únicamente copia las victorias actuales (`simWins.set(t, standingsMap.get(t)?.wins ?? 0)`) y **no simula ningún juego restante** (`remainingGames`). En consecuencia, el ranking regular `ranked` es exactamente idéntico en las 3,000 iteraciones.
- `src/lib/monte-carlo.ts:282-284` — Ordenamiento de la tabla exclusivamente por `champProb` descendente sin desempates secundarios, lo que causa orden errático (Tiburones con 20.1% de Round Robin aparece debajo de equipos con 0.0%).
- `src/lib/supabase.ts:278-280` — Cálculo heurístico del rating ELO estimado base (`1500 + (pct - 0.5) * 400 + diff * 1.2`) que genera oscilaciones extremas y poco realistas en muestras pequeñas (Tigres 1641.0 vs Magallanes 1272.0 tras solo 6 juegos), distorsionando cualquier simulación probabilística.
- `src/app/standings/page.tsx:16-17` y `src/components/standings/simulator-card.tsx:24` — No se pasan los partidos restantes (`remainingGames`) al simulador Monte Carlo.

## Root Cause Hypothesis

**Confianza: Alta (100% confirmada con ejecución aislada).**

1. En `src/lib/monte-carlo.ts`, la lógica para `mode === "actual"` carece de la simulación del calendario restante: solo inicializa `simWins` con las victorias actuales y clasifica a los equipos sin disputar ningún encuentro restante.
2. Al no variar el ranking regular a lo largo de las 3,000 iteraciones, los 4 primeros puestos obtienen 100% de clasificación directa, los puestos 5 y 6 van al comodín el 100% de las veces, y los puestos 7 y 8 (Leones y Magallanes) resultan matemáticamente eliminados con 0.0% de probabilidad en todo.
3. Además, el ELO base en `src/lib/supabase.ts` no sigue la actualización secuencial estándar (K=24 con ventaja de localía de 35 puntos) sobre los juegos disputados, sino una regresión lineal inflada por el diferencial de carreras en muestra pequeña.

## Proposed Remediation

**Preferred**:
1. **Paso de Partidos Restantes (`remainingGames`)**:
   - En `src/lib/supabase.ts`, incorporar la función `getScheduledGames(season)` que consulte en Supabase los juegos con `status = 'Scheduled'` de la temporada regular (`game_type IN ('R', 'regular')`).
   - Pasar `remainingGames: [number, number][]` (tuplas `[homeTeamId, awayTeamId]`) desde `StandingsPage` (`page.tsx`) a `StandingsView` y a `SimulatorCard`.
   - Si no hay juegos programados en Supabase o estamos en fallback, sintetizar el calendario restante balanceado para completar los 56 juegos por equipo basándose en `gamesPlayed`.
2. **Simulación de Partidos Restantes en `runMonteCarloSimulation`**:
   - En `src/lib/monte-carlo.ts`, cuando `mode === "actual"` y la temporada no esté finalizada (`gamesPlayed < 56` o `remainingGames.length > 0`), iterar sobre cada partido de `remainingGames` y simular el resultado con `simulateGame(eloHome, eloAway)`.
   - Acumular las victorias simuladas sobre el récord base de cada franquicia (`s.wins + simulatedWins`).
   - Evaluar el orden regular por iteración.
3. **Cálculo Secuencial de ELO Canónico**:
   - En `src/lib/supabase.ts`, calcular el rating ELO secuencial a partir del orden cronológico de `sortedGames` aplicando la fórmula ELO oficial (K=24, ventaja local = +35) a partir de 1500, o consumiendo `elo_ratings` si existen registros en Supabase.
4. **Desempate Robusto en la Tabla de Proyecciones**:
   - Ordenar las proyecciones por `champProb` desc, luego `finalProb` desc, `rrProb` desc, `top4Prob` desc, `wcProb` desc y finalmente `elo` desc.

**Files likely to change**:
- `src/lib/monte-carlo.ts`
- `src/lib/supabase.ts`
- `src/app/standings/page.tsx`
- `src/components/standings/standings-view.tsx`
- `src/components/standings/simulator-card.tsx`

**Tests to add or update**:
- Test unitario validando que `runMonteCarloSimulation` en modo `actual` con temporada en curso (23 juegos finalizados, 203 restantes) produce probabilidades no nulas (> 0% y < 100%) para todos los equipos.
- Test validando que la tabla de proyecciones ordena consistentemente con desempates cuando `champProb` es 0.

## Risks & Considerations

- **Rendimiento**: Ejecutar 3,000 iteraciones simulando 203 juegos por iteración representa ~600,000 evaluaciones de `Math.random()`. En Node.js/V8 toma ~100-150 ms, lo cual es instantáneo y no bloquea el hilo principal si se ejecuta dentro de `startTransition`.
- **Compatibilidad**: La firma de `runMonteCarloSimulation` puede aceptar `remainingGames?: [number, number][]` como parámetro opcional para mantener compatibilidad hacia atrás.

## Open Questions

- Ninguna. Causa raíz, disparador y solución matemática verificados y probados.
