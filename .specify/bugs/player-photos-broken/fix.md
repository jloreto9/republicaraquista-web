# Bug Fix: Fotos de Jugadores Rotas en Tablas Sabermétricas

- **Slug**: player-photos-broken
- **Fixed**: 2026-09-24T19:39:00Z
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Se corrigió la URL generadora de avatares en `src/lib/supabase.ts` reemplazando el subdominio y ruta obsoleta `img.mlbstatic.com/.../headshot/spt/current` por el endpoint canónico de alta disponibilidad de MLB `https://midfield.mlbstatic.com/v1/people/${p.playerId}/spots/120`. Además, se agregó manejo defensivo `onError` en los componentes `<Image>` de las tablas de bateo y pitcheo con fallback automático al logo del equipo, evitando cualquier icono de imagen rota.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/lib/supabase.ts` | modified | Reemplazado endpoint de avatares a `midfield.mlbstatic.com/.../spots/120` en `getBattingStats` y `getPitchingStats`. |
| `src/components/stats/batting-table.tsx` | modified | Agregado `onError` en `<Image>` con fallback a `player.teamLogo`. |
| `src/components/stats/pitching-table.tsx` | modified | Agregado `onError` en `<Image>` con fallback a `pitcher.teamLogo`. |
| `.specify/bugs/player-photos-broken/tasks.md` | added | Registro de tareas de remediación completadas. |

## Diff Highlights

```diff
- playerAvatar: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:spt:current.png/w_120,q_auto:best/v1/people/${p.playerId}/headshot/spt/current`,
+ playerAvatar: `https://midfield.mlbstatic.com/v1/people/${p.playerId}/spots/120`,
```

```diff
<Image
  src={player.playerAvatar}
  alt={player.playerName}
  width={28}
  height={28}
  className="object-cover"
  unoptimized
+ onError={(e) => {
+   const target = e.currentTarget;
+   if (target.src !== player.teamLogo) {
+     target.src = player.teamLogo;
+   }
+ }}
/>
```

## Local Verification

- Commands run: `npm run build` → Compiled successfully in 1.3s with zero errors.
- Manual checks: Verificación con curl de múltiples `playerId` reales de la LVBP (`660670`, `541608`, `682818`, `699130`) contra `midfield.mlbstatic.com/v1/people/{id}/spots/120`, confirmando `HTTP 200 OK` con `Content-Type: image/png` y caché CDN activo.

## Deviations from Assessment

Ninguna. La remediación se aplicó de acuerdo al plan.

## Follow-ups

- Monitorear el despliegue automático en Vercel y verificar visualmente la carga en la vista de líderes individuales.
