# Spec 028: Carrera por los Premios LVBP (Jugador Más Valioso y Pitcher del Año) en Líderes Individuales

**Slug:** `028-awards-mvp-pitcher-tracker`  
**Autor:** Jorge Leonardo Loreto & Antigravity  
**Fecha:** 2026-11-16  
**Estado:** Especificado (Fase 1 de Spec-Kit)  
**Relacionados:** [`src/app/individuales/page.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/individuales/page.tsx) · [`src/components/stats/individuales-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/individuales-view.tsx) · [`src/lib/supabase.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/supabase.ts)

---

## 1. Contexto y Problema

La vista **Líderes Individuales (`/individuales`)** muestra las tablas ordenables de Bateo, Pitcheo, Splits y Fildeo, pero no sintetiza qué jugadores lideran la carrera por los dos galardones individuales principales de la LVBP: **Jugador Más Valioso (Premio "Víctor Davalillo")** y **Pitcher del Año (Premio "Carrao Bracho")**.

Toda la materia prima ya existe o llega en los mismos endpoints de datos:
1. `getBattingStats` entrega conteos ofensivos completos para derivar `wOBA`, `wRAA` y `wRC+` calibrados dinámicamente contra el promedio real de la temporada y fase.
2. `getPitchingStats` consulta `statsapi.mlb.com/api/v1/stats?group=pitching`, pero actualmente solo extrae `gidp`, omitiendo `wins` (`G`), `losses` (`P`), `saves` (`SV`), `gamesStarted` (`JI`) y `hitBatsmen` (`HBP`).
3. `getTeamGamesMap` ya invoca `getStandings`, por lo que puede exponer sin consultas extra el porcentaje de victorias (`teamWinPctMap`) de las 8 franquicias.

---

## 2. Requerimientos Funcionales

### RF-01: Enriquecimiento de Capa de Datos (`src/types/sports.ts`, `src/lib/supabase.ts`, API Routes)
- Añadir `hbp?: number` a `PitchingStats`.
- En `getPitchingStats`, ampliar la lectura de `group=pitching` (`fetchMlbSeasonPitchingMetaMap`) para extraer `gidp`, `wins`, `losses`, `saves`, `gamesStarted` (`JI`) y `hbp`, además de acumular `row.hbp` desde Supabase/`reconciledBoxscoreCache`.
- En `getTeamGamesMap`, devolver `{ teamGamesMap, teamWinPctMap, maxGames }` de manera retrocompatible.
- Elevar el límite por defecto de `/api/stats/batting` y `/api/stats/pitching` a `500` e incluir `teamWinPctMap` en la respuesta JSON.

### RF-02: Motor Híbrido LVBP de Premios (`src/lib/awards-engine.ts`)
- **Entorno dinámico de liga:**
  - Bateo: $\text{lgwOBA}$ ponderado por denominador de $\text{wOBA}$ (`AB + BB + SF + HBP`) y $(R/PA)_{\text{lg}}$ para calcular `wOBA`, `wRAA` y `wRC+`.
  - Pitcheo: $\text{ERA}_{\text{lg}}$ y $cFIP$ real de la liga para calcular `FIP` y `ERA-`.
- **Elegibilidad Invernal:**
  - Jugador Más Valioso: $\ge 3.1\text{ AP}$ por juego del equipo (`round(teamGames * 3.1)`), con relajación progresiva `[2.2, 1.5, 0.5]` si hay $< 5$ calificados.
  - Pitcher del Año: $\ge 0.8\text{ IP}$ por juego del equipo (`round(teamGames * 0.8 * 10) / 10`), con relajación progresiva `[0.6, 0.4, 0.1]` si hay $< 5$ calificados.
- **Ponderación Híbrida (0–100 pts):**
  - **Jugador Más Valioso:** 45 pts Impacto Ofensivo (`wRAA` 25 + `wRC+` 12 + `wOBA` 8) + 40 pts Triple Corona y Producción (`OPS` 10 + `AVG` 8 + `HR` 8 + `CI` 8 + `CA` 4 + `BR netas` 2) + 15 pts Éxito Colectivo (`teamWinPct`).
  - **Pitcher del Año:** 45 pts Prevención y Dominio (`ERA` 20 + `WHIP` 13 + `FIP` 12) + 35 pts Volumen y Ponches (`IP` 15 + `SO` 12 + `K/9` 4 + `K/BB` 4) + 20 pts Decisiones y Éxito Colectivo (`G` 6 + balance `G-P` 4 + `teamWinPct` 10).
- **Insignias de Liderato e Invarianza de Ranking:**
  - Asignar `leaderBadges` (`Líder AVG`, `Líder HR`, `Líder CI`, `Líder OPS`, `Líder wRC+`, `Líder ERA`, `Líder WHIP`, `Líder FIP`, `Líder G`, `Líder SO`, `Líder IP`).
  - Calcular `overallRank` siempre contra toda la LVBP.

### RF-03: Pestaña "Premios" en `/individuales` (`awards-view.tsx`, `individuales-view.tsx`)
- Agregar la pestaña principal **"Premios"** (`activeTab === "awards"`, con soporte `?tab=premios` y `?tab=awards`).
- Cargar el pool completo de la liga (`team_id=all&limit=500`) al cambiar temporada o fase y filtrar por franquicia en memoria, garantizando que "Premios" tenga siempre los 8 equipos y respete el filtro de franquicia preservando `overallRank`.
- Renderizar dos columnas lado a lado (`xl:grid-cols-2`): **Jugador Más Valioso** (izquierda) y **Pitcher del Año** (derecha).
- Cada columna incluye: **Tarjeta Hero del #1** (foto, equipo, puntaje `XX.X PTS`, insignias de liderato, grilla de 8 estadísticas clave, barras de los 3 pilares), **Callout "Referente Caraquista en la Carrera"** (cuando `selectedTeam === "all"` y el #1 no es de Leones `695`), y **Tabla de Perseguidores (#2 al #10)** con botón `⚡ Splits`.

---

## 3. Invariantes y Guardrails Obligatorios

1. **Cero palabras "sabermétrico / sabermétrica / sabermetría"** en toda la UI visible (Lección 3).
2. **Cero métricas Statcast** en LVBP (no Exit Velocity, Launch Angle, Barrels).
3. **Idioma 100% español** deportivo directo y claro.
4. **Sin kicker/eyebrow chips** sobre títulos principales ni tarjetas anidadas excesivas.

---

## 4. Criterios de Aceptación

1. **CA-01:** `calculateMvpRace` y `calculatePitcherOfYearRace` calculan métricas de entorno dinámico, puntajes en rango `[0, 100]`, pilares consistentes y `leaderBadges` verificados por pruebas unitarias.
2. **CA-02:** El umbral invernal de `0.8 IP/J` incluye correctamente abridores de pelota invernal y aplica fallback seguro si hay `< 5` elegibles.
3. **CA-03:** El ranking `overallRank` en LVBP se preserva invariante al filtrar por franquicia y el callout de Leones del Caracas (`695`) muestra al mejor candidato caraquista cuando no ocupa el `#1`.
4. **CA-04:** `npx tsx src/lib/__tests__/awards-engine.test.ts`, `npx eslint` y `npm run build` pasan sin errores ni ocurrencias prohibidas en UI.
