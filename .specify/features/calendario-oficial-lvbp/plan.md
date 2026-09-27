# Implementation Plan: Calendario Oficial LVBP 2026-2027

## Technical Context
- **Framework**: Next.js 16.3.6 (App Router), React 19.2.8, Tailwind CSS v4, Lucide React.
- **Data Source**: Feed `.ics` en `https://raw.githubusercontent.com/jloreto9/calendario-republica-caraquista/main/calendario/calendario_republica_caraquista.ics`.
- **Cache Strategy**: ISR vía `next: { revalidate: 3600 }` en `/api/calendar` con fallback estático offline en `src/data/calendar_2026_27.json`.
- **Database**: Supabase PostgreSQL (`games`) para cruce de resultados en vivo.

## Constitution Check
- No romper nada: Adición modular sin alterar contratos existentes de estadísticas o standings.
- Fuente de verdad: Mapeo de equipos desde `src/lib/constants.ts` (`LVBP_TEAMS`).
- Cero Statcast en LVBP: Mantenido.
- Cero jerga corporativa: Mantenido.

## Architecture & File Layout
1. `src/types/calendar.ts`: Interfaces de tipado TypeScript para los eventos de calendario.
2. `src/lib/calendar-parser.ts`: Parser VCALENDAR/VEVENT y cruce con Supabase.
3. `src/data/calendar_2026_27.json`: Snapshot de respaldo offline de los 56 juegos.
4. `src/app/api/calendar/route.ts`: Endpoint GET con ISR de 1 hora.
5. `src/components/calendar/calendar-view.tsx`: Contenedor principal con selector de meses y filtros.
6. `src/components/calendar/calendar-grid.tsx`: Cuadrícula 7xN de días de la semana (Lunes a Domingo).
7. `src/components/calendar/calendar-day-card.tsx`: Tarjeta interactiva (blanco casa / dorado visita).
8. `src/components/calendar/calendar-subscribe-bar.tsx`: Botones Google Calendar, Apple Calendar (webcal), y .ics.
9. `src/components/calendar/calendar-event-modal.tsx`: Diálogo de detalle del juego.
10. `src/app/calendario/page.tsx`: Ruta oficial `/calendario`.
11. `src/components/layout/sidebar.tsx` & `src/components/layout/mobile-nav.tsx`: 3ra posición del menú.
