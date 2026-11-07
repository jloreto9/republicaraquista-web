# Tareas de Implementación 022: Dobles Juegos y Resiliencia de Standings

- [x] **T001**: Extender interfaces de calendario en `src/types/calendar.ts` con campos para dobles juegos y suspensiones (`isDoubleHeader`, `doubleHeaderGames`, `isPostponed`, `rescheduledToDate`, `note`).
- [x] **T002**: Refactorizar `attachSupabaseResults` en `src/lib/calendar-parser.ts` para indexar múltiples juegos por fecha, evitar sobrescritura en dobles tandas y vincular juegos reprogramados vía `rescheduledFromDate`.
- [x] **T003**: Adaptar `CalendarDayCard` en `src/components/calendar/calendar-day-card.tsx` para renderizar el badge de `DOBLE JUEGO` (con marcadores J1 y J2) y el badge ámbar de `POSPUESTO`.
- [x] **T004**: Adaptar `CalendarEventModal` en `src/components/calendar/calendar-event-modal.tsx` para soportar visualización dual en dobles carteleras y banner de advertencia climática en juegos pospuestos.
- [x] **T005**: Añadir `getGamesForDate` en `src/lib/calendar-service.ts` y auditar `getNextScheduledGame`.
- [x] **T006**: Fortalecer `getStandings` y `getRecentGames` en `src/lib/supabase.ts` con ordenamiento por `game_datetime DESC` y reconciliación reactiva contra MLB Stats API Standings.
- [x] **T007**: Ajustar `getLastGameDetail` en `src/lib/leones-stats-service.ts` para ordenar por `game_datetime DESC, id DESC`.
- [x] **T008**: Actualizar `update_daily.py` en `RepubliCaraquistApp` a ventana deslizante de 3 días (`update_recent_games(days_back=3)`).
- [x] **T009**: Ejecutar pruebas unitarias, verificación de tipos TypeScript (`npm run build`) y demostrar que el jueves 05/11, viernes 06/11 y el récord 10-10 se reflejan impecablemente.
- [x] **T010**: Generar `implementation.md`, realizar commit convencional y preparar integración final.
