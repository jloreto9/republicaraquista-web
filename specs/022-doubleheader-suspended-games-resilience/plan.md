# Plan Técnico 022: Arquitectura y Manejo de Dobles Juegos y Suspensiones

## 1. Principios de Arquitectura y Escalera Ponytail

Siguiendo las directrices de `ponytail.md` y `CLAUDE.md`:
1. **No inventar abstracciones innecesarias**: Reutilizar las estructuras existentes en `src/types/calendar.ts` y las utilidades de fecha y formato.
2. **Atacar la causa raíz**: El mapa en `attachSupabaseResults` asumía erróneamente un juego por fecha y descartaba estados no finalizados. Modificar la función canónica para indexar por lista de juegos por fecha (`Map<string, MlbGame[]>`) y relacionar por `rescheduledFromDate`.
3. **Resiliencia distribuida**: Vercel no debe depender ciegamente del cron de GitHub Actions para mostrar la tabla de posiciones. Un fallback ligero contra el endpoint oficial de standings de MLB (`statsapi.mlb.com/api/v1/standings`) garantiza actualización en tiempo real con latencia mínima (<150ms).
4. **Diff mínimo y reversible**: Las interfaces en TypeScript son retrocompatibles agregando campos opcionales. Ningún componente existente se rompe.

---

## 2. Archivos Afectados

### En `republicaraquista-web`:
1. `src/types/calendar.ts`: Extensión de `CalendarGameResult` y `CalendarGameEvent`.
2. `src/lib/calendar-parser.ts`: Refactorización de `attachSupabaseResults` para indexación multi-juego, soporte de dobles carteleras y mapeo de juegos pospuestos/reprogramados.
3. `src/lib/calendar-service.ts`: Añadir función `getGamesForDate` para soportar múltiples juegos en una fecha y robustecer `getNextScheduledGame`.
4. `src/components/calendar/calendar-day-card.tsx`: Renderizado condicional para `isPostponed` y `isDoubleHeader`.
5. `src/components/calendar/calendar-event-modal.tsx`: Visualización de doble juego y mensaje explicativo de juego pospuesto.
6. `src/lib/supabase.ts`: Reconciliación defensiva de `getStandings` con MLB Stats API y ordenamiento cronológico preciso con `game_datetime DESC, id DESC`.
7. `src/lib/leones-stats-service.ts`: Ordenamiento de `getLastGameDetail` por `game_date DESC, game_datetime DESC, id DESC` para tomar el Juego 2 de una doble cartelera.

### En `RepubliCaraquistApp`:
8. `scripts/update_daily.py`: Cambiar `update_yesterdays_games` a ventana deslizante de 3 días (`update_recent_games(days_back=3)`) y capturar juegos `Postponed`.

---

## 3. Estrategia de Implementación Detallada

### Paso 1: Tipos (`src/types/calendar.ts`)
Añadir a `CalendarGameResult`:
```typescript
isPostponed?: boolean;
isSuspended?: boolean;
postponedReason?: string;
rescheduledToDate?: string;
rescheduledFromDate?: string;
isDoubleHeader?: boolean;
gameNumber?: number;
note?: string;
```
Añadir a `CalendarGameEvent`:
```typescript
isDoubleHeader?: boolean;
doubleHeaderGames?: Array<{
  gamePk: number;
  gameNumber: number;
  timeDisplay?: string;
  result: CalendarGameResult;
}>;
```

### Paso 2: Lógica de Vinculación (`src/lib/calendar-parser.ts`)
- Agrupar los juegos de MLB por fecha: `scheduledDateGames: Map<string, any[]>`.
- Mapear juegos reprogramados: `rescheduledGamesMap: Map<string, any>` indexado por `rescheduledFromDate`.
- Al procesar cada evento:
  - Si el evento coincide con una fecha con múltiples juegos (Doble Juego):
    - Construir `doubleHeaderGames` con los resultados de cada juego (`gameNumber: 1` y `gameNumber: 2`).
    - Marcar `isDoubleHeader: true`.
    - Asignar el juego principal como `result`.
  - Si el evento corresponde a un juego pospuesto (por estatus `Postponed` o porque existe en `rescheduledGamesMap`):
    - Marcar `isPostponed: true`.
    - Si el juego reprogramado ya finalizó (ej. Juego 2 del 06/11): asignar el resultado final ganado/perdido con la nota explicativa.
    - Si aún no se ha jugado: reflejar `isCompleted: false`, `status: "Pospuesto"`, y la fecha tentativa de reprogramación.

### Paso 3: Componentes de UI (`calendar-day-card.tsx` y `calendar-event-modal.tsx`)
- Adaptar `CalendarDayCard` para renderizar el badge de `DOBLE JUEGO` con los marcadores de J1 y J2 en 2 líneas o fila compacta.
- Renderizar badge ámbar `POSPUESTO` para el juego del jueves con su resultado final.
- Adaptar `CalendarEventModal` para mostrar ambas fichas de juego si es doble juego, o banner explicativo de lluvia si es pospuesto.

### Paso 4: Reconciliación de Standings (`src/lib/supabase.ts`)
- En `getStandings`: Tras calcular los datos de Supabase, realizar una comprobación ligera contra `statsapi.mlb.com/api/v1/standings?leagueId=135&season=2026`. Si Supabase tiene menos victorias o juegos totales que MLB, reconciliar los acumulados (wins, losses, streak, gamesBack).
- En `getRecentGames`: Agregar orden secundario `.order("game_datetime", { ascending: false })`.

### Paso 5: Script de Ingesta Diaria (`update_daily.py`)
- Modificar la consulta para traer los juegos desde `today - 3 días` hasta `today`.
- Garantizar que los juegos que pasaron de `Scheduled` a `Final` se actualicen en Supabase aunque hayan ocurrido 48 horas antes.

---

## 4. Plan de Rollback

En caso de anomalías en producción:
1. `git checkout main` en `republicaraquista-web`.
2. Las tablas de Supabase no sufren cambios de esquema DDL (solo datos de juegos ya existentes en la BD).
3. La interfaz de tipos mantiene retrocompatibilidad total mediante campos puramente opcionales.
