# Bug Fix: Vercel Build Failure & ESLint Remediation

- **Slug**: vercel-build-failure
- **Fixed**: 2026-09-24
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Se corrigieron las violaciones de ESLint estrictas (`@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `react-hooks/exhaustive-deps`) que bloqueaban el paso de validación en Vercel, y se proveyeron fallbacks seguros en `src/lib/supabase.ts` para que la fase de pre-renderizado estático SSG en Vercel sea completamente resiliente incluso si las variables de entorno aún no se han configurado en el panel.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/lib/supabase.ts` | modified | Se definieron las interfaces `RawBattingRow` y `RawPitchingRow` eliminando el uso de `any`; se protegieron `getStandings`, `getRecentGames`, `getBattingStats` y `getPitchingStats` contra excepciones fatales en tiempo de build |
| `src/components/dashboard/kpi-summary.tsx` | modified | Se removió el import `Moon` de `lucide-react` |
| `src/components/stats/individuales-view.tsx` | modified | Se incluyó `pitchingStats.length` en el arreglo de dependencias de `useEffect` |

## Local Verification

- Commands run:
  - `npm run lint` → Exit Code 0 (0 errors, 0 warnings).
  - `npm run build` → Exit Code 0 (Compilado en 1.8s, TypeScript 4.6s, 8/8 páginas estáticas e íconos generados en 853ms).

## Deviations from Assessment

Ninguna. Todas las remediaciones propuestas fueron aplicadas y verificadas localmente antes de desplegar.
