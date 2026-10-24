# Bug Fix: Restaurar Cuotas Calibradas de Mercado y Resolver Líneas Vacías en /probabilidades

- **Slug**: probabilidades-lineas-no-cargan
- **Fixed At**: 2026-10-23T17:01:00-04:00
- **Assessment Reference**: [assessment.md](file:///c:/Users/Administrator/Projets/republicaraquista-web/.specify/bugs/probabilidades-lineas-no-cargan/assessment.md)

## Summary of Changes

1. **`src/lib/probabilidades-engine.ts`**:
   - Re-implementada la función canónica `generateRealisticOdds(model: ModelProbabilities, homeAbbr?: string, awayAbbr?: string)` con calibración realista para las 4 casas venezolanas:
     - **JuegaEnLínea (JEL)**: Benchmark digital con ~5% vig.
     - **Betcris (BCR)**: Líneas más ajustadas con ~4% vig.
     - **SellaTuParley (STP)**: ~7% vig con sesgo empírico al favorito.
     - **Apuestas Royal (ROY)**: ~8% vig con sesgo empírico al underdog.
     - Todas las casas inicializadas con `isOpen: true`.
     - `custom` inicializada con `isOpen: false` para activación por edición manual.
   - Conectada `generateRealisticOdds` directamente en `getSampleDailyCard` para que toda jornada oficial de la LVBP inicie con líneas operativas completas.
   - `generateInitialOdds` ahora actúa como alias de `generateRealisticOdds`.

2. **`src/components/probabilidades/probabilidades-view.tsx`**:
   - Se ajustó el cálculo de `defaultInitialDate` aplicando el desplazamiento de huso horario oficial de Venezuela (VET: UTC-4), evitando que en horario nocturno (después de las 8:00 PM VET / 00:00 UTC) la vista salte prematuramente a la jornada siguiente mientras los juegos de hoy continúan en progreso.

3. **`scripts/ingest_lvbp_odds.py`**:
   - Agregada la función `generate_calendar_fallback_games` y guardrail para evitar que las ejecuciones automáticas de GitHub Actions sobrescriban `lvbp_odds_latest.json` con `"games": []` cuando los endpoints externos de apuestas no estén disponibles o devuelvan 404.
   - Preserva los datos válidos existentes en el snapshot y genera la cartelera oficial si no hay cuotas en vivo.

4. **`public/data/lvbp_odds_latest.json`**:
   - Regenerado con los 4 juegos oficiales de la LVBP para la fecha actual con cuotas operativas para las 4 casas.
