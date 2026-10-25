# Informe de Implementación y Cierre: Optimizador de Lineup Sabermétrico (Tom Tango)

**Slug:** `013-tango-lineup-optimizer`  
**Fase:** Convergencia y Validación Final (Fase 4 de Spec-Kit)  
**Fecha:** 2026-10-25  
**Estado:** ✅ Convergido y Validado al 100% (Grounded en Datos Reales)

---

## 1. Resumen Ejecutivo de la Solución

Se completó la construcción y remediación del **Optimizador Lineups (Tom Tango - The Book)** dentro del módulo de Bullpen & Lineup Tracker.

### Remedición Crítica Aplicada (Cero Invención de Datos)
1. **Eliminación Total de Alineaciones Inventadas**:
   - Se removió el orden inventado y el pool estático `LEONES_BATTING_POOL`.
   - Se eliminaron peloteros ajenos al equipo (como René Pinto).
2. **Enlace Directo a Alineaciones Reales del Terreno**:
   - El optimizador ahora se alimenta directamente de `data.lineups.topFrequentLineups` (las combinaciones reales de 9 titulares más repetidas por el mánager) y `data.lineups.gameLineups` (todos los juegos reales disputados en la temporada).
   - Por defecto, evalúa la alineación más frecuente empleada en la temporada o el último juego disputado.
3. **Estadísticas Reales Auditadas desde Supabase**:
   - Se construyó `LEONES_REAL_STATS_MAP` con los 24 bateadores oficiales de Leones del Caracas auditados de la base de datos de Supabase (`batting_stats`), incluyendo wOBA, OBP, SLG, AVG, ISO, wRC+, lados de bateo (Z/D/A) y headshots oficiales de MLB.
   - La función `resolvePlayerStats` resuelve por `playerId` y coincidencia de nombres normalizados sin diacríticos ni tildes.

---

## 2. Validación de Criterios de Aceptación

| ID | Criterio de Aceptación | Estado | Evidencia de Verificación |
|---|---|---|---|
| **CA-001** | Pestaña "Optimizador Lineups (Tom Tango - The Book)" accesible en el Tracker de Lineup | ✅ Cumplido | Integrada en `bullpen-view.tsx` como subtab `optimizer` con icono `Sparkles`. |
| **CA-002** | Algoritmo estocástico de Tom Tango (*The Book*) con jerarquía 2 ➔ 1 ➔ 4 ➔ 5 ➔ 3 ➔ 9 ➔ 6, 7, 8 | ✅ Cumplido | Implementado en `src/lib/tango-lineup-engine.ts`, evaluando wOBA, OBP, ISO y apalancamiento BaseRuns. |
| **CA-003** | Comparativa paralela entre el Orden Real del Mánager vs Tom Tango con delta de carreras | ✅ Cumplido | Renderizado de dos columnas con roles, carreras en 56 JJ, delta de carreras y victorias esperadas (Pythagenpat). |
| **CA-004** | Cero alineaciones ficticias; uso exclusivo de juegos y combinaciones reales de la temporada | ✅ Cumplido | Selector dinámico con `<optgroup>` de alineaciones frecuentes y juegos disputados; orden real 1 a 9 exacto. |
| **CA-005** | Compilación TypeScript limpia sin errores (`npx tsc --noEmit`) | ✅ Cumplido | Comando `npx tsc --noEmit` finalizado exitosamente con código 0. |

---

## 3. Archivos Modificados y Creados

- [`src/types/tango-lineup.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/types/tango-lineup.ts): Interfaces de tipado TypeScript para jugadores y métricas.
- [`src/lib/tango-lineup-engine.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/tango-lineup-engine.ts): Diccionario de estadísticas reales de Leones, ponderación BaseRuns y algoritmo Tango.
- [`src/components/bullpen/tango-lineup-optimizer-tab.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/bullpen/tango-lineup-optimizer-tab.tsx): Componente interactivo enlazado a alineaciones reales de mánager y optimización Tango.
- [`src/components/bullpen/bullpen-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/bullpen/bullpen-view.tsx): Integración de subtab y pase de props `gameLineups` y `topFrequentLineups`.
- [`specs/013-tango-lineup-optimizer/tasks.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/013-tango-lineup-optimizer/tasks.md): Registro de tareas completadas.
- [`specs/013-tango-lineup-optimizer/implementation.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/013-tango-lineup-optimizer/implementation.md): Este informe final.
