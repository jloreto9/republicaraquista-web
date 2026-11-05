# Plan Técnico de Implementación: Feature 017

## 1. Arquitectura y Archivos Afectados

### A. Navegación y Menú Lateral
- `src/components/layout/nav-data.ts`: Archivo canónico de definición de categorías y rutas (`navigationGroups: NavGroup[]`).
- `src/components/layout/sidebar.tsx`: Renderizado modularizado por categorías con headers mono y divisores.
- `src/components/layout/mobile-nav.tsx`: Drawer móvil consumiendo las mismas categorías.

### B. Mini Game Center Hero en Centro de Mando
- `src/components/dashboard/live-hero-game-card.tsx`: Componente de cliente o servidor que renderiza:
  - Header de estado y estadio.
  - Marcador y linescore resumido (Innings 1..9, R, H, E).
  - Mini Diamond con corredores activos (`first`, `second`, `third`) y conteo (`B`, `S`, `O`).
  - Curva compacta de Win Probability con SVG suave y último porcentaje (`XX% Leones`).
  - Enlace al Game Center.
- `src/app/page.tsx`: Ingesta de datos del juego activo o reciente mediante `getGameCenterData()` o `getCaracasAvailableGames()`, inyectando el Hero card en la vista principal.

### C. Balance Equitativo de MVP (Bateo vs Pitcheo)
- `src/types/leones-stats.ts`:
  - Ampliación de `GameMVP` con campo opcional `type: "batter" | "pitcher"`.
  - Ampliación de `LastGameDetail` con `topBatter?: GameMVP | null` y `topPitcher?: GameMVP | null`.
- `src/lib/leones-stats-service.ts`:
  - En `getLastGameMvp`:
    - Filtrar y ordenar bateadores por WPA ofensivo para extraer `topBatter`.
    - Filtrar lanzadores y evaluar su rendimiento mediante WPA de pitcheo y Game Score v2 de Tom Tango para extraer `topPitcher`.
    - Determinar el destacado general: si hubo victoria y un lanzador lanzó una joya (Game Score >= 60 o WPA alto), se pondera justamente frente al bateador.
    - Asignar `topBatter` y `topPitcher` en el retorno de `LastGameDetail`.
- `src/components/dashboard/tabs/last-game-tab.tsx`:
  - Añadir estado local `selectedView: "mvp" | "batter" | "pitcher"` con selector interactivo de 3 botones.
  - Adaptar el título a `"DESTACADO DE LEONES"` cuando `leonesWon === false`.
  - Renderizar métricas diferenciadas:
    - Bateador: H-AB, HR, CI, WPA Bateo, Clutch.
    - Lanzador: IP, CL, K, BB, WPA Pitcheo, Game Score Tango.

---

## 2. Escalera Ponytail & Principios de Ingeniería
- **Stdlib / Componentes Nativos**: SVG estándar para el diamante y la mini curva sin agregar librerías pesadas nuevas.
- **Fuente de Verdad**: Centralizar `navigationGroups` en un único archivo compartido para evitar divergencias entre desktop y móvil.
- **No romper nada**: `mvp` se mantiene intacto en la firma de `LastGameDetail` para compatibilidad retrospectiva con cualquier componente consumidor.

---

## 3. Plan de Verificación y Rollback
- Compilación de TypeScript: `npm run build`.
- Verificación visual de los 3 componentes:
  - Sidebar con 3 secciones identificadas.
  - Centro de Mando con tarjeta Hero superior completa.
  - Pestaña de Último Juego con toggle interactivo Bateador/Lanzador y título contextual (Victoria vs Derrota).
- Rollback: `git checkout HEAD~1` si surgiera cualquier regresión.
