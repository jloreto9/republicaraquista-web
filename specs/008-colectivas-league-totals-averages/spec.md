# Feature Specification: 008 - Totales y Promedios por Juego de la Liga en Estadísticas Colectivas

**Feature Directory**: `specs/008-colectivas-league-totals-averages`  
**Created**: 2026-10-21  
**Status**: In Progress (Track 2: Spec-Driven Development)  
**Target Repository**: `republicaraquista-web` (Next.js 16 / React 19 en Vercel)  
**Input**: Inclusión de filas de resumen en las tres tablas colectivas (`/colectivas`): Bateo, Pitcheo y Fildeo. La última sección de cada tabla (`<tfoot>`) debe contener dos filas destacadas:
1. **Total Liga**: Acumulados totales de la liga (sumas de conteo y ratios globales recalculados de la LVBP).
2. **Promedio por Juego**: Promedios calculados por partido completo (9 innings, ambos rivales combinados en el encuentro) ubicado inmediatamente abajo de la fila de Total Liga con diseño visual diferenciado.
Además, soporte para alternar o visualizar promedios por equipo por juego.

---

## 1. User Scenarios & Acceptance Criteria *(mandatory)*

### User Story 1 - Fila de Acumulados de la Liga ("Total Liga") en Bateo, Pitcheo y Fildeo (Priority: P1) 🎯 MVP

Como analista o fanático caraquista, al consultar las tablas de Bateo, Pitcheo y Fildeo en `/colectivas`, quiero ver una fila de cierre en el pie de tabla titulada **"Total Liga"** con el escudo oficial de la LVBP o badge de liga, que consolide los números absolutos de todo el circuito:
- **Bateo Colectivo**:
  - `JJ`: Total de juegos de la liga (partidos únicos jugados en la fase).
  - Conteos sumados: `PA`, `AB`, `R`, `H`, `2B`, `3B`, `HR`, `RBI`, `BB`, `SO`, `SB`, `LOB`.
  - Sabermetría recalculada ponderada real de la liga (no media de promedios):
    - `AVG = Total H / Total AB`
    - `OBP = (Total H + Total BB + Total HBP) / Total PA`
    - `SLG = Total TB / Total AB`
    - `OPS = OBP + SLG`
    - `BABIP = (Total H - Total HR) / (Total AB - Total SO - Total HR + Total SF)`
- **Pitcheo Colectivo**:
  - `JJ`: Total de juegos únicos.
  - Conteos sumados: `G`, `P`, `SV`, `HLD`, `BS`, `IP` (suma exacta con conversión de fracciones de tercio: `.1` = 1 out, `.2` = 2 outs), `H`, `R`, `CL (ER)`, `BB`, `SO`, `HR`.
  - Sabermetría recalculada de la liga:
    - `ERA = (Total ER * 9) / Total IP_decimal`
    - `WHIP = (Total BB + Total H) / Total IP_decimal`
    - `K/9 = (Total SO * 9) / Total IP_decimal`
    - `BB/9 = (Total BB * 9) / Total IP_decimal`
    - `K/BB = Total SO / Total BB`
    - `BAA = Total H / Total AB_oponente` (o total H contra staff monticular de la liga)
- **Fildeo Colectivo**:
  - `JJ`: Total de juegos únicos.
  - Conteos sumados: `Inn`, `PO`, `A`, `E`, `TC`, `DP`, `TP`, `PB`, `CS`, `SB`.
  - Métricas recalculadas:
    - `FPCT = (Total PO + Total A) / Total TC`
    - `CS% = Total CS / (Total CS + Total SB)`
    - `RF/9 = 9 * (Total PO + Total A) / Total Inn_decimal`

**Acceptance Criteria**:
1. Los totales de conteo coinciden exactamente con la suma de los 8 equipos de la LVBP.
2. Los ratios ponderados no presentan divisiones por cero ni errores NaN si no hay juegos en una fase.
3. El diseño del footer `<tfoot>` permanece fijo o claramente delimitado con borde dorado/azul marino oscuro, distinguiéndose de los 8 equipos.

---

### User Story 2 - Fila de "Promedios por Juego" (Partido Completo) Debajo del Total (Priority: P1) 🎯 MVP

Como usuario, quiero ver inmediatamente abajo de la fila "Total Liga" una fila titulada **"Promedio por Juego"** (o "Media por Partido") que refleje la producción esperada en un partido regular de 9 innings entre 2 equipos:
- **Cálculo de volumen**: `Total Métrica / Total Partidos Únicos de la Liga` (ejemplo: Carreras totales / Juegos únicos = ~10 a 11 R por partido).
- **Ratios sabermétricos**: Se mantienen idénticos a los ratios de la liga (`AVG`, `OBP`, `SLG`, `OPS`, `ERA`, `WHIP`, `FPCT`, etc.) o con guion/fórmula idéntica ya que el promedio de bateo por juego es el mismo promedio global de la liga.

**Acceptance Criteria**:
1. La fila se ubica exactamente abajo de la fila "Total Liga".
2. Se muestra con tipografía mono, badge identificador "X/J" o "Juego Completo", y formato a 1 o 2 decimales para conteos (ej. `10.8 R/J`, `19.7 H/J`, `1.6 HR/J`).
3. Estilizado pulcro y responsive en desktop y móviles.

---

### User Story 3 - Visualización y Desglose de Promedios por Equipo (Priority: P2)

Como aficionado analítico, quiero poder consultar además los **Promedios por Equipo por Juego** (ej. cuántas carreras anota cada equipo por partido: ~5.4 R/J), ya sea mediante un switch de visualización ("Totales Acumulados" vs "Por Juego / Equipo") o en una pestaña de apoyo, permitiendo comparar el promedio de Leones del Caracas contra el promedio de la liga.

---

## 2. Invariantes de Dominio y Contrato Técnico

1. **Partidos Únicos vs Team-Games**: Cada juego oficial de la LVBP involucra a 2 equipos. Si los 8 equipos disputan 56 juegos cada uno, existen `56 * 8 = 448` apariciones de equipo (Team-Games) y exactamente `448 / 2 = 224` partidos únicos de la liga.
2. **Promedio por Partido Completo**:
   - `R_por_juego = Total_R / Total_Partidos_Unicos` (equivale a `2 * (Total_R / Total_Team_Games)`).
3. **Cálculo de Innings Pitched (IP)**:
   - Sumar primero outs totales: `outs = floor(ip) * 3 + round((ip - floor(ip)) * 10)`.
   - `total_ip_decimal = total_outs / 3`.
   - Formato IP canónico: `floor(total_ip_decimal) + (total_outs % 3) / 10`.
4. **Compatibilidad Estricta**: No alterar los tipos existentes sin mantener backward-compatibility.
5. **Idioma**: Toda la interfaz en español.
