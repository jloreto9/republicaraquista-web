# Tareas de Implementación: Live Game Center & Segunda Pantalla (`/game-center`)

- [x] **Tarea 1: Tipos y Contratos TypeScript**
  - Crear `src/types/game-center.ts` con interfaces para el juego, líneas de anotación, conteo, bases, duelo bateador/lanzador, feed de jugadas y boxscore.

- [x] **Tarea 2: Servicio de Datos de Game Center**
  - Crear `src/lib/game-center-service.ts` para consumir el feed oficial de MLB Stats API (`https://statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live`), traducir eventos y descripciones al español, y extraer estadísticas de jugadores y líneas del partido.

- [x] **Tarea 3: Endpoint de API**
  - Crear `src/app/api/game-center/route.ts` que reciba `gamePk` y `season`, consulte los partidos disponibles de Leones del Caracas en Supabase y entregue el payload optimizado del Game Center.

- [x] **Tarea 4: Componentes de Visualización GameCast**
  - [x] 4.1. `src/components/game-center/live-count.tsx`: Conteo LED de Bolas, Strikes y Outs con indicador de entrada.
  - [x] 4.2. `src/components/game-center/interactive-diamond.tsx`: Diamante SVG responsivo con bases 1B, 2B, 3B iluminadas, corredores, bateador y lanzador.
  - [x] 4.3. `src/components/game-center/current-matchup-card.tsx`: Tarjeta de duelo en el plato con fotos CDN de MLB y métricas del día y temporada.
  - [x] 4.4. `src/components/game-center/linescore-table.tsx`: Tabla de marcador entrada por entrada (1 a 9+) con R, H, E, LOB.
  - [x] 4.5. `src/components/game-center/play-by-play-feed.tsx`: Stream de jugadas con filtros (Todas, Hits/HR, Carreras, Outs) y badges visuales.
  - [x] 4.6. `src/components/game-center/boxscore-lineups-tab.tsx`: Boxscore oficial con alineaciones 1 al 9 y pitcheo de ambos conjuntos.
  - [x] 4.7. `src/components/game-center/stadium-broadcast-tab.tsx`: Pestaña de estadio, transmisiones de TV y botón para activar Circuito Radial.
  - [x] 4.8. `src/components/game-center/game-hero-matchup.tsx`: Tarjeta superior con marcador en vivo, logos oficiales y selector de partidos.
  - [x] 4.9. `src/components/game-center/game-center-view.tsx`: Orquestador principal de la vista con pestañas y polling inteligente cada 15-20s.

- [x] **Tarea 5: Página de Ruta `/game-center`**
  - Crear `src/app/game-center/page.tsx` integrando el `<Header />` canónico de la aplicación.

- [x] **Tarea 6: Enlace en Navegación (Sidebar & Mobile Nav)**
  - Añadir enlace a `/game-center` en `src/components/layout/sidebar.tsx` y `src/components/layout/mobile-nav.tsx` con icono de transmisión y badge "LIVE".

- [x] **Tarea 7: Validación y Compilación**
  - Ejecutar `npm run build` para asegurar compilación limpia sin errores de tipos ni advertencias.

- [x] **Tarea 8: Entrega y Despliegue en Vercel**
  - Commit con mensaje semántico, merge a `main` y `git push origin main` para actualización en Edge de Vercel.
