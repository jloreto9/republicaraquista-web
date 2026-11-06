# Tareas de Implementación: Pestaña "Rachas" (Rachas Activas) en Centro de Mando

**Slug:** `021-rachas-activas-centro-mando`  
**Rama:** `021-rachas-activas-centro-mando`  
**Autor:** Antigravity & Jorge Leonardo Loreto (@JorgeLoreto)  
**Fecha:** 2026-11-06  
**Fase:** Spec-Kit Track 2 • Desglose Atómico de Tareas  

---

## Matriz de Tareas

| ID | Tarea | Archivo(s) Afectado(s) | Dependencia | Estado |
|---|---|---|---|---|
| **T001** | Definir tipos e interfaces TypeScript para rachas | `src/types/streaks.ts`<br>`src/types/leones-stats.ts` | Ninguna | [x] Completado |
| **T002** | Crear servicio puro de cálculo de rachas sabermétricas (`streaks-service.ts`) | `src/lib/streaks-service.ts` | T001 | [x] Completado |
| **T003** | Conectar el servicio de rachas al orquestador del dashboard | `src/lib/leones-stats-service.ts` | T002 | [x] Completado |
| **T004** | Desarrollar el componente de UI `RachasTab` | `src/components/dashboard/tabs/rachas-tab.tsx` | T001, T003 | [x] Completado |
| **T005** | Integrar pestaña en `DashboardTabs` en la 3.ª posición | `src/components/dashboard/dashboard-tabs.tsx` | T004 | [x] Completado |
| **T006** | Crear y ejecutar tests unitarios de validación para el cálculo de rachas | `src/lib/__tests__/streaks-service.test.ts` | T002 | [x] Completado |
| **T007** | Verificación técnica de tipos y compilación | Repositorio completo | T005, T006 | [x] Completado |
| **T008** | Cierre de feature, convergencia y documentación de entrega | `specs/021-rachas-activas-centro-mando/implementation.md` | T007 | [x] Completado |

---

## Registro de Verificación
- **T001**: Creado `src/types/streaks.ts` con `BatterStreakItem`, `PitcherStreakItem`, `TeamStreakItem`, `RachasTabData`. Actualizado `src/types/leones-stats.ts` con `streaks?: RachasTabData`.
- **T002**: Creado `src/lib/streaks-service.ts` con `computeTeamStreaks`, `computeBatterStreaks` (regla MLB 9.23b) y `computePitcherStreaks`.
- **T003**: Conectado `getStreaksData(season)` en paralelo dentro de `getDashboardTabsData()` en `src/lib/leones-stats-service.ts`.
- **T004**: Creado `src/components/dashboard/tabs/rachas-tab.tsx` con filtros internos (`Todo`, `Bateo`, `Pitcheo`, `Equipo`), diseño Caracas Navy/Oro, tarjetas KPI, cuadrícula H2H, sin emojis en iconos (Lucide puro) y estados vacíos.
- **T005**: Pestaña registrada en `DashboardTabs` en la 3.ª posición (`Último Juego` → `Tendencias` → `Rachas` → `Líderes del Equipo` → `Leones Stats`) con icono `Flame` y badge `"Activas"`.
- **T006**: Test suite `src/lib/__tests__/streaks-service.test.ts` ejecutada con `npx tsx`: todos los asserts pasaron con éxito.
- **T007**: `npx tsc --noEmit` y `npm run build` ejecutados exitosamente con 0 errores.
