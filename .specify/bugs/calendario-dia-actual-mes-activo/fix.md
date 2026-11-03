# Fix Report: Selección Dinámica del Mes Activo y Resalte Visual del Día Actual

- **ID**: `BUG-CALENDAR-TODAY-001`
- **Slug**: `calendario-dia-actual-mes-activo`
- **Fecha**: 2 de Noviembre de 2026
- **Estado**: Resuelto y Verificado
- **Autor**: Antigravity & Jorge Leonardo Loreto

---

## 1. Causa Raíz Confirmada

1. En `src/components/calendar/calendar-view.tsx`, la variable de estado `selectedMonth` estaba hardcodeada en `useState<number>(10)`, haciendo que la vista de calendario siempre abriera en Octubre sin importar el mes corriente.
2. En `src/components/calendar/calendar-grid.tsx` y `src/components/calendar/calendar-day-card.tsx`, no se calculaba ni propagaba la propiedad `isToday`. Como consecuencia, el día actual no recibía distinción visual alguna.
3. No existía un helper canónico en `src/lib/utils.ts` para obtener los componentes numéricos de la fecha actual bajo la zona horaria oficial de Venezuela (`America/Caracas` UTC-4).

---

## 2. Modificaciones Realizadas

1. **`src/lib/utils.ts`**:
   - Se añadió la función `getVenezuelanToday()` que computa `{ year, month, day, dateString }` usando `Intl.DateTimeFormat` con `timeZone: "America/Caracas"`, con fallback a `UTC-4`.

2. **`src/components/calendar/calendar-view.tsx`**:
   - Inicialización perezosa de `selectedMonth`: si el mes actual de Venezuela está en `initialData.months`, se selecciona automáticamente (ej. Noviembre = 11, Diciembre = 12).
   - Botón directo "Hoy": permite volver al mes actual en cualquier momento si el usuario navegó a otro mes.
   - Pestañas de meses: indicador visual pulsante ámbar en la pestaña del mes actual.
   - Navegación (`handlePrevMonth` y `handleNextMonth`) con límites dinámicos basados en los meses disponibles.
   - Leyenda oficial enriquecida con el identificador del "Día Actual (Hoy)".

3. **`src/components/calendar/calendar-grid.tsx`**:
   - Inyección de `todayVet` mediante `getVenezuelanToday()`.
   - Cálculo atómico de `isToday` por cada celda del mes (`todayVet.year === year && todayVet.month === month && todayVet.day === d`).
   - Propagación de `isToday` a `CalendarDayCard`.

4. **`src/components/calendar/calendar-day-card.tsx`**:
   - Soporte para la prop `isToday?: boolean`.
   - Resalte visual destacado para el día de hoy:
     - Anillo/borde resplandeciente ámbar (`ring-2 ring-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.35)]`).
     - Badge "HOY" en la cabecera junto al número del día.
     - Aplica consistentemente tanto para días con juego de Leones como para días de descanso ("Libre").
