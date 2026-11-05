# Tareas de Implementación: Feature 017

- [x] **T001**: Crear archivo de datos canónico de navegación `src/components/layout/nav-data.ts` con las 3 categorías sabermétricas (`En Vivo & Cobertura`, `Temporada & Equipo`, `Laboratorio Sabermétrico`).
- [x] **T002**: Refactorizar `src/components/layout/sidebar.tsx` para renderizar el menú estructurado por categorías con encabezados mono, separadores y tipografía corregida.
- [x] **T003**: Refactorizar `src/components/layout/mobile-nav.tsx` para renderizar las mismas categorías en el drawer móvil.
- [x] **T004**: Actualizar interfaces de TypeScript en `src/types/leones-stats.ts` (`GameMVP` con `type`, `LastGameDetail` con `topBatter` y `topPitcher`).
- [x] **T005**: Actualizar `src/lib/leones-stats-service.ts` para computar de forma balanceada y equitativa `topBatter` y `topPitcher` con Game Score Tango y WPA, asignando el destacado contextual.
- [x] **T006**: Actualizar `src/components/dashboard/tabs/last-game-tab.tsx` con soporte para conmutador interactivo `[ General ]`, `[ Bateo ]`, `[ Pitcheo ]` y título adaptativo (`MVP` en victoria vs `Destacado` en derrota).
- [x] **T007**: Crear el componente `src/components/dashboard/live-hero-game-card.tsx` que muestra el mini Game Center (marcador, linescore, mini diamante B/S/O y curva WPA integrada).
- [x] **T008**: Integrar `LiveHeroGameCard` en `src/app/page.tsx` conectándolo con la data en vivo/reciente del juego de Leones.
- [x] **T009**: Ejecutar build de producción (`npm run build`) y verificar ausencia de errores de tipado o empaquetado.
- [x] **T010**: Generar `implementation.md`, realizar commit convencional y push a `origin/main` en GitHub.
