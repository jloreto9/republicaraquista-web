# Tasks: Corrección de Fotos de Jugadores Rotas

- **Slug**: player-photos-broken
- **Fecha**: 2026-09-24

## Tareas de Remediación

- [x] T001 Actualizar endpoint canónico de avatares en `src/lib/supabase.ts` a `https://midfield.mlbstatic.com/v1/people/${p.playerId}/spots/120`
- [x] T002 Agregar fallback defensivo de imagen en `src/components/stats/batting-table.tsx`
- [x] T003 Agregar fallback defensivo de imagen en `src/components/stats/pitching-table.tsx`
- [x] T004 Ejecutar verificación de build local con `npm run build`
- [x] T005 Generar informe de corrección `.specify/bugs/player-photos-broken/fix.md`
- [x] T006 Realizar commit y push a GitHub para despliegue automático en Vercel
