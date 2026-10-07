# Tasks: Calendario Oficial LVBP 2026-2027

## Phase 1: Setup & Data Foundation
- [ ] T001 [P] Crear tipos e interfaces de TypeScript para eventos y partidos en `src/types/calendar.ts`
- [ ] T002 [P] Crear parser de feed .ics con soporte para horas, rivales y canales de TV en `src/lib/calendar-parser.ts`
- [ ] T003 [P] Generar snapshot JSON offline de respaldo de los 56 juegos de la temporada en `src/data/calendar_2026_27.json`
- [ ] T004 Añadir constantes de suscripción (Google Calendar cid, Apple webcal, URLs oficiales) en `src/lib/constants.ts`

## Phase 2: API & Data Layer
- [ ] T005 Crear API route `/api/calendar` con revalidación ISR de 1 hora y cruce con Supabase en `src/app/api/calendar/route.ts`

## Phase 3: User Story 1 & 2 - Vista de Cuadrícula Mensual y Tarjetas (P1)
- [ ] T006 [P] [US1] Implementar tarjeta de día de juego con estilos blanco (casa) y dorado (visita) en `src/components/calendar/calendar-day-card.tsx`
- [ ] T007 [US1] Implementar cuadrícula mensual estructurada Lun-Dom con celdas de descanso y juego en `src/components/calendar/calendar-grid.tsx`
- [ ] T008 [US1] Implementar barra de suscripción (Google Calendar, Apple Calendar webcal, .ics) en `src/components/calendar/calendar-subscribe-bar.tsx`
- [ ] T009 [US1] Implementar modal de detalle de partido (estadio, hora, canal, serie, botón Matchup) en `src/components/calendar/calendar-event-modal.tsx`
- [ ] T010 [US1] Implementar vista contenedora con selector de meses (Oct/Nov/Dic) y filtros en `src/components/calendar/calendar-view.tsx`

## Phase 4: User Story 3 & 4 - Página y Navegación (P1)
- [ ] T011 [US3] Crear página principal de la vista en `src/app/calendario/page.tsx`
- [ ] T012 [P] [US3] Actualizar navegación de escritorio con Calendario en la 3ra posición en `src/components/layout/sidebar.tsx`
- [ ] T013 [P] [US3] Actualizar navegación móvil (drawer y barra inferior) con Calendario en la 3ra posición en `src/components/layout/mobile-nav.tsx`

## Phase 5: Verification & Polish
- [X] T014 Ejecutar `npm run lint` y verificar que no existan advertencias ni errores
- [X] T015 Ejecutar `npm run build` y certificar compilación limpia de Next.js

## Phase 6: User Story 6 - Logos Oficiales de Canales y Plataformas (P1)
- [X] T016 [P] [US6] Descargar y optimizar logos transparentes PNG/WebP en `public/assets/channels/` (Televen, Venevisión, Meridiano, IVC, ByM Sport, 1Baseball, BeisbolPlay, YouTube, SimpleTV)
- [X] T017 [P] [US6] Actualizar catálogo `CHANNELS` con paths de logos locales y metadatos en `src/components/calendar/channel-logo.tsx`
- [X] T018 [US6] Integrar renderizado de logos oficiales en `ChannelLogo` con Next.js Image y fallback a SVG en `src/components/calendar/channel-logo.tsx`
- [X] T019 [US6] Adaptar `ChannelIconStack` en `CalendarDayCard` con contenedores Dark Navy circulares y tooltips en `src/components/calendar/calendar-day-card.tsx`
- [X] T020 [US6] Adaptar `ChannelBadgeCard` en `CalendarEventModal` con grid de logos oficiales enriquecidos en `src/components/calendar/calendar-event-modal.tsx`
- [X] T021 [US6] Validar lint, type-check y build de Next.js en production mode

