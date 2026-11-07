# Spec 022: Manejo de Excepciones para Dobles Juegos, Juegos Suspendidos/Pospuestos y Resiliencia de Standings

## 1. Contexto y Problema

El jueves 5 de noviembre de 2026, el encuentro oficial entre Bravos de Margarita y Leones del Caracas en el Estadio Monumental Simón Bolívar fue suspendido por lluvia (`detailedState: "Postponed", reason: "Rain"`). La LVBP y MLB Stats API reprogramaron dicho juego para disputarse como el Juego 2 de una doble cartelera al día siguiente, viernes 6 de noviembre de 2026.

El viernes 6 de noviembre se disputaron exitosamente ambos compromisos:
- **Juego 1 (gamePk: 870017)**: Bravos de Margarita 2 @ Leones del Caracas 10 (Final).
- **Juego 2 (gamePk: 870020 - Makeup del 05/11)**: Bravos de Margarita 2 @ Leones del Caracas 4 (Final).

### Defectos Detectados en Producción (republicaraquista-web en Vercel):
1. **Sobrescritura en Dobles Juegos**: En `src/lib/calendar-parser.ts`, la clave del mapa de resultados de MLB Stats API usaba exclusivamente `${targetDate}-${oppId}-${isHome ? "H" : "A"}`. Al procesarse dos juegos en la misma fecha contra el mismo rival y condición de sede, el Juego 2 (4-2) sobrescribía al Juego 1 (10-2), borrando el primer resultado de la memoria.
2. **Omisión de Juegos Pospuestos en el Calendario**: Para el juego del jueves 05/11 (gamePk 870020), MLB Stats API mutó su `officialDate` a `2026-11-06`. Al extraer `targetDate = g.officialDate || ...`, la fecha objetivo se desplazó al 6 de noviembre, dejando al 5 de noviembre sin coincidencia (`undefined`). Además, `attachSupabaseResults` solo registraba juegos con `isCompleted: true`, descartando completamente el estado `Postponed` / `Suspended`. Como consecuencia, la celda del jueves 05/11 se renderizaba como si el juego estuviera pendiente a las "7:00 PM", sin alertar de la suspensión ni enlazar a su resultado posterior.
3. **Standings y Récord Desactualizados**: El Centro de Mando calculaba los standings únicamente leyendo la tabla `games` de Supabase. Debido a los retrasos habituales en los crons programados de GitHub Actions en cuentas gratuitas (`update_data.yml`), los juegos del viernes permanecían en estado `Scheduled`, manteniendo a Leones en 8-10 en lugar de su récord real de 10-10 (.500, Racha W3). Tampoco existía una reconciliación reactiva en tiempo real con el endpoint oficial de standings de MLB Stats API.
4. **Fragilidad en el Script de Ingesta Diaria (`update_daily.py`)**: `update_yesterdays_games()` consultaba únicamente `yesterday = today - 1 día`. Si un cron fallaba o se demoraba más de 24 horas, o si un juego suspendido hace 2 días era completado, el registro histórico quedaba desfasado sin capacidad de auto-recuperación.

---

## 2. Requerimientos Funcionales

### RF-01: Modelo de Datos para Dobles Juegos y Suspensiones
- Extender `CalendarGameResult` en `src/types/calendar.ts` con propiedades opcionales:
  - `isPostponed?: boolean`
  - `isSuspended?: boolean`
  - `postponedReason?: string`
  - `rescheduledToDate?: string`
  - `rescheduledFromDate?: string`
  - `isDoubleHeader?: boolean`
  - `gameNumber?: number`
  - `note?: string`
- Extender `CalendarGameEvent` con soporte para múltiples juegos en una misma fecha:
  - `isDoubleHeader?: boolean`
  - `doubleHeaderGames?: Array<{ gamePk: number; gameNumber: number; timeDisplay?: string; result: CalendarGameResult }>`

