# Plan Técnico: Live Game Center & Segunda Pantalla Caraquista (`/game-center`)

## 1. Arquitectura Técnica y Flujo de Datos

```
[Usuario /game-center]
       │
       ▼
[GameCenterView (Client Component)]
       │
       ├──► SWR / React Fetch cada 15s (si el juego está Live) o bajo demanda
       │         │
       │         ▼
       │   [/api/game-center?gamePk={id}&season={season}]
       │         │
       │         ├──► Consulta juegos disputados/en curso en Supabase (games table)
       │         │
       │         └──► MLB Stats API Live Feed:
       │              https://statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live
       │
       ▼
[Renderizado React 19 / Tailwind CSS v4]
 ├── Hero Matchup con Marcador, TV Badges & Acceso a Radio en Vivo
 ├── Selector de Juegos Recientes
 ├── Tab 1: GameCast
 │    ├── Diamante SVG Interactivo (1B, 2B, 3B, Corredores, Bateador y Lanzador)
 │    ├── Conteo LED (B-S-O) & Entrada
 │    ├── Duelo Actual (Batter vs Pitcher con Headshots y Estadísticas)
 │    ├── Marcador Entrada por Entrada (Linescore R-H-E-LOB)
 │    └── Stream Jugada a Jugada (PBP) con traducción al español y filtros
 ├── Tab 2: Boxscore & Lineups (Órdenes al bate 1-9 y relevistas de ambos equipos)
 └── Tab 3: Estadio & Transmisiones (Sede, detalles y reproductor radial)
```

---

## 2. Definición de Tipos TypeScript (`src/types/game-center.ts`)
- `GameCenterData`: Interfaz global con todo el payload del partido.
- `GameCenterTeam`: Nombre, abreviatura, logo, ID, score, hits, errors, lob.
- `GameCenterLinescore`: Inning parciales y totales.
- `GameCenterCount`: `balls`, `strikes`, `outs`, `inning`, `inningHalf`, `isTopInning`.
- `GameCenterBases`: `first`, `second`, `third` (cada uno con boolean y nombre de corredor).
- `GameCenterPlayerMatchup`: ID, nombre, headshot, mano (Z/D), stats del día y temporada.
- `GameCenterPlay`: Inning, half, descripción en español, tipo de evento, badge, hora/momento, marcador resultante.
- `GameCenterBoxscorePlayer`: Número, nombre, posición, AB, R, H, 2B, 3B, HR, RBI, BB, SO, AVG / IP, H, R, ER, BB, SO, ERA.

---

## 3. Plan de Implementación por Fases

### Fase 1: Capa de Datos y Tipos
1. Crear `src/types/game-center.ts` con todos los contratos de interfaz.
2. Crear `src/lib/game-center-service.ts` con lógica de traducción de eventos al español, extracción del feed oficial de MLB Stats API y fallback a Supabase.
3. Crear endpoint `src/app/api/game-center/route.ts` con manejo de caché y revalidación.

### Fase 2: Componentes UI del Game Center
1. `src/components/game-center/live-count.tsx`: Indicadores LED de Bolas (azul/verde), Strikes (ámbar/rojo) y Outs (rojo) con tipografía mono.
2. `src/components/game-center/interactive-diamond.tsx`: Campo y diamante de béisbol en SVG vectorial de alto contraste (#070B19 / #1E2B4D / #FDB827) con bases iluminadas e identificación de corredores.
3. `src/components/game-center/current-matchup-card.tsx`: Comparativa frente a frente entre bateador y lanzador en turno con fotos de MLB CDN y líneas estadísticas.
4. `src/components/game-center/linescore-table.tsx`: Tabla compacta y deslizable entrada por entrada (1-9+) con totales R-H-E-LOB.
5. `src/components/game-center/play-by-play-feed.tsx`: Historial de jugadas con badges llamativos (HR, Hit, Carrera, Ponche, Doble Play) y filtro de eventos.
6. `src/components/game-center/boxscore-lineups-tab.tsx`: Desglose del boxscore ofensivo y defensivo de ambos equipos.
7. `src/components/game-center/stadium-broadcast-tab.tsx`: Información del parque y canales de TV / Radio.
8. `src/components/game-center/game-hero-matchup.tsx`: Tarjeta superior con marcador en vivo, logos oficiales y estado del partido.
9. `src/components/game-center/game-center-view.tsx`: Orquestador principal de la vista con pestañas y polling inteligente.

### Fase 3: Integración de Rutas y Navegación
1. Crear `src/app/game-center/page.tsx` con Header canónico y llamada al Game Center.
2. Enlazar `/game-center` en `src/components/layout/sidebar.tsx` y `src/components/layout/mobile-nav.tsx` con icono de transmisión en vivo y badge "LIVE".

### Fase 4: Verificación, Build y Despliegue
1. Verificar compilación completa con `npm run build` (Turbopack).
2. Probar escenarios: juego activo, juego finalizado y pre-juego.
3. Commit de entrega y merge a `main`, seguido de `git push origin main` para actualización en producción de Vercel.
