# Fix Report: Normalización de Timezone VET en Récord por Día de Semana

- **ID**: `BUG-LVBP-SITUATIONAL-DAYS-001`
- **Fecha**: 28 de Octubre de 2026
- **Estado**: Resuelto y Verificado
- **Autor**: Antigravity & Jorge Leonardo Loreto

---

## 1. Causa Raíz Confirmada
El desfase horario entre UTC y Venezuela (UTC-4) provocaba que los juegos iniciados en horario estelar nocturno (e.g. 20:00 VET / 00:00 UTC) tuvieran `game_date = "2026-10-25"` en la base de datos a pesar de haberse jugado el sábado 24 de octubre en hora venezolana. Al evaluar la fecha sin normalizar `game_datetime`, el juego caía en domingo en lugar de sábado.

---

## 2. Archivos Modificados

1. **[`src/lib/utils.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/utils.ts)**:
   - Se exportó la utilidad canónica `getVenezuelanDate(dateStr, datetimeStr): string`, que resta determinísticamente 4 horas a `game_datetime` para obtener la fecha local venezolana `YYYY-MM-DD`.

2. **[`src/lib/calendar-parser.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/calendar-parser.ts)**:
   - Se reemplazó la definición local privada de `getVenezuelanDate` importándola directamente desde `@/lib/utils`, preservando la regla de única fuente de verdad.

3. **[`src/lib/leones-stats-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/leones-stats-service.ts)**:
   - Se integró `getVenezuelanDate` en `getLeonesAdvancedStats`:
     - Orden cronológico `sortedGames` considerando `game_datetime`.
     - Cómputo de `daysCount` para `daysRecord`:
       ```ts
       const effDate = getVenezuelanDate(g.game_date, g.game_datetime);
       if (effDate) {
         const d = new Date(`${effDate}T12:00:00Z`);
         const wd = (d.getUTCDay() + 6) % 7;
         if (won) daysCount[wd].w++;
         else daysCount[wd].l++;
       }
       ```
     - Cómputo de tendencias en `getRecentTrends` y formato en `getLastGameDetail`.

4. **[`src/lib/player-splits-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/player-splits-service.ts)**:
   - Se normalizó el cálculo de `dayOfWeekMap` tanto para bateadores como para lanzadores utilizando `getVenezuelanDate(g.game_date, g.game_datetime)`.
