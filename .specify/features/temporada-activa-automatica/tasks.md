# Tasks: Detección Automática de Temporada Activa & Transición Cero-Mantenimiento

**Identificador**: `temporada-activa-automatica`  

---

## Tareas de Implementación

### Fase 1: Motor Central de Temporada
- [X] T001 Crear `src/lib/season-service.ts` con funciones reactivas `getActiveSeason()` y `getAvailableSeasons()` con caché TTL de 5 minutos
- [X] T002 Actualizar `src/lib/constants.ts` para integrar y re-exportar el servicio de temporada dinámica

### Fase 2: APIs Autónomas
- [X] T003 [P] Actualizar endpoints API (`/api/stats/batting`, `/api/stats/pitching`, `/api/stats/player-splits`, `/api/games`, `/api/standings`, `/api/kpis`, `/api/bullpen`, `/api/situacional`, `/api/wpa`, `/api/stats/collective`, `/api/pitching/game-logs`, `/api/pitching/season-data`) para resolver dinámicamente `await getActiveSeason()` cuando no se especifique parámetro `season`

### Fase 3: Server Components & Vistas
- [X] T004 [P] Actualizar Server Components principales (`src/app/page.tsx`, `src/app/individuales/page.tsx`, `src/app/standings/page.tsx`, `src/app/bullpen/page.tsx`, `src/app/colectivas/page.tsx`, `src/app/matchup/page.tsx`, `src/app/situacional/page.tsx`, `src/app/wpa/page.tsx`, `src/app/pitching/page.tsx`, `src/app/spray-charts/page.tsx`, `src/app/probabilidades/page.tsx`) para inyectar la temporada dinámica
- [X] T005 Limpiar llamadas con `2025` quemado en componentes cliente (`src/components/stats/individuales-view.tsx`, `src/components/bullpen/bullpen-view.tsx`, `src/components/colectivas/colectivas-view.tsx`, `src/components/pitching/pitching-view.tsx`, `src/components/wpa/wpa-view.tsx`)

### Fase 4: Verificación y Despliegue
- [X] T006 Ejecutar `npm run build` en `republicaraquista-web` para verificar compilación limpia de 28 rutas
- [X] T007 Realizar commit semántico y push a `origin main` para detonar despliegue automático en Vercel
