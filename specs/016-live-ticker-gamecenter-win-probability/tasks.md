# Tareas de Implementación: Ticker Superior en Vivo y Curva WPA en Game Center

**Slug:** `016-live-ticker-gamecenter-win-probability`  
**Fase:** Spec-Kit Paso 3 (Tareas Atómicas)  
**Total de Tareas:** 10  

---

## Desglose de Tareas de Construcción

- [x] **T001 - Tipos & Contratos de Datos:** Crear `src/types/ticker.ts` (`TickerGame`, `TickerResponse`) y extender `src/types/game-center.ts` con `GameCenterWinProbability` y `GameCenterWinProbabilityPoint`.
- [x] **T002 - Servicio de Ticker LVBP:** Implementar `src/lib/ticker-service.ts` con consumo de MLB Stats API (`sportId=17, leagueId=135`), soporte para juegos en vivo, finalizados y programados, y fallback inteligente a la jornada anterior.
- [x] **T003 - Route Handler API `/api/ticker`:** Crear `src/app/api/ticker/route.ts` con control de caché adaptativo para Vercel Edge (`s-maxage=20` si hay juegos en vivo, `s-maxage=300` si la jornada concluyó).
- [x] **T004 - Componente UI `LiveTicker`:** Diseñar `src/components/layout/live-ticker.tsx` con diseño Dark Navy, chips de partidos, badges de estado (`● EN VIVO`, `AYER`, `FINAL`, `HOY`), scroll horizontal responsivo y enlace directo a `/game-center`.
- [x] **T005 - Integración de Ticker en Layout Global:** Montar `<LiveTicker />` en `src/app/layout.tsx` para que esté disponible de forma persistente y no intrusiva sobre las vistas.
- [x] **T006 - Enriquecimiento de WPA en `game-center-service`:** Extender `src/lib/game-center-service.ts` para conectar `processGameWpa(gamePk)` y mapear `winProbability` (probabilidad actual, tendencia y jugada clave con mayor $\Delta\text{WPA}$).
- [x] **T007 - Componente `GameWinProbabilityCard`:** Construir `src/components/game-center/game-win-probability-card.tsx` con gráfica SVG fluida Caracas Navy/Oro `#FDB827`, línea central de 50%, porcentaje en vivo e hito de la jugada cumbre.
- [x] **T008 - Integración en Vista de Game Center:** Incorporar `GameWinProbabilityCard` en `src/components/game-center/game-center-view.tsx` dentro de la pestaña `GameCast`.
- [x] **T009 - Verificación & Compilación Next.js:** Ejecutar `npm run build` en `republicaraquista-web` verificando cero errores de tipos, linting y bundle en Vercel.
- [x] **T010 - Informe de Convergencia:** Documentar los resultados y pruebas en `specs/016-live-ticker-gamecenter-win-probability/implementation.md`.
