# Fix Report: Detección Precisa de Juegos de Día en LVBP

- **ID**: `BUG-LVBP-DAY-001`
- **Fecha**: 18 de Octubre de 2026
- **Estado**: Resuelto y Verificado
- **Autor**: Antigravity & Jorge Leonardo Loreto

---

## 1. Causa Raíz Confirmada

En la base de datos Supabase (`games`), no existe una columna booleana `is_day_game`. Sin embargo, la columna `game_datetime` sí está presente y almacena la marca de tiempo oficial en formato ISO (ej. `'2026-10-16T18:00:00+00:00'`).
El código realizaba:
```ts
const isDay = Boolean(g.is_day_game); // undefined -> siempre false
```
Forzando que los juegos diurnos de los Leones (como el del viernes 16-10-2026 a las 2:00 PM VET / 18:00 UTC) se contabilizaran bajo el récord nocturno (`nightLosses`), mostrando en la UI `0-0` de día.

---

## 2. Modificaciones Realizadas

1. **`src/lib/utils.ts`**:
   - Implementación de la función canónica `isDayGame(gameDatetimeOrTime, isDayGameFlag)`:
     - Regla de dominio LVBP: Hora de inicio < 18:00 VET (UTC-4).
     - Soporta timestamps ISO (`2026-10-16T18:00:00+00:00`), cadenas de hora (`2:00 PM`, `14:00`) y flag de override explícito.
2. **`src/lib/supabase.ts`**:
   - Se añadió `game_datetime?: string;` a `SupabaseGameRow`.
   - Se actualizó `getRecentGames` y `getSeasonKPIs` para calcular `isDayGame: isDayGame(g.game_datetime, g.is_day_game)`.
3. **`src/lib/leones-stats-service.ts`**:
   - Se conectó `isDayGame` en el cómputo de `dayWins` y `dayLosses` para alimentar `dayRecord` de `LeonesAdvancedStats`.
4. **`src/lib/player-splits-service.ts`**:
   - Se unificó `isNightGame` para delegar directamente en `!isDayGame(gameDatetime, isDayGameFlag)`.
   - Se ajustó el umbral de los labels de splits a `6:00 PM` (18:00 VET).
