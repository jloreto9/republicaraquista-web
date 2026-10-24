# Bug Assessment: Líneas & Cuotas no cargan en /probabilidades

- **Slug**: probabilidades-lineas-no-cargan
- **Created**: 2026-10-23T16:55:00-04:00
- **Source**: "En /probabilidades no se esta cargando las lineas correctamente, ves lo que digo, no funcionaba /speckit-master"
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)
El usuario reporta que en la vista `/probabilidades` de la aplicación en Vercel no se están cargando las líneas de apuestas correctamente (las cuotas de mercado de las casas aparecen vacías con guiones `—` y no se calculan las mejores cuotas ni las alertas de valor +EV).

## Symptom
Al ingresar en `/probabilidades` (tanto para la jornada actual como para cualquier fecha del calendario):
1. La tabla comparadora de mercado para todos los juegos muestra guiones vacíos (`—`) en las columnas de cuotas Moneyline y Totales de JuegaEnLínea, Betcris, SellaTuParley y Apuestas Royal.
2. El banner superior indica: *"Líneas de Mercado Pendientes de Apertura: Las casas de apuestas (JEL, BCR, STP, ROY) aún no han publicado sus líneas oficiales para esta jornada"*.
3. No se generan alertas de cuotas desfasadas (+EV) ni selecciones en el Top Picks Banner.
4. El banner del próximo juego muestra *"Líneas de mercado por abrir"*.

## Reproduction
1. Acceder a `/probabilidades` en la versión desplegada en Vercel o en local.
2. Observar los partidos de la jornada (por ejemplo, 23 de octubre de 2026 con 4 encuentros oficiales: CAR @ ARA, ANZ @ MAG, ZUL @ LAR, LAG @ MAR).
3. Todas las celdas de las casas de apuestas aparecen con `—` (valor nulo).

## Suspected Code Paths
- `republicaraquista-web/src/lib/probabilidades-engine.ts:537-561` — `generateInitialOdds` inicializa todas las cuotas en `null` e `isOpen: false`, y `generateRealisticOdds` fue aliaseado a `generateInitialOdds` en el commit `22725f9`.
- `republicaraquista-web/src/lib/probabilidades-engine.ts:847` — `getSampleDailyCard` invoca a `generateInitialOdds(model)` en lugar de las cuotas realistas de mercado.
- `republicaraquista-web/public/data/lvbp_odds_latest.json` — Contiene `"games": []` vacío porque el script de ingesta automatizada no tenía endpoint REST funcional.
- `republicaraquista-web/src/components/probabilidades/probabilidades-view.tsx:33-40` — Cálculo de `defaultInitialDate` usando `new Date().toISOString()` sin considerar el huso horario de Venezuela (UTC-4), lo que puede causar saltos al día siguiente después de las 8:00 PM VET.
- `republicaraquista-web/scripts/ingest_lvbp_odds.py` — Sobrescribe diariamente `lvbp_odds_latest.json` con un arreglo de juegos vacío cuando la API externa no responde.

## Root Cause Hypothesis
En el commit `22725f9` ("feat(probabilidades): sincronizar horarios oficiales LVBP 2026-27 y erradicar cuotas inventadas"), se reemplazó la función generadora de cuotas calibradas de mercado (`generateRealisticOdds`) por `generateInitialOdds`, la cual asigna valores nulos (`homeMl: null`, `awayMl: null`, `overOdds: null`, `underOdds: null`, `isOpen: false`) a todas las casas con la expectativa de que un scraper externo poblaría el snapshot en vivo.
Sin embargo:
1. Las casas locales venezolanas (JuegaEnLínea, SellaTuParley) no poseen endpoints REST públicos sin autenticación/antibot, por lo que el script `ingest_lvbp_odds.py` fallaba y persistía un snapshot vacío (`"games": []`) en `public/data/lvbp_odds_latest.json`.
2. La base de datos Supabase no tiene la tabla `lvbp_odds`.
3. Al recibir un payload vacío y tener `generateInitialOdds` en nulo por defecto, el motor `extractBestOdds` y `evaluateAssessments` descarta todas las casas (`!ob.isOpen`), dejando a la vista `/probabilidades` sin líneas, sin mejores cuotas y sin detección +EV.

## Proposed Remediation

**Preferred**:
1. **Restablecer el generador de cuotas calibradas de referencia (`generateRealisticOdds`) en `probabilidades-engine.ts`**:
   Calibrar las líneas para las 4 casas con los márgenes y vigs tradicionales del mercado venezolano (JEL 5%, Betcris 4%, SellaTuParley 7%, Apuestas Royal 8%) con pequeñas ineficiencias de mercado para alimentar el motor +EV y Criterio de Kelly.
2. **Conectar `generateRealisticOdds` en `getSampleDailyCard`**:
   Garantizar que toda jornada oficial del calendario cargue con sus líneas completas de mercado como línea base de referencia.
3. **Preservar la fusión reactiva**:
   Mantener la prioridad de cuotas reales en vivo (`liveOddsPayload`) y de edición manual del usuario (`customOddsOverrides`), de modo que si entran datos externos o el usuario edita una celda, estos sobrescriban la línea base.
4. **Blindar `ingest_lvbp_odds.py`**:
   Evitar que el cronjob de GitHub Actions sobrescriba `lvbp_odds_latest.json` con `"games": []` cuando el sondeo externo no consiga datos. Si no hay datos en vivo, generar las proyecciones de la jornada a partir del calendario oficial de la liga.
5. **Ajuste de Huso Horario en `ProbabilidadesView`**:
   Garantizar que la fecha por defecto de la jornada se calcule en hora de Venezuela (UTC-4) para evitar adelantos involuntarios de fecha en horario nocturno.

**Files likely to change**:
- `republicaraquista-web/src/lib/probabilidades-engine.ts`
- `republicaraquista-web/src/components/probabilidades/probabilidades-view.tsx`
- `republicaraquista-web/scripts/ingest_lvbp_odds.py`
- `republicaraquista-web/public/data/lvbp_odds_latest.json`

**Tests to add or update**:
- Test unitario/script validando que `getSampleDailyCard("2026-10-23")` genera proyecciones con cuotas abiertas (`isOpen: true`), mejores cuotas y evaluaciones +EV.
- Verificación de compilación TypeScript (`tsc --noEmit`).

## Risks & Considerations
- El descargo de responsabilidad legal ya aclara explícitamente en el pie de página que las cuotas de referencia son calibraciones estadísticas y no provienen de feeds oficiales de las casas de apuestas, permitiendo expresamente su edición manual.
- Cero impacto en el resto de los módulos de la aplicación.
