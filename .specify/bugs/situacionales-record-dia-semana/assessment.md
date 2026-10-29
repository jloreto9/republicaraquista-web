# Bug Assessment: Récord Situacional por Día de Semana (Sábados 1-1, Domingos 2-0)

- **ID**: `BUG-LVBP-SITUATIONAL-DAYS-001`
- **Fecha**: 28 de Octubre de 2026
- **Severidad**: `Media-Alta`
- **Estado**: Diagnosticado

---

## 1. Resumen del Síntoma
En el dashboard principal, pestaña **"Estadísticas de Leones"** (`LeonesStatsTab`), en la columna 3 de Estadísticas Situacionales (**"Por Día de Semana"**) y en los splits situacionales por pelotero (`PlayerSplitsView`), los días de fin de semana reflejaban:
- `Sábado: 0G-1P` (cuando debía ser **1G-1P**, o 1-1)
- `Domingo: 3G-0P` (cuando debía ser **2G-0P**, o 2-0)

## 2. Pasos para Reproducir
1. Abrir la web de `republicaraquista-web` en producción o local.
2. Navegar a la pestaña **"Estadísticas de Leones"** en el Dashboard.
3. Observar la columna 3 del panel de situaciones **"Por Día de Semana"**:
   - `Sábado:` mostraba `0G-1P`
   - `Domingo:` mostraba `3G-0P`

## 3. Causa Raíz Identificada
1. En la base de datos Supabase (`games`), el juego disputado el **sábado 24 de octubre de 2026** (Leones 10 - Magallanes 1, ID `870058`) tiene:
   - `game_date = "2026-10-25"`
   - `game_datetime = "2026-10-25T00:00:00+00:00"`
2. A las 8:00 PM hora local de Venezuela (VET / UTC-4) del sábado 24 de octubre, en tiempo universal (UTC) ya eran las 00:00 horas del domingo 25 de octubre.
3. Tanto en [`src/lib/leones-stats-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/leones-stats-service.ts) (líneas 248-258) como en [`src/lib/player-splits-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/player-splits-service.ts) (líneas 805 y 1105), la fecha se calculaba directamente haciendo:
   ```ts
   const d = new Date(g.game_date);
   const wd = (d.getUTCDay() + 6) % 7;
   ```
   Al evaluar `"2026-10-25"`, `d.getUTCDay()` arrojaba `0` (Domingo).
4. En consecuencia, la victoria del sábado 24/10 se acreditó erróneamente al domingo, dejando al sábado con solo la derrota del 17/10 (`0G-1P`) e inflando al domingo a 3 victorias (`3G-0P`).

## 4. Remediación Propuesta
1. Exportar la función canónica `getVenezuelanDate(dateStr, datetimeStr)` en [`src/lib/utils.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/utils.ts) para normalizar el offset UTC-4.
2. Utilizar `getVenezuelanDate` en:
   - [`src/lib/leones-stats-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/leones-stats-service.ts) para calcular `daysRecord`, orden cronológico de juegos, y tendencias.
   - [`src/lib/player-splits-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/player-splits-service.ts) para el cómputo de splits por día de la semana de bateadores y lanzadores.
   - [`src/lib/calendar-parser.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/calendar-parser.ts) reutilizando la utilidad unificada.
3. Crear test automatizado en `scripts/test_situacionales_days.mjs` demostrando que el sábado queda `1G-1P` y el domingo `2G-0P`.
