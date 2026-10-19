# Bug Assessment: Métricas Situacionales (Remontados, Arriba, Terreneadas, Decisiones) en Leones Stats fijadas en 0

- **Slug**: leones-stats-remontados-arriba
- **Created**: 2026-10-19
- **Source**: Reporte del usuario: *"Entiendo que no estan funcionando bien (en Leones Stats) lo de Remontados, Arriba porque creo que se gano uno yendo arriba y la de ayer fue remontada si no me equivoco"*
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

El usuario reporta que en la pestaña **Leones Stats** del Centro de Mando, los contadores de **Remontados** y **Arriba** no reflejan la realidad de la temporada 2026-2027:
- Señala que Leones ganó un partido llegando con ventaja al 7mo inning ("Arriba: 1-0").
- Señala que en el juego de ayer (18/10/2026 vs Caribes) Leones remontó el partido ("Remontados: 1").

## Symptom

En la tarjeta de Situaciones de Presión y Decisiones de la pestaña Leones Stats (`/` Centro de Mando):
- `Remontados` muestra `0` (en vez de `1`).
- `Arriba` muestra `0-0` (en vez de `1-0`).
- `Abridores` muestra `0-4` (en vez de `0-2`).
- `Relevistas` muestra `2-0` (en vez de `2-2`).
- `Terreneadas` y `Salvados` están fijos en 0 por omisión de extracción.

## Reproduction

1. Ingresar a `https://republicaraquistapp.vercel.app/` en la pestaña predeterminada o seleccionar la pestaña **Leones Stats**.
2. Observar la sección **Situaciones de Presión y Decisiones**:
   - Remontados: `0`
   - Arriba: `0-0`
   - Abridores: `0-4`
   - Relevistas: `2-0`

## Suspected Code Paths

- `src/lib/leones-stats-service.ts:281-304`:
  ```typescript
  // Para la temporada 2026-2027 en curso (1 juego disputado, derrota del abridor)
  const starterLosses = losses;
  const starterWins = 0;
  const relieverWins = wins;
  const relieverLosses = 0;
  ...
  remontados: 0,
  up: "0-0",
  terreneadas: 0,
  starters: `${starterWins}-${starterLosses}`,
  relievers: `${relieverWins}-${relieverLosses}`,
  saves: 0,
  ```
  La función `getLeonesAdvancedStats(season)` asignaba valores hardcodeados (`remontados: 0`, `up: "0-0"`, `terreneadas: 0`, etc.) bajo el supuesto inicial de que solo se había disputado un juego.

## Root Cause Hypothesis

**Confianza: Alta (100% verificada).**
En `src/lib/leones-stats-service.ts`, los campos situacionales de presión (`remontados`, `up`, `terreneadas`, `starters`, `relievers`, `saves`) no se calculaban dinámicamente a partir de los linescores y decisiones de los partidos disputados. En su lugar, se dejaron valores iniciales fijos `0` y `"0-0"` introducidos en el kickoff de la temporada.

Al auditar los feeds oficiales de MLB Stats API para los 6 juegos disputados en 2026:
- **Juego 870093 (14/10 vs Zulia)**: Leones ganaba 9-1 tras 6 innings completos (`ledAfter6 = true`) y ganó 9-4. Por ende, **Arriba = 1-0**.
- **Juego 870083 (18/10 vs Caribes - ayer)**: Leones perdía 2-4 tras 6 innings completos (`trailedAfter6 = true`) y remontó en los innings finales para ganar 8-4. Por ende, **Remontados = 1**.
- **Decisiones de pitcheo**:
  - Abridores: 0 victorias, 2 derrotas (`0-2`, Touki Toussaint y Zak Kent).
  - Relevistas: 2 victorias, 2 derrotas (`2-2`, victorias de Wilkel Hernández y Norwith Gudiño; derrotas de Joan González y Mikell Manzano).
  - Salvados: 0.

## Proposed Remediation

1. En `src/lib/leones-stats-service.ts`, conectar `getLeonesAdvancedStats` con `fetchGameLiveFeed` (de `src/lib/game-feed-service.ts`) para los juegos disputados por Leones.
2. Extraer por cada juego:
   - Carreras acumuladas al término del 6to inning (`runsLeo6` vs `runsOpp6`).
   - Banderas `ledAfter6` y `trailedAfter6`.
   - Decisiones oficiales (`winnerId`, `loserId`, `saveId`) cruzadas contra el abridor y los relevistas del boxscore de Leones.
   - Detección de terreneadas (walk-off wins en home en 9na o extrainnings).
3. Acumular y calcular métricas reales:
   - `remontados`: Total de juegos ganados donde `trailedAfter6 === true`.
   - `up`: `${arribaWins}-${arribaLosses}` donde `ledAfter6 === true`.
   - `terreneadas`: Total de juegos ganados dejando al rival en el terreno.
   - `starters`: `${starterWins}-${starterLosses}`.
   - `relievers`: `${relieverWins}-${relieverLosses}`.
   - `saves`: Total de juegos con salvado acreditado a un lanzador de Leones.

## Files likely to change

- `src/lib/leones-stats-service.ts`
- `scripts/test_leones_stats.mjs`

## Tests to add or update

- Test automatizado que invoque `getLeonesAdvancedStats(2026)` y compruebe que `remontados === 1`, `up === "1-0"`, `starters === "0-2"` y `relievers === "2-2"`.
