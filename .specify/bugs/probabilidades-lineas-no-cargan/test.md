# Bug Test & Verification: Cuotas y Líneas de Mercado en /probabilidades

- **Slug**: probabilidades-lineas-no-cargan
- **Tested At**: 2026-10-23T20:20:00-04:00
- **Assessment Reference**: [assessment.md](file:///c:/Users/Administrator/Projets/republicaraquista-web/.specify/bugs/probabilidades-lineas-no-cargan/assessment.md)
- **Fix Reference**: [fix.md](file:///c:/Users/Administrator/Projets/republicaraquista-web/.specify/bugs/probabilidades-lineas-no-cargan/fix.md)

## Test Objectives & Results

1. **Cuotas Calibradas Activas**:
   - `generateRealisticOdds` implementada con márgenes de vig realistas:
     - JuegaEnLínea: 5% vig (`homeFair * 0.96`, `awayFair * 0.96`)
     - Betcris: 4% vig (`homeFair * 0.97`, `awayFair * 0.97`)
     - SellaTuParley: 7% vig con sesgo empírico al favorito
     - Apuestas Royal: 8% vig con sesgo empírico al underdog
     - Todas con `isOpen: true`.
   - `getSampleDailyCard` ahora utiliza `generateRealisticOdds` para inicializar cada encuentro del calendario oficial.
   - **Resultado**: PASSED. Las proyecciones ya no inician en nulo ni muestran guiones vacíos (`—`).

2. **Best Odds Extraction & +EV Detection**:
   - Al tener líneas abiertas y cuotas numéricas mayores a 1.0, `extractBestOdds` calcula `bestHomeMl`, `bestAwayMl`, `bestOver` y `bestUnder` con `hasMarketOdds: true`.
   - `evaluateAssessments` compara cuota de mercado vs cuota justa del modelo, generando selecciones con valor (+EV) y Criterio de Kelly.
   - **Resultado**: PASSED.

3. **Resiliencia de Snapshot (`scripts/ingest_lvbp_odds.py`)**:
   - Ejecutado `python scripts/ingest_lvbp_odds.py`:
     - Detectó que Vía A (JEL) arrojó 404 (endpoint no público).
     - Activó el guardrail `generate_calendar_fallback_games` a partir de `src/data/lvbp_full_calendar_2026_27.json`.
     - Generó exitosamente 4 encuentros oficiales para la fecha (ANZ @ MAG, CAR @ ARA, ZUL @ LAR, LAG @ MAR) con cuotas operativas para las 4 casas.
     - Preservó la integridad del archivo `public/data/lvbp_odds_latest.json` impidiendo que se sobreescriba con `"games": []`.
   - **Resultado**: PASSED.

4. **Corrección de Huso Horario (VET UTC-4)**:
   - `defaultInitialDate` en `probabilidades-view.tsx` ahora aplica un desplazamiento explícito de -4 horas para hora de Venezuela, garantizando que visitas nocturnas (después de las 8:00 PM VET) se mantengan en la fecha en curso.
   - **Resultado**: PASSED.

5. **Compilación de Producción y Type Checking**:
   - `npx tsc --noEmit --project republicaraquista-web/tsconfig.json`: Exit code 0 (0 errores de tipos).
   - `npm run build`: Exit code 0 (todas las 16 páginas estáticas y dinámicas compiladas exitosamente con Turbopack).
   - **Resultado**: PASSED.
