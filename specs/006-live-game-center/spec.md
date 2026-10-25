# Especificación Funcional: Live Game Center & Segunda Pantalla Caraquista (`/game-center`)

## 1. Resumen Ejecutivo y Propósito
El módulo **/game-center** dota a **REPUBLICARAQUISTAPP** de un centro de seguimiento en vivo ("Game Center / Segunda Pantalla") de calibre Grandes Ligas para los fanáticos de los **Leones del Caracas**, alcanzando y superando la experiencia de `fansmagallanes-360.vercel.app/game-center` y de la app oficial de MLB Gameday.

Esta funcionalidad permite al aficionado seguir el juego en tiempo real con:
1. **Hero del Partido & Selector de Juegos**:
   - Detección inmediata del partido en vivo (si se está disputando) o del último encuentro finalizado, con opción de alternar entre los últimos juegos de la temporada.
   - Marcador principal, estatus oficial ("EN VIVO", "FINAL", "PRE-JUEGO"), fecha, hora y sede.
   - Badges de canales de transmisión oficial de TV / Streaming (ByM Sport, BeisbolPlay, 1Baseball, Televen, Venevisión, IVC, etc.) y botón de activación directa del **Circuito Radial en Vivo (La Mega 107.3 FM / Unión Radio)**.
2. **Diamante Interactivo & Conteo en Vivo (GameCast)**:
   - Diamante de béisbol SVG responsivo con iluminación dinámica de bases ocupadas (1B, 2B, 3B) y badges con nombres de los corredores en circulación.
   - Tablero de conteo estilo LED con Bolas (0-4), Strikes (0-3) y Outs (0-3), indicando la entrada activa y mitad (Alta / Baja de la X entrada).
3. **Duelo Actual en el Plato (Matchup)**:
   - Tarjeta cara a cara del bateador en turno vs el lanzador actuante.
   - Fotos oficiales de MLB CDN (`getPlayerHeadshotUrl`), mano de bateo/lanzamiento (Z/D), línea del día en tiempo real (`1-3, HR, 2 RBI` o `4.2 IP, 3 H, 1 ER, 5 K`) y promedios acumulados de la temporada (AVG, OBP, SLG, OPS / ERA, WHIP).
4. **Marcador Entrada por Entrada (Linescore)**:
   - Desglose por entradas 1 a 9+ con anotaciones parciales de ambos clubes.
   - Columnas acumuladas de Carreras (C / R), Imparables (H), Errores (E) y Dejados en Base (LOB).
5. **Jugada a Jugada (Play-by-Play Stream)**:
   - Feed cronológico inverso con cada jugada del encuentro.
   - Badges cromáticos contextuales (Jonrón en Dorado Caraquista `#FDB827`, Hit en Esmeralda, Ponche en Carmesí, Doble Play, Base por Bolas).
   - Traducción y humanización al español de los eventos y descripciones provenientes del feed MLB Stats API.
   - Filtros rápidos de jugadas: "Todas", "Batazos & Jonrones", "Carreras Anotadas", "Ponches / Outs".
6. **Boxscore & Lineups Oficiales**:
   - Orden al bate 1 al 9 de ambos equipos con estadísticas del partido (AB, R, H, 2B, 3B, HR, RBI, BB, SO, AVG).
   - **Regla de Alineación Ofensiva & Jerarquía de Suplentes**:
     - En LVBP y bajo Bateador Designado (DH), los lanzadores utilizados pertenecen únicamente al cuerpo de pitcheo y quedan excluidos de la alineación ofensiva.
     - Todo jugador de posición, incluyendo **corredores emergentes (Pinch Runners - PR)** y **bateadores emergentes (Pinch Hitters - PH)**, permanece listado en la alineación ofensiva aun cuando no haya consumido turnos oficiales al bate (`VB / AB = 0`).
     - **Formato Estándar MLB de Suplentes**: Los jugadores que ingresan como suplentes (PH, PR, o sustitutos defensivos) no se listan como números consecutivos aislados al final; se agrupan ordenadamente debajo del bateador titular al que reemplazaron en su slot al bate (1 a 9), con sangría visual (`pl-5`), prefijo de nota oficial (`a-`, `b-`, `1-`), sin numeración en la columna `#` y fila final de **Totales** colectivos.
   - Registro de lanzadores utilizados (IP, H, R, ER, BB, SO, ERA).
7. **Estadio & Transmisión**:
   - Detalles de la sede (Estadio Monumental Simón Bolívar, Universitario, etc.), capacidad, ciudad y opciones de sintonía en audio y video.
8. **Auto-Refresco Inteligente**:
   - Polling en segundo plano cada 15-20 segundos exclusivamente cuando el estatus es `Live` / `In Progress`, pausándose en partidos finalizados para optimizar ancho de banda.
   - Botón de refresco manual con retroalimentación táctil y spinner.

