# Bug Assessment: Selección Automática de Mes Activo y Resalte del Día Actual en Calendario

- **Slug**: `calendario-dia-actual-mes-activo`
- **Fecha**: 2 de Noviembre de 2026
- **Proyecto**: `republicaraquista-web` (RepubliCaraquistApp en Vercel)
- **Estado**: Triaje Completado / Listo para Corrección

---

## 1. Resumen del Síntoma

Al ingresar a la sección de Calendario Oficial (`/calendario`) en Vercel:
1. La vista carga predeterminadamente en el mes de **Octubre** (`selectedMonth = 10`), obligando al usuario a hacer clic manual en **Noviembre** a pesar de que la temporada regular ya se encuentra en dicho mes.
2. En la cuadrícula mensual (`CalendarGrid`), el día actual no tiene ninguna marca o indicador visual distintivo respecto al resto de los días ("no marca el día actual").
3. Al no detectar la fecha actual de Venezuela (`America/Caracas`), la experiencia de usuario es estática y desorientadora durante el seguimiento diario de los Leones del Caracas en la LVBP.

---

## 2. Pasos para Reproducir

1. Navegar a la ruta `/calendario` en la aplicación web.
2. Observar la barra de pestañas de meses: el botón seleccionado activamente es **Octubre** con sus juegos.
3. Navegar a la cuadrícula: ningún día (ni con juego ni día libre) resalta visualmente como "HOY" o fecha del día.

---

## 3. Causa Raíz Identificada

1. **Hardcoding de mes inicial**:
   En [`src/components/calendar/calendar-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/calendar/calendar-view.tsx) (L28-29):
   ```tsx
   // Mes activo: por defecto 10 (Octubre 2026, inicio de temporada)
   const [selectedMonth, setSelectedMonth] = useState<number>(10);
   ```
   No se evalúa la fecha del sistema ni la zona horaria de Venezuela.

2. **Ausencia de cálculo y paso de `isToday`**:
   En [`src/components/calendar/calendar-grid.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/calendar/calendar-grid.tsx), las celdas se calculan únicamente con `dayNumber`, `isCurrentMonth` y `event`, sin evaluar si coinciden con el día de hoy.

3. **Ausencia de estilos y badges para `isToday`**:
   En [`src/components/calendar/calendar-day-card.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/calendar/calendar-day-card.tsx), el componente no recibe `isToday` ni estiliza el día de descanso ni el día con juego con distintivo de hoy.

4. **Falta de helper canónico de fecha actual venezolana**:
   [`src/lib/utils.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/utils.ts) contiene `getVenezuelanDate()`, pero carece de `getVenezuelanToday()` para obtener de forma atómica y consistente el año, mes y día de Venezuela (`America/Caracas` UTC-4).

---

## 4. Severidad y Blast Radius

- **Severidad**: `Media` (Afecta directamente la usabilidad diaria del usuario final en Vercel).
- **Riesgo**: Muy bajo (cambio cosmético y de inicialización reactiva en componentes frontend existentes, sin alterar modelos de datos ni APIs).

---

## 5. Plan de Remediación

1. **`src/lib/utils.ts`**:
   - Agregar `getVenezuelanToday()` utilizando `Intl.DateTimeFormat` con `timeZone: "America/Caracas"` y fallback determinístico `Date.now() - 4 * 3600 * 1000`.
2. **`src/components/calendar/calendar-view.tsx`**:
   - Inicializar `selectedMonth` evaluando si el mes actual de Venezuela existe en `initialData.months`.
   - Agregar botón rápido "Hoy" si el mes seleccionado no es el actual.
   - Mostrar indicador visual en la pestaña del mes que corresponde a hoy.
   - Hacer los límites de `handlePrevMonth` y `handleNextMonth` dinámicos según `months`.
   - Incorporar en la leyenda el marcador de "Hoy".
3. **`src/components/calendar/calendar-grid.tsx`**:
   - Pasar `isToday: boolean` a cada `CalendarDayCard`.
4. **`src/components/calendar/calendar-day-card.tsx`**:
   - Recibir `isToday?: boolean`.
   - Resaltar la tarjeta con ring ámbar/dorado (`ring-2 ring-amber-400` / `border-amber-400`), sombra contextual y badge `"HOY"` tanto en días de juego como en días libres.
5. **Validación**:
   - Crear suite de prueba en `test/calendar-today.test.mjs` que verifique la detección de mes/día de Venezuela y la correcta asignación de `isToday`.
   - Validar build de Next.js (`npm run build`).
