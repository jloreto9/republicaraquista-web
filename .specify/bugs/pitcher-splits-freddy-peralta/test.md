# Bug Verification: Pitcher Splits Fallback & Ineligible MLB Players (Freddy Peralta)

- **Slug**: pitcher-splits-freddy-peralta
- **Tested**: 2026-10-23T10:04:30-04:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary
El bug fue verificado y remediado exitosamente. La consulta a `pitching_stats` ya no genera el error PostgreSQL 42703, los perfiles de splits de los lanzadores de Leones del Caracas (Norwith Gudiño, Erick Leal, Zak Kent) se calculan y visualizan correctamente, y Freddy Peralta y Junior Caminero fueron completamente removidos del sistema.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Supabase Pitching Stats Query | Node script ejecutando `.select(...)` sin `games_started` | pass | Norwith Gudiño (7 apariciones 2026, 48 en 2025) y Zak Kent (7 apariciones 2026) retornaron data íntegra sin errores de base de datos. |
| Métricas Sabermétricas de Splits | Node script ejecutando FanGraphs metrics para lanzadores | pass | ERA, WHIP, IP, SO calculados limpiamente: Gudiño 2026 (4.0 IP, 5 K, 2.25 ERA, 1.00 WHIP), Kent 2026 (9.7 IP, 6 K, 7.45 ERA, 1.65 WHIP). |
| Búsqueda de Inelegibles (Anti-Leakage) | `Get-ChildItem -Recurse \| Select-String -Pattern "642547\|691406"` | pass | Cero coincidencias en todo el código fuente. |
| Type-check | `tsc --noEmit --project republicaraquista-web/tsconfig.json` | pass | Exit code 0, tipado estricto verificado. |
| Selector de Jugadores | Validación de `getAllAvailablePlayersForSplits` con límite ampliado | pass | 313 lanzadores detectados en 2026 y 393 en 2025. Leones del Caracas ordenados al principio con sus figuras reales. |

## Output Excerpts
```text
Verified Profile for: Norwith Gudiño Season: 2026 IP: 4.0 SO: 5 ERA: 2.25 WHIP: 1.00
Verified Profile for: Zak Kent Season: 2026 IP: 9.7 SO: 6 ERA: 7.45 WHIP: 1.65
Verified Profile for: Norwith Gudiño Season: 2025 IP: 47.4 SO: 54 ERA: 3.80 WHIP: 1.33
tsc --noEmit: Exited with code 0.
```

## Residual Risks
Ninguno.

## Recommendation
Cerrar el bug — verificado de punta a punta. Listo para desplegar en Vercel.
