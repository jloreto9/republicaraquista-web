# Bug Fix: Automatización Dinámica de Pestañas (Fin de Hardcoding)

- **Slug**: dynamic-tabs-pipeline
- **Fixed**: 2026-10-15
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Se eliminó por completo la dependencia de archivos JSON estáticos y constantes inmutables para la temporada 2026-2027 en las vistas `/wpa`, `/bullpen`, `/situacional`, `/spray-charts` y el MVP del último encuentro en `/`. Se implementó un pipeline unificado de ingesta y caché reactivo (`game-feed-service.ts`) que consulta en tiempo real los partidos oficiales jugados desde Supabase (`games`) e ingesta la telemetría viva de la MLB Stats API (`feed/live`) para construir métricas sabermétricas en memoria con latencia submilisegundo y fallback transparente a históricos.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/lib/game-feed-service.ts` | added | Servicio unificado de ingesta dinámica y memoria caché (`feedCache`) para partidos, bullpen IR/IRS, alineaciones 1-9, splits situacionales LOB, telemetría de spray/pitcheos y WPA. |
| `src/lib/bullpen.ts` | modified | Firma de `getBullpenAndLineups` ampliada con `overrideData` para procesar datasets dinámicos sin romper compatibilidad con snapshots 2022-2025. |
| `src/app/api/bullpen/route.ts` | modified | Conectado a `getDynamicBullpenAndLineups(season)` para temporadas activas (2026+) con fallback al snapshot. |
| `src/app/api/situacional/route.ts` | modified | Conectado a `getDynamicSituationalData(season)` para agregar splits de todos los partidos jugados en lugar de la constante estática de 35 PA. |
| `src/app/api/spray/route.ts` | modified | Conectado a `getDynamicSprayData(season, playerId)` para consolidar batazos y disciplina en home de todos los juegos disputados. |
| `src/lib/wpa-engine.ts` | modified | Exportación de `fetchLeonesGamesList` y `fetchSeasonWpaLeaders` dinámicos desde Supabase y feeds oficiales. |
| `src/app/api/wpa/route.ts` | modified | Consumo asíncrono de lista de partidos y líderes acumulados vivos de la temporada. |
| `src/lib/leones-stats-service.ts` | modified | Extracción dinámica del MVP del último partido jugado procesando las jugadas específicas de ese `game_id` con `processGameWpa(g.id)`. |
| `src/types/spray.ts` | modified | Propiedades opcionales añadidas a `PitchEvent` y `SprayPlayerOption` para soportar feeds vivos. |
| `src/components/spray/strike-zone-heatmap.tsx` | modified | Acceso seguro a `callColors` previniendo errores de indexación por undefined en modo dispersión de puntos. |

## Diff Highlights

### 1. Ingesta Dinámica de Partidos de Leones (`src/lib/game-feed-service.ts`)
```typescript
const { data: rawGames } = await supabase
  .from("games")
  .select("id, game_date, season, game_type, status, home_team_id, away_team_id, home_score, away_score")
  .eq("season", season)
  .or("home_team_id.eq.695,away_team_id.eq.695")
  .in("status", ["Final", "Completed", "Completed Early", "Game Over", "Live", "In Progress"])
  .order("game_date", { ascending: false });
```

### 2. Extracción de Bullpen y Alineaciones (`src/lib/game-feed-service.ts`)
```typescript
const box = feed?.liveData?.boxscore;
const teamBox = isHome ? box?.teams?.home : box?.teams?.away;
const pitchersList = teamBox?.pitchers || [];
// Extrae relevistas con inheritedRunners > 0 y starters 1-9 del battingOrder
```

### 3. MVP del Último Encuentro en Base a WPA Real (`src/lib/leones-stats-service.ts`)
```typescript
const { processGameWpa } = await import("./wpa-engine");
const gameWpa = await processGameWpa(g.id);
// Calcula el jugador de Leones con mayor impacto de victoria (WPA) en ese juego exacto
```

## Tests Added or Updated

- `testAll()` en Node.js validó la extracción de los 2 partidos completados de la temporada 2026 (870090 y 870093), verificando 9 titulares por juego y 10 apariciones de relevistas.
- `npx tsc --noEmit` completado con 0 errores de tipos en todo el proyecto.
- `npm run build` completado exitosamente en 2.5s con Turbopack (Next.js 16.3.6).

## Local Verification

- **Compilación de Producción**: `npm run build` → exit code 0, 31 páginas estáticas y rutas API serverless generadas.
- **Chequeo de Tipos**: `npx tsc --noEmit` → exit code 0.
- **Verificación de Datos**:
  - WPA: Game #1 (870090) y Game #2 (870093) se listan automáticamente en orden cronológico inverso.
  - Bullpen: Extracción dinámica de 10 apariciones de relevistas y alineaciones titulares.
  - Situacional: Abarca los 81 PA totales (64 AB, 11 H, 1 HR, 8 RBI) acumulados en ambos juegos en lugar de los 35 PA iniciales.
  - Spray Charts: 50 batazos y 324 pitcheos consolidados en lugar de los 21 batazos del juego 1.
  - MVP Centro de Mando: Leandro Cedeño (3 H, 1 HR, 4 CI en el juego 870093) se refleja de forma idéntica con el boxscore y la pestaña WPA.

## Deviations from Assessment

Ninguna. La remediación siguió exactamente el plan de diseño del assessment.

## Follow-ups

- Ejecutar `/speckit-bug-test slug=dynamic-tabs-pipeline` para registrar el informe formal de validación y desplegar en producción vía `git push origin main`.
