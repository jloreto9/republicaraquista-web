# Spec 039: Historial de por vida LVBP en el Buscador de Jugadores (`/jugadores`)

**Feature Slug:** `039-player-lvbp-career-stats`  
**Fecha:** 2026-11-26  
**Estado:** Especificado  

---

## 1. Propósito y Contexto

En el Buscador de Jugadores (`/jugadores`), el componente `PlayerGeneralStatsCard` (`src/components/stats/splits/player-general-stats-card.tsx`) actualmente muestra únicamente las temporadas disponibles en Supabase (`2025-26` y `2026-27`). Para peloteros activos o históricos con trayectoria previa en la Liga Venezolana de Béisbol Profesional (LVBP), sus campañas anteriores a 2025 no aparecen en las tablas de Temporada Regular ni de Postemporada, impidiendo consultar sus números completos de por vida en la liga.

Esta especificación define la integración no bloqueante del historial completo LVBP (`sportId=17&leagueId=135`, endpoint `yearByYear` de MLB Stats API) directamente en `PlayerGeneralStatsCard`, fusionándolo de forma determinista con las temporadas de Supabase sin sacrificar la velocidad de carga inicial ni comprometer la precisión de las métricas avanzadas (`wOBA`, `FIP`, `Stats+`) ni los totales de carrera.

---

## 2. Requerimientos Funcionales

- **RF-01 (Cobertura Completa de Carrera LVBP en Temporada Regular y Postemporada):**
  - Integrar las temporadas históricas LVBP (`sportId=17`, `leagueId=135`, `stats=yearByYear`) para `gameType=R` (Temporada Regular) y `gameType=P` (Postemporada) en `PlayerGeneralStatsCard` (bateo y pitcheo), ordenadas de la más reciente a la más antigua.
  - Cuando una temporada ya exista en Supabase (`2025`, `2026`), la fuente canónica será **Supabase** (`source: "supabase"`), conservando todas sus métricas avanzadas (`wOBA`, `AVG+`, `OBP+`, `SLG+`, `OPS+`, `wOBA+`, `wRC+`, `FIP`, `ERA+`, `WHIP+`, `FIP+`) y el desglose de fases de postemporada (`D`, `L`, `F`).
  - Las temporadas históricas provenientes de MLB Stats API (`< 2025`, `source: "mlb_api"`) se anexan únicamente para temporadas ausentes en Supabase.

- **RF-02 (Cálculo Exacto de Tasas Históricas y Tratamiento de Métricas Avanzadas):**
  - Para las filas provenientes de MLB Stats API (`source: "mlb_api"`):
    - Dejar `undefined` (y renderizar como `--` en la tabla) `wOBA`, `FIP` y todos los índices ajustados `Stats+` (`AVG+`, `OBP+`, `SLG+`, `OPS+`, `wOBA+`, `wRC+`, `ERA+`, `WHIP+`, `FIP+`), ya que no existen constantes de liga históricas en Supabase para dichas campañas.
    - Calcular de forma exacta y finita las métricas tradicionales y de tasa desde los conteos brutos y outs exactos:
      - **Bateo:** `AVG`, `OBP`, `SLG`, `OPS`, `ISO`, `BABIP`.
      - **Pitcheo:** `inningsPitched`, `inningsDisplay` (base 3 outs), `ERA`, `WHIP`, `K/9`, `BB/9`, `K/BB`.

- **RF-03 (Temporadas Multi-Equipo dentro de la LVBP):**
  - Si un pelotero disputó una misma temporada LVBP con 2 o más equipos (por ejemplo, Wilfredo Tovar en `2013-14` con Navegantes del Magallanes y Bravos de Margarita):
    - Emitir primero una fila combinada de la temporada (`isCombined: true`, `isTeamSplit: false`, `teamCount: N`, `teamId: 0`, `teamAbbr: "${N}EQ"`, `teamName: "${N}EQ"`, p. ej. `2EQ` o `3EQ`), usando el split combinado oficial de MLB Stats API si está presente o sumando determinísticamente las filas por club.
    - Emitir inmediatamente después las `N` sub-filas individuales por club (`isCombined: false`, `isTeamSplit: true`), renderizadas con indentación visual en `PlayerGeneralStatsCard`.
    - Las sub-filas `isTeamSplit: true` **deben excluirse** del conteo de temporadas y de la suma de totales de carrera para garantizar **cero doble conteo**.
  - Si en una temporada histórica existen 0 filas por club y únicamente el registro agregado en MLB, emitir 1 fila con `teamAbbr: "LVBP"`.

