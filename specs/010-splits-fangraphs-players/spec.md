# Especificación de Feature: Splits Completos Estilo FanGraphs (Bateadores y Lanzadores)

**Slug:** `010-splits-fangraphs-players`  
**Autor:** Antigravity & Jorge Leonardo Loreto (@JorgeLoreto)  
**Fecha:** 2026-10-21  
**Estado:** Aprobado en /grill-me  

---

## 1. Contexto y Objetivos

El usuario solicitó evaluar y construir una réplica rigurosa de las tablas de **Splits de FanGraphs** para lanzadores (inspirado en [Freddy Peralta 2026 Splits](https://www.fangraphs.com/players/freddy-peralta/18679/splits?position=P&season=2026&split=)) y bateadores (inspirado en [Junior Caminero 2026 Splits](https://www.fangraphs.com/players/junior-caminero/28163/splits?position=NP&season=2026&split=)), adaptada a las particularidades de la LVBP y Leones del Caracas.

### Metas Principales:
1. Proveer desgloses multidimensionales estilo FanGraphs:
   - **Platoon / Lateralidad:** vs Zurdos (LHB/LHP), vs Derechos (RHB/RHP).
   - **Situación en Base / Presión:** Bases Limpias, Corredores en Base, RISP, RISP con 2 Outs (Clutch), Bases Llenas, Primer Bateador de Inning.
   - **Por Conteo:** Primer Pitcheo, 2 Strikes, Conteo Lleno (3-2), Conteo Parejo, etc.
   - **Por Entrada y Outs:** Entradas 1-3 (Apertura), 4-6 (Media), 7-9+ (Tardía/Clutch), 0 Outs, 1 Out, 2 Outs.
   - **Contexto de Juego & Localía:** Casa, Carretera, Día, Noche, En Victorias, En Derrotas.
   - **Por Rol de Lanzador:** Como Abridor (SP) vs Como Relevista (RP).
   - **Por Rival y Mes:** vs cada uno de los 7 equipos rivales de la LVBP y desglose por mes (Octubre, Noviembre, Diciembre, Enero).
2. Conjunto de columnas exhaustivo estilo FanGraphs:
   - **Bateadores:** PA, AB, R, H, 2B, 3B, HR, RBI, BB, SO, AVG, OBP, SLG, OPS, ISO, BABIP, BB%, K%.
   - **Lanzadores:** IP, BF, H, R, ER, BB, SO, HR, ERA, WHIP, BAA, Opp OBP, Opp SLG, Opp OPS, K/9, BB/9, K/BB, K%, BB%, BABIP.
3. Navegación fluida por Tabs de Categoría con opción "Ver Todo", diseño Dark Navy de alto contraste y selector universal de peloteros de toda la LVBP con acceso prioritario a Leones del Caracas.

---

## 2. Requerimientos Funcionales

- **RF01 (Arquitectura de Datos Híbrida):** Consumo del endpoint oficial de MLB Stats API `https://statsapi.mlb.com/api/v1/people/{id}/stats?stats=statSplits&sitCodes={codes}&group={hitting|pitching}&season={season}&sportId=17` con caché de 15 minutos en memoria, respaldado por agregación en Supabase para historial de partidos por rival.
- **RF02 (Soporte Dual Bateador / Lanzador):** El modelo de datos y la interfaz deben detectar automáticamente si el jugador es lanzador o bateador y proyectar el esquema de columnas y KPIs correspondiente.
- **RF03 (Cálculo Determinístico de Sabermétricas):**
  - $ISO = SLG - AVG$
  - $BABIP = \frac{H - HR}{AB - SO - HR + SF}$
  - $BB\% = \frac{BB}{PA}$ (o $BF$ para pitchers)
  - $K\% = \frac{SO}{PA}$ (o $BF$ para pitchers)
  - $K/BB = \frac{SO}{BB}$
  - $K/9 = \frac{SO \times 9}{IP}$
  - $BB/9 = \frac{BB \times 9}{IP}$
- **RF04 (Ordenamiento Interactivo):** Todas las columnas numéricas deben ser ordenables de forma ascendente y descendente al hacer clic en el encabezado.
- **RF05 (Protección Visual Anti-Fallas):** Todo componente de imagen debe contar con fallback garantizado a `getMlbFallbackHeadshotUrl(playerId)` y luego al logo del equipo, evitando fotos rotas.

---

## 3. Criterios de Aceptación

1. La vista `/individuales?tab=splits` permite buscar cualquier jugador de la LVBP (bateador o lanzador) y renderiza sus splits organizados por categorías.
2. Cada tabla de splits presenta las columnas tradicionales, slash line y métricas sabermétricas FanGraphs.
3. Los enlaces desde `/bullpen` (`⚡ Splits`) y `/pitching` conducen directamente al perfil de splits del lanzador seleccionado.
4. `tsc --noEmit` y `npm run build` completan con 0 errores.
