# Bug Assessment: Automatización Dinámica de Pestañas (Fin de Hardcoding)

- **Slug**: dynamic-tabs-pipeline
- **Created**: 2026-10-15
- **Source**: Reporte directo del usuario ("Todas las pestanas que segun arreglamos ayer parece ser que estan harcodeadas, y no estan trabjaando automatico /speckit-master")
- **Verdict**: valid
- **Severity**: high

## Report (resumen)

El usuario identificó con total precisión que las soluciones aplicadas para visualizar la temporada 2026 en varias vistas de la aplicación (`/wpa`, `/situacional`, `/spray-charts`, `/bullpen`) se apoyaron en archivos JSON estáticos o constantes hardcodeadas en TypeScript (diseñados para el Juego 1: 870090), en lugar de contar con un pipeline automatizado y dinámico que consulte en tiempo real la base de datos (Supabase) y la MLB Stats API conforme se juegan nuevos encuentros.

## Symptom

Al disputarse nuevos juegos de la temporada 2026-2027:
1. **WPA (`/wpa`)**: La lista desplegable de partidos solo muestra 1 juego (`LEONES_2026_GAMES = [{ id: 870090 }]`) y los líderes de WPA son un array estático inmutable (`getSeasonWpaLeaders(2026)`).
2. **Splits Situacionales (`/situacional`)**: Los datos provienen de una constante hardcodeada `LEONES_SITUATIONAL_2026` fija en 35 PA, 2 hits, 0 HR, 0 RBI.
3. **Spray Charts & Strike Zone (`/spray-charts`)**: Depende de `src/data/lvbp_spray_2026.json`, un archivo congelado con los 21 batazos del juego 1.
4. **Bullpen & Lineups (`/bullpen`)**: Depende de `SNAPSHOTS[2026]` cargado desde `src/data/lvbp_season_2026.json`.
5. **Centro de Mando (`/`)**: El MVP del último juego consumía los líderes estáticos de WPA.

## Reproduction

1. Iniciar el servidor local o consultar Vercel.
2. Ingresar a `/wpa`: el selector de partidos para 2026-27 solo contiene el Juego #1 del 13 de Octubre.
3. Ingresar a `/situacional`: los splits situacionales muestran exactamente 35 PA y no se actualizan con la actividad reciente de la liga.
4. Ingresar a `/spray-charts`: los bateadores y la cantidad de batazos provienen de un archivo JSON estático en disco (`lvbp_spray_2026.json`).
5. Inspeccionar el código fuente en `src/lib/wpa-engine.ts`, `src/lib/situational-engine.ts`, `src/lib/bullpen.ts` y verificar que contienen estructuras estáticas.

## Suspected Code Paths

- `src/lib/wpa-engine.ts:348-383`: `LEONES_2026_GAMES` y `getSeasonWpaLeaders(2026)` hardcodeados.
- `src/lib/wpa-engine.ts:470`: `getLeonesGamesList` solo retorna el array estático.
- `src/lib/situational-engine.ts:52-160`: `LEONES_SITUATIONAL_2026` con valores manuales fijos.
- `src/lib/bullpen.ts:13-26`: `SNAPSHOTS` leyendo exclusivamente archivos `.json` empaquetados en lugar de consultar la base de datos o el feed de partidos.
- `src/lib/spray-engine.ts:11-19`: Lectura directa de `src/data/lvbp_spray_2026.json`.
- `src/app/api/wpa/route.ts`: Endpoint que devuelve los juegos de `getLeonesGamesList` estático.

## Root Cause Hypothesis

Confianza: Alta (100%).
Para resolver de forma inmediata el desfase donde la web mostraba la temporada 2024-2025, se generaron snapshots locales basados en el primer encuentro oficial (Juego 870090). Al no estar estos motores conectados a consultas vivas sobre Supabase (`games`, `pitching_stats`, `batting_stats`) ni al feed de la MLB API en los endpoints correspondientes, la web quedó desacoplada de la ingesta automática y requeriría intervención manual juego a juego si no se corrige.

## Proposed Remediation

Transformar las 4 vistas críticas en componentes verdaderamente dinámicos:

1. **WPA Dinámico (`src/lib/wpa-engine.ts` y `src/app/api/wpa/route.ts`)**:
   - `getLeonesGamesList(season)` debe consultar dinámicamente la tabla `games` de Supabase para obtener todos los partidos finalizados o en curso de Leones en la temporada (`home_team_id == 695 OR away_team_id == 695`), ordenados cronológicamente inverso (`game_date DESC`).
   - Los líderes acumulados de WPA deben calcularse agregando las jugadas de todos los juegos disputados por Leones o generarse desde el histórico real de la temporada.

2. **Splits Situacionales Dinámicos (`src/app/api/situacional/route.ts` & `src/lib/situational-service.ts`)**:
   - Conectar los splits situacionales a las tablas agregadas de Supabase (`batting_stats`, `pitching_stats`, y play-by-play de los juegos disputados) o calcularlos dinámicamente por agregación de boxscores de la temporada activa.

3. **Bullpen & Lineups Dinámicos (`src/lib/bullpen.ts` & `src/app/api/bullpen/route.ts`)**:
   - Conectar la extracción de lineups y corredores heredados a partir de los juegos registrados en Supabase y el feed oficial de MLB Stats API (`https://statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live`), con fallback al snapshot solo si no hay conexión externa.

4. **Spray Charts Dinámicos (`src/app/api/spray/route.ts`)**:
   - Consolidar los batazos de todos los juegos disputados por Leones en la temporada consultando los feeds de los juegos oficiales registrados en Supabase.

## Files Likely to Change

- `src/lib/wpa-engine.ts`
- `src/app/api/wpa/route.ts`
- `src/lib/situational-engine.ts`
- `src/app/api/situacional/route.ts`
- `src/lib/bullpen.ts`
- `src/app/api/bullpen/route.ts`
- `src/lib/spray-engine.ts`
- `src/app/api/spray/route.ts`
- `src/lib/supabase.ts`

## Risks & Considerations

- **Latencia y Rate Limiting de MLB Stats API**: Consultar múltiples feeds de juegos en cada request causaría timeouts en Vercel Serverless. Se debe usar caché en memoria / ISR / Supabase para que una vez procesado un juego finalizado, su telemetría quede memorizada y solo se consulte el juego nuevo del día.
- **Robustez ante juegos en progreso**: Manejar estados parciales cuando un juego esté `Live` vs `Final`.
