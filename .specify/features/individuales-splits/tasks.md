# Tasks: Splits Individuales Exhaustivos en Stats Individuales

**Identificador**: `individuales-splits`  

---

## Tareas de Implementación

### Fase 1: Setup & Tipado
- [X] T001 [P] Crear interfaces y tipos de datos para splits individuales en `src/types/player-splits.ts`

### Fase 2: Fundaciones & Motor de Datos
- [X] T002 Implementar servicio de agregación de splits de contexto y situacionales en `src/lib/player-splits-service.ts`
- [X] T003 [P] Crear endpoint API route `/api/stats/player-splits` en `src/app/api/stats/player-splits/route.ts`

### Fase 3: User Story 1 - Splits de Bateadores [US1]
- [X] T004 [P] [US1] Crear componente reutilizable de tablas de splits por grupo en `src/components/stats/splits/split-table-group.tsx`
- [X] T005 [US1] Implementar vista de exploración de splits individuales con selector de jugador en `src/components/stats/splits/player-splits-view.tsx`

### Fase 4: User Story 2 - Splits de Lanzadores [US2]
- [X] T006 [US2] Incorporar soporte de splits de pitcheo (ERA, WHIP, BAA, K/9, BB/9) en `src/lib/player-splits-service.ts` y `src/components/stats/splits/player-splits-view.tsx`

### Fase 5: User Story 3 - Integración en Tablas y Navegación [US3]
- [X] T007 [P] [US3] Agregar botón de acción 'Ver Splits' en cada fila de `src/components/stats/batting-table.tsx`
- [X] T008 [P] [US3] Agregar botón de acción 'Ver Splits' en cada fila de `src/components/stats/pitching-table.tsx`
- [X] T009 [US3] Integrar la pestaña 'Splits Situacionales' y el estado de jugador activo en `src/components/stats/individuales-view.tsx`

### Fase 6: Pulido, Verificación y Despliegue
- [X] T010 Ejecutar compilación de producción con `npm run build` en `republicaraquista-web`
- [X] T011 Realizar commit y push a `origin main` para detonar despliegue en Vercel
