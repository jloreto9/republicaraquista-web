# Bug Assessment: Fotos de Jugadores Rotas en Tablas Sabermétricas

- **Slug**: player-photos-broken
- **Fecha**: 2026-09-24
- **Severidad**: Media (UI / Visual)
- **Veredicto**: Válido con Causa Raíz Confirmada

## 1. Síntoma
En las tablas de bateo y pitcheo de la vista de líderes individuales (`/individuales`), las fotos o avatares de los jugadores de la LVBP aparecen rotas o no cargan.

## 2. Causa Raíz
En `src/lib/supabase.ts` (líneas 553 y 703), la URL de los avatares de los jugadores se estaba generando como:
```ts
playerAvatar: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:spt:current.png/w_120,q_auto:best/v1/people/${p.playerId}/headshot/spt/current`
```
1. La ruta `/headshot/spt/current` y el fallback `generic:headshot:spt:current.png` sobre el dominio `img.mlbstatic.com` corresponden a una sintaxis obsoleta o deshabilitada en los servidores de Cloudinary de MLB, provocando bloqueos por timeout (5000ms+) o errores 404 en el navegador.
2. Por el contrario, el endpoint moderno, canónico y de alta disponibilidad utilizado por MLB y los pipelines de LVBP/LIDOM es:
```ts
playerAvatar: `https://midfield.mlbstatic.com/v1/people/${p.playerId}/spots/120`
```
Este endpoint corre sobre la red CDN Cloudflare de `midfield.mlbstatic.com` (ya autorizada en `next.config.ts`), devuelve `HTTP 200 OK` en milisegundos y tiene fallback automático integrado a silueta deportiva (`d_people:generic:headshot:silo:current.png`).

## 3. Plan de Remediación Propuesto
1. **`src/lib/supabase.ts`**:
   - Actualizar las líneas 553 y 703 para usar `https://midfield.mlbstatic.com/v1/people/${p.playerId}/spots/120`.
2. **`src/components/stats/batting-table.tsx` y `pitching-table.tsx`**:
   - Agregar manejo defensivo con `onError` o componente de avatar para asegurar que cualquier fallo de red o jugador sin foto utilice de respaldo el logo del equipo (`player.teamLogo`), garantizando cero imágenes rotas.

## 4. Archivos a Modificar
- `src/lib/supabase.ts`
- `src/components/stats/batting-table.tsx`
- `src/components/stats/pitching-table.tsx`

## 5. Criterio de Éxito
- Petición HTTP a la URL de foto de cualquier jugador devuelve `200 OK` con `Content-Type: image/png`.
- La compilación `npm run build` pasa limpiamente.
- Despliegue en Vercel exitoso sin avatares caídos.
