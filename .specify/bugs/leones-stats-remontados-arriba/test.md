# Bug Verification: Cálculo Dinámico de Remontados, Arriba y Decisiones de Pitcheo en Leones Stats

- **Slug**: leones-stats-remontados-arriba
- **Tested**: 2026-10-19
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

El defecto ha sido resuelto y verificado. Para la temporada 2026-2027 en curso, `getLeonesAdvancedStats(2026)` ahora extrae en paralelo los feeds de MLB Stats API y calcula con total fidelidad sabermétrica: `remontados = 1` (victoria viniendo de atrás 8-4 el 18/10 tras perder 2-4 al 6to inning), `up = '1-0'` (victoria defendiendo ventaja 9-4 el 14/10 tras liderar 9-1 al 6to inning), `starters = '0-2'`, `relievers = '2-2'`, `terreneadas = 0` y `saves = 0`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npx tsx --env-file=.env.local scripts/test_leones_stats.mjs` | pass | `remontados` pasó de 0 a 1; `up` pasó de 0-0 a 1-0; `starters` pasó de 0-4 a 0-2; `relievers` pasó de 2-0 a 2-2. |
| New / updated tests | `npx tsx --env-file=.env.local scripts/test_leones_stats.mjs` | pass | 100% de las 8 aserciones estadísticas validadas contra la fuente de verdad. |
| Build check | `npm run build` | pass | Compilación limpia de todas las rutas estáticas y dinámicas en Turbopack. |

## Output Excerpts

```text
🧪 Iniciando prueba de Leones Advanced Stats (Temporada 2026)...
Estadísticas calculadas para Leones 2026: {
  totalGames: 6,
  record: '2-4',
  homeRecord: '0-2',
  awayRecord: '2-2',
  remontados: 1,
  up: '1-0',
  terreneadas: 0,
  starters: '0-2',
  relievers: '2-2',
  saves: 0
}
✅ Todas las aserciones de Leones Advanced Stats pasaron al 100%!
```

## Recommendation

Cerrar el bug — verificado con datos reales de la temporada 2026-2027 de la LVBP.
