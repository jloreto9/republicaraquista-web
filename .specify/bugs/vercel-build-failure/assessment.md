# Bug Assessment: Vercel Build Failure

- **Slug**: vercel-build-failure
- **Date**: 2026-09-24
- **Reported Environment**: Vercel CLI 59.25.4 (Washington, D.C. – iad1)
- **Status**: verified

## Symptoms

1. `npm run lint` exits with code 1 due to 2 TypeScript-ESLint errors (`@typescript-eslint/no-explicit-any` in `src/lib/supabase.ts`) and 2 warnings (`@typescript-eslint/no-unused-vars` and `react-hooks/exhaustive-deps`).
2. During static page generation on Vercel (`vercel build`), if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset or inaccessible during the build step, `src/lib/supabase.ts` throws unhandled errors (`throw new Error(...)`), crashing Next.js SSG prerendering for `/`, `/standings`, and `/individuales`.

## Root Cause

1. **ESLint Strict Validation Failure:** Next.js build runs ESLint by default. `src/lib/supabase.ts` used `(row: any)` in row iteration callbacks. `src/components/dashboard/kpi-summary.tsx` imported unused `Moon`. `src/components/stats/individuales-view.tsx` had an incomplete dependency array in `useEffect`.
2. **Missing Build-Time Fallback for Static Prerender:** When environment variables are not yet configured in Vercel project settings, `supabase` is `null`. The data functions threw fatal exceptions instead of providing safe build-time fallbacks.

## Proposed Remediation

1. Define explicit types `RawBattingRow` and `RawPitchingRow` in `src/lib/supabase.ts` to eliminate `any`.
2. Remove unused `Moon` import from `kpi-summary.tsx`.
3. Fix `useEffect` dependency array in `individuales-view.tsx`.
4. Provide safe fallback returns in `src/lib/supabase.ts` when `!supabase` so Next.js static prerender generates valid static pages even when environment variables are not yet configured in Vercel.
5. Verify with `npm run lint` and `npm run build`.