- **RF-04 (Totales de Carrera y Regla Estricta de Métricas Avanzadas):**
  - Actualizar la etiqueta de totales en `PlayerGeneralStatsCard` a:
    - `Total de por vida LVBP (N temp.)` para Temporada Regular, donde `N` cuenta temporadas únicas (excluyendo `isTeamSplit: true`).
    - `Total Postemporada LVBP (N temp.)` para Postemporada, donde `N` cuenta temporadas únicas presentes en postemporada (excluyendo `isTeamSplit: true`).
  - Los totales de carrera (`computeTotalBatting`, `computeTotalPitching`) deben ignorar cualquier fila con `isTeamSplit: true`.
  - Para `wOBA`, `FIP` y cada métrica `Stats+`, el total de carrera debe mostrar `--` (`undefined`) **a menos que el 100% de las filas contabilizadas** tengan valor numérico válido para esa métrica. Si existe al menos una temporada histórica sin `wOBA`/`FIP`/`Stats+`, no se debe mostrar un promedio parcial engañoso.

- **RF-05 (Endpoint API Paralelo, No Bloqueante y Cacheado):**
  - Exponer `GET /api/stats/player-career?player_id=<id>&type=<batter|pitcher>`:
    - Validar `player_id` como entero positivo (`/^\d+$/`); retornar HTTP `400` en español si es inválido.
    - Aceptar `type` (`"batter"` | `"pitcher"`), consultando en paralelo `gameType=R` y `gameType=P` en MLB Stats API con timeout explícito (`AbortSignal.timeout(5000)`).
    - Cachear respuestas en memoria durante 1 hora (3600s) y responder con cabecera `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.
    - En `PlayerGeneralStatsCard`, disparar la petición de forma paralela y no bloqueante tras recibir el perfil base de Supabase, manejando fallos/timeouts de red sin degradar los datos de Supabase ni mostrar errores disruptivos.

---

## 3. Invariantes y Restricciones de Dominio

- **INV-01 (Solo LVBP — `leagueId=135`):** Tanto la consulta a MLB Stats API (`sportId=17&leagueId=135`) como los normalizadores puros deben filtrar estrictamente `Number(s?.league?.id) === 135`, año entero válido `> 1900` y `games > 0`, descartando registros de MLB, Ligas Menores, LIDOM, Serie del Caribe u otras ligas.
- **INV-02 (Prohibición de Statcast):** Cero referencias o badges de Exit Velocity, Launch Angle, Barrels o Sprint Speed (`GEMINI.md` §1.1).
- **INV-03 (Idioma y Tono Deportivo):** Interfaz 100% en español, sin términos como "sabermétrico/a" ni jerga corporativa en títulos o etiquetas.
- **INV-04 (Convención de Temporadas):** La temporada 2025–2026 se almacena y fusiona como `season = 2025`; 2026–2027 como `season = 2026`; 2013–2014 como `season = 2013` (`formatSeason(season)`).
- **INV-05 (Seguridad de Bundle Cliente):** `src/lib/player-career-service.ts` no debe importar módulos exclusivos de servidor (`./supabase` ni `./player-splits-service`) para poder compartirse con el componente `"use client"`.

---

## 4. Criterios de Aceptación

- **CA-01:** Al consultar en `/jugadores` a un pelotero con trayectoria previa a 2025 (ej. Wilfredo Tovar, `playerId` histórico con `2013-14` en `MAG` y `MAR`), la tabla de Temporada Regular muestra sus campañas de Supabase (`2025-26`, `2026-27`) con `wOBA`/`Stats+` completos y todas sus temporadas LVBP `< 2025` con métricas tradicionales/tasas exactas y `--` en `wOBA`/`FIP`/`Stats+`.
- **CA-02:** En temporadas multi-equipo, aparece primero la fila combinada (`2EQ` / `3EQ`) y debajo las sub-filas indentadas por equipo (`isTeamSplit: true`). Los totales de `Total de por vida LVBP (N temp.)` suman exactamente la fila combinada y nunca duplican las sub-filas.
- **CA-03:** Cuando el historial incluye al menos una temporada `< 2025` sin `wOBA`/`FIP`/`Stats+`, la fila de totales muestra `--` en esas columnas; cuando todas las temporadas contabilizadas sí las poseen (p. ej. solo `2025` y `2026` de Supabase), el total muestra el promedio ponderado por `PA` u `outs`.
- **CA-04:** La ruta `/api/stats/player-career` rechaza IDs inválidos con `400`, responde `200` con `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` y filtra estrictamente `leagueId === 135`.
- **CA-05:** Todas las pruebas unitarias en `src/lib/__tests__/player-career.test.ts`, `npx tsc --noEmit`, `eslint` sobre los archivos modificados y `npm run build` pasan sin errores.