---

## 2. Definición Técnica de Datos y Fuentes

### 2.1. Fuente Primaria: MLB Stats API Live Feed
- Endpoint: `https://statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live`
- Parámetros clave consumidos:
  - `gameData.status`: `abstractGameState` ('Live', 'Final', 'Preview'), `detailedState` ('In Progress', 'Final', etc.)
  - `gameData.teams`: `away` y `home` (nombres, IDs, records).
  - `gameData.venue`: Nombre del estadio y ciudad.
  - `liveData.linescore`:
    - `currentInning`, `inningHalf`, `isTopInning`, `balls`, `strikes`, `outs`
    - `innings`: arreglo de entradas con carreras, hits y errores por equipo.
    - `teams`: totales de runs, hits, errors, leftOnBase.
    - `offense`: `batter`, `pitcher`, `onFirst`, `onSecond`, `onThird`.
  - `liveData.plays`:
    - `currentPlay`: conteo, resultado, descripción, corredores.
    - `allPlays`: historial completo de eventos del partido.
  - `liveData.boxscore`:
    - Rosters activos y estadísticas acumuladas del juego para bateadores y lanzadores de ambos equipos.

### 2.2. Fuente Secundaria y Persistencia Local: Supabase / Snapshot
- Tabla `games` (temporada 2026): listado de encuentros para poblar el selector de juegos.
- Fallback a snapshots locales en `.cache/` o `src/data/lvbp_season_2026.json` / `2025.json` en caso de latencia externa.

---

## 3. Arquitectura de Componentes de UI

| Componente | Archivo | Responsabilidad |
|---|---|---|
| Main View | `src/components/game-center/game-center-view.tsx` | Orquestador principal, estado del juego activo, tabs y selector de partidos |
| Game Hero Matchup | `src/components/game-center/game-hero-matchup.tsx` | Cabecera del partido con logos, marcador en vivo, estado y badges de TV |
| Interactive Diamond | `src/components/game-center/interactive-diamond.tsx` | Diamante SVG con bases 1B, 2B, 3B interactivas, conteo y bateador/lanzador |
| Live Count Display | `src/components/game-center/live-count.tsx` | Conteo LED de Bolas, Strikes, Outs y mitad de entrada |
| Current Matchup Card | `src/components/game-center/current-matchup-card.tsx` | Tarjeta del duelo en el plato: Bateador vs Lanzador con headshots y métricas |
| Linescore Table | `src/components/game-center/linescore-table.tsx` | Marcador entrada por entrada (1 a 9+) con R, H, E, LOB |
| Play-by-Play Feed | `src/components/game-center/play-by-play-feed.tsx` | Stream cronológico de jugadas con filtros y traducción al español |
| Boxscore Lineups Tab | `src/components/game-center/boxscore-lineups-tab.tsx` | Tablas de bateo 1-9 y pitcheo de ambos equipos |
| Stadium & Broadcast Tab | `src/components/game-center/stadium-broadcast-tab.tsx` | Información de la sede, clima estimado y enlace al reproductor radial |
| API Route | `src/app/api/game-center/route.ts` | Endpoint de agregación que consulta el live feed oficial y formatea la respuesta |
| Página Next.js | `src/app/game-center/page.tsx` | Ruta `/game-center` con Header canónico |

---

## 4. Criterios de Aceptación y Pruebas
1. **Ruta y Navegación**: `/game-center` accesible desde la barra lateral (`sidebar.tsx`) y navegación móvil (`mobile-nav.tsx`) con distintivo de actividad en vivo.
2. **Encabezado Canónico**: Uso estricto de `<Header title="Game Center • En Vivo" subtitle="Segunda Pantalla • Conteo, Corredores, Duelo & Jugada a Jugada" season={activeSeason} />`.
3. **Consistencia Visual**: Tema Dark Navy (`#070B19`), Tarjetas Glassmorphism (`#0D152B`), Acentos dorados Caraquistas (`#FDB827`), tipografías limpias y legibilidad instantánea.
4. **Resiliencia ante Ausencia de Juego en Vivo**: Si en este instante no hay juego en desarrollo, el Game Center muestra el último partido oficial finalizado con toda su riqueza de datos (diamante con última jugada, linescore completo, boxscore y jugada a jugada completa), permitiendo al usuario revivir el encuentro o previsualizar el próximo compromiso.
5. **Cero Dependencias Innecesarias**: Uso de librerías nativas ya instaladas (React, Lucide icons, Tailwind CSS, SVG nativo).
6. **Compilación sin Advertencias**: `npm run build` ejecutado exitosamente sin errores de TypeScript ni linter.