### RF-02: Normalización y Enriquecimiento de Resultados (`calendar-parser.ts`)
- En `attachSupabaseResults`:
  - Indexar los juegos de MLB Stats API por fecha programada (`dateObj.date`), fecha oficial (`officialDate`), `gamePk` y `rescheduledFromDate`.
  - Soporte explícito para dobles juegos: agrupar compromisos por fecha sin sobrescritura, asignando `doubleHeaderGames` cuando `doubleHeader === 'Y'` o cuando existan dos o más juegos para la misma fecha.
  - Soporte explícito para suspensiones/posposiciones: si un juego fue pospuesto, capturar su condición `isPostponed: true`, su motivo (`status.reason`, ej. "Lluvia") y su fecha de reprogramación (`rescheduleDate` / `rescheduleGameDate`).
  - Si el juego reprogramado ya fue disputado (ej. gamePk 870020 completado el 06/11), adjuntar en la fecha original (05/11) el resultado final con nota explicativa de que fue disputado en doble juego al día siguiente.

### RF-03: Renderizado Visual Ergonómico en el Calendario
- **Celda del Calendario (`calendar-day-card.tsx`)**:
  - Si `isPostponed`: Sustituir el horario por confirmar ("7:00 PM") por un badge visible `POSPUESTO` (color ámbar/dorado oscuro) y texto de estado indicando el resultado o fecha reprogramada (`G 4-2 • 06/11` o `Reprog. 06/11`).
  - Si `isDoubleHeader`: Mostrar cabecera compacta `DOBLE JUEGO (2J)` y listar ambos resultados (`J1: G 10-2`, `J2: G 4-2`) con colores semánticos (verde victoria, rojo derrota).
- **Modal de Detalle (`calendar-event-modal.tsx`)**:
  - Si es juego pospuesto: Mostrar banner informativo explicando que el partido fue suspendido por lluvia en la fecha original y disputado con su marcador final.
  - Si es doble juego: Mostrar tarjetas independientes para el Juego 1 y el Juego 2, detallando anotaciones, localía, lanzadores y enlaces al Centro de Mando.

### RF-04: Reconciliación Reactiva de Standings con MLB Stats API (`supabase.ts`)
- En `getStandings`:
  - Si la suma de partidos completados en Supabase es menor a la oficial, o como mecanismo de resiliencia ante caídas de cron, enriquecer/reconciliar con `https://statsapi.mlb.com/api/v1/standings?leagueId=135&season=2026`.
  - Garantizar que Leones del Caracas reporte **10 victorias y 10 derrotas** (PCT .500, Racha W3), y los 8 equipos de la LVBP tengan sus récords actualizados sin depender de la ejecución inmediata de GitHub Actions.
  - Ordenar las consultas de juegos recientes en Supabase por `game_date DESC, game_datetime DESC, id DESC` para preservar la precedencia del Juego 2 sobre el Juego 1 en dobles carteleras.

### RF-05: Ingesta con Ventana Deslizante en `update_daily.py` (`RepubliCaraquistApp`)
- Modificar `update_yesterdays_games()` a `update_recent_games(days_back=3)` para revisar una ventana móvil de los últimos 3 a 4 días.
- Detectar e insertar juegos con status `Postponed` y `Suspended`, actualizando las filas si su fecha o estatus cambia tras una reprogramación.

---

## 3. Criterios de Éxito y Verificación

1. **Jueves 05/11 en Calendario**: Muestra `POSPUESTO • G 4-2` (o detalle del resultado final jugado el 06/11) con badge ámbar, eliminando la hora falsa "7:00 PM".
2. **Viernes 06/11 en Calendario**: Muestra `DOBLE JUEGO`, con `J1: G 10-2` y `J2: G 4-2`.
3. **Centro de Mando / Récord**: Leones del Caracas muestra 10-10 en Resumen de Temporada, Standings y KPIs.
4. **Último Juego**: La pestaña de Último Juego en el Dashboard toma el Juego 2 (4-2 vs Bravos) como el encuentro más reciente.
5. **No Regresión**: La suite de tests de `republicaraquista-web` corre y pasa al 100%. Build de Next.js (`npm run build`) exitoso y sin errores de tipos TypeScript.
