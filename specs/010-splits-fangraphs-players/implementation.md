# Informe de Implementación: Splits FanGraphs (Bateadores y Lanzadores)

**Slug:** `010-splits-fangraphs-players`  
**Fase:** Paso 4 - Implementación y Pruebas  
**Fecha:** 2026-10-21  
**Estado:** ✅ Completado y Convergido  

---

## 1. Resumen de Cambios

Se implementó el sistema de splits multidimensionales estilo FanGraphs tanto para bateadores como para lanzadores:

1. **Modelo de Datos (`src/types/player-splits.ts`)**:
   - Para bateadores: incorporadas métricas avanzadas FanGraphs `iso`, `babip`, `bbPct` y `kPct`.
   - Para lanzadores: incorporadas métricas `bf`, `oppObp`, `oppSlg`, `oppOps`, `kPerBb`, `kPct`, `bbPct`, `babip`, `hrPer9`.
   - Nuevas categorías y colecciones en el perfil: `countSplits`, `pitcherCountSplits`, `pitcherRoleSplits`, `pitcherPlatoonSplits`, `pitcherSituationalSplits`, `pitcherInningSplits`, `pitcherOutsSplits`, `pitcherContextSplits`, `pitcherOpponentSplits`, `pitcherCalendarSplits`.

2. **Servicio y Motor de Consulta (`src/lib/player-splits-service.ts`)**:
   - Consumo del endpoint oficial `statSplits` de MLB Stats API con catálogo de 30 códigos situacionales (`vl, vr, r0, ron, risp, risp2, r123, lo, fp, 2s, fc, o0, o1, o2, i01-i09, h, a, d, n, twn, tls, sp, rp`).
   - Deduplicación automática de filas multi-equipo mediante selección de filas consolidadas.
   - Fallback robusto al motor sabermétrico calibrado con Supabase cuando los jugadores son exclusivos del circuito invernal LVBP.
   - Resuelve metadatos de cualquier jugador MLB/LVBP mediante `https://statsapi.mlb.com/api/v1/people/{id}`.
   - Enriquecimiento del selector de jugadores con estrellas destacadas (Junior Caminero 691406, Freddy Peralta 642547, Aldrem Corredor 672580, Harold Castro 605612, Víctor Bericoto 682674, Norwith Gudiño 660508, Sam Bordner 663778).
   - Caché en memoria con TTL de 15 minutos para optimización de latencia y rate-limits.

3. **Tablas de Splits (`src/components/stats/splits/split-table-group.tsx`)**:
   - Vista de Bateo: 20 columnas (`SPLIT | J | PA | AB | C | H | 2B | 3B | HR | CI | BB | SO | AVG | OBP | SLG | OPS | ISO | BABIP | BB% | K%`).
   - Vista Monticular: 23 columnas (`SPLIT | J | JI | IP | BF | H | C | CL | BB | SO | HR | ERA | WHIP | BAA | OBP Opp | SLG Opp | OPS Opp | K/9 | BB/9 | K/BB | K% | BB% | BABIP`).
   - Ordenamiento interactivo por cualquier columna con sentido sabermétrico (menor es mejor para ERA, WHIP, BAA, BB).

4. **Navegación e Interfaz (`src/components/stats/splits/player-splits-view.tsx`)**:
   - Barra de navegación con pills de categorías: *Todos los Splits, Platoon, Bases & RISP, Conteos & Outs, Por Entrada, Rol (SP/RP), Localía & Horario, Por Rival, Calendario & Meses*.
   - Desglose independiente y completo para lanzadores y bateadores.
   - Búsqueda universal con badges distintivos de la LVBP.

---

## 2. Pruebas y Verificación

- **TypeScript Typecheck (`tsc --project tsconfig.json --noEmit`)**: 0 errores.
- **Compilación de Producción (`npm run build`)**: Exitosa con Turbopack (16 páginas y 22 rutas dinámicas compiladas).
- **Inspección de Datos en Vivo**:
  - Junior Caminero (691406): Desglose verificado vs LHP (195 PA, .287 AVG, 8 HR), vs RHP (507 PA, .272 AVG, 34 HR), RISP (176 PA, .294 AVG), Conteos y Entradas.
  - Freddy Peralta (642547): Desglose verificado vs LHB (107.0 IP, 100 K, 8.41 K/9), vs RHB (61.1 IP, 56 K), Abridor (169.0 IP, 156 K, 4.42 ERA), Situacionales y Conteos.
  - Jugadores LVBP (Aldrem Corredor, Harold Castro, Víctor Bericoto, Norwith Gudiño): Desgloses generados y calibrados con sus historiales en la liga.
