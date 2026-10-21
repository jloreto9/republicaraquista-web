# Implementation Plan: 008 - Totales y Promedios por Juego de la Liga en Colectivas

**Feature Directory**: `specs/008-colectivas-league-totals-averages`  
**Target Repository**: `republicaraquista-web`  
**Dependencies**: `src/lib/collective.ts`, `src/types/collective.ts`, `src/components/colectivas/colectivas-view.tsx`

---

## 1. Arquitectura Técnica

```
[MLB Stats API / Supabase]
            │
            ▼
   src/lib/collective.ts
            │
            ├─► 1. getCollectiveStats(season, phase)
            │      ├─ batting (8 equipos) ──► calculateLeagueBattingSummary()
            │      ├─ pitching (8 equipos) ─► calculateLeaguePitchingSummary()
            │      └─ fielding (8 equipos) ─► calculateLeagueFieldingSummary()
            │
            ▼
   src/types/collective.ts
            │
            ├─► CollectiveStatsResult
            │      ├─ battingSummary: { total, perGame, perTeamGame }
            │      ├─ pitchingSummary: { total, perGame, perTeamGame }
            │      └─ fieldingSummary: { total, perGame, perTeamGame }
            │
            ▼
   src/components/colectivas/colectivas-view.tsx
            │
            ├─► <tfoot> en Tabla de Bateo (Fila 1: Total Liga | Fila 2: Promedio por Juego)
            ├─► <tfoot> en Tabla de Pitcheo (Fila 1: Total Liga | Fila 2: Promedio por Juego)
            ├─► <tfoot> en Tabla de Fildeo (Fila 1: Total Liga | Fila 2: Promedio por Juego)
            └─► Switch/Pestaña de apoyo: Visualización "Totales" vs "Por Juego (Por Equipo)"
```

---

## 2. Definición Matemática Rigurosa

### 2.1. Partidos Únicos de la Liga
- Cada partido disputado contabiliza 1 juego para el equipo local y 1 juego para el visitante.
- $\text{Total Partidos Únicos} = \max\left(1, \text{round}\left(\frac{\sum_{i=1}^{8} \text{games}_i}{2}\right)\right)$.
- En temporada regular LVBP estándar con 8 equipos y 56 juegos por club:
  $$\text{Team-Games} = 448 \implies \text{Partidos Únicos} = 224$$

### 2.2. Bateo de la Liga
- **Volumen Total**: Suma directa $\sum \text{PA}, \sum \text{AB}, \sum \text{R}, \sum \text{H}, \sum \text{2B}, \sum \text{3B}, \sum \text{HR}, \sum \text{RBI}, \sum \text{BB}, \sum \text{SO}, \sum \text{SB}, \sum \text{LOB}$.
- **Ratios Sabermétricos de la Liga**:
  - $\text{AVG} = \frac{\sum \text{H}}{\sum \text{AB}}$
  - $\text{OBP} = \frac{\sum \text{H} + \sum \text{BB}}{\sum \text{PA}}$
  - $\text{SLG} = \frac{\sum \text{TB}}{\sum \text{AB}}$, donde $\text{TB} = (\text{H} - \text{2B} - \text{3B} - \text{HR}) + 2\cdot\text{2B} + 3\cdot\text{3B} + 4\cdot\text{HR}$
  - $\text{OPS} = \text{OBP} + \text{SLG}$
  - $\text{BABIP} = \frac{\sum \text{H} - \sum \text{HR}}{\max(1, \sum \text{AB} - \sum \text{SO} - \sum \text{HR})}$
- **Promedio por Partido Completo (Per Game)**:
  - $\text{Stat}_{\text{per\_game}} = \frac{\sum \text{Stat}}{\text{Partidos Únicos}}$
  - Los ratios ($\text{AVG}, \text{OBP}, \text{SLG}, \text{OPS}, \text{BABIP}$) permanecen constantes con el ratio ponderado global.

### 2.3. Pitcheo de la Liga
- **Conversión de Innings Pitched (IP)**:
  - $\text{Outs}_i = \lfloor \text{IP}_i \rfloor \cdot 3 + \text{round}((\text{IP}_i - \lfloor \text{IP}_i \rfloor) \cdot 10)$
  - $\text{Total Outs} = \sum \text{Outs}_i$
  - $\text{Total IP Decimal} = \frac{\text{Total Outs}}{3}$
  - $\text{Total IP Canónico} = \lfloor \text{Total IP Decimal} \rfloor + \frac{\text{Total Outs} \pmod 3}{10}$
- **Ratios de Pitcheo de la Liga**:
  - $\text{ERA} = \frac{9 \cdot \sum \text{ER}}{\text{Total IP Decimal}}$
  - $\text{WHIP} = \frac{\sum \text{BB} + \sum \text{H}}{\text{Total IP Decimal}}$
  - $\text{K/9} = \frac{9 \cdot \sum \text{SO}}{\text{Total IP Decimal}}$
  - $\text{BB/9} = \frac{9 \cdot \sum \text{BB}}{\text{Total IP Decimal}}$
  - $\text{K/BB} = \frac{\sum \text{SO}}{\max(1, \sum \text{BB})}$
  - $\text{BAA} = \frac{\sum \text{H}}{\text{Total AB oponentes estimado}}$

### 2.4. Fildeo de la Liga
- **Volumen Total**: Suma de $\text{PO}, \text{A}, \text{E}, \text{TC}, \text{DP}, \text{TP}, \text{PB}, \text{CS}, \text{SB}$.
- **Ratios Defensivos**:
  - $\text{FPCT} = \frac{\sum \text{PO} + \sum \text{A}}{\max(1, \sum \text{TC})}$
  - $\text{CS\%} = \frac{\sum \text{CS}}{\max(1, \sum \text{CS} + \sum \text{SB})}$
  - $\text{RF/9} = \frac{9 \cdot (\sum \text{PO} + \sum \text{A})}{\max(1, \text{Total Innings Decimal})}$

---

## 3. Plan de Archivos a Modificar

1. `src/types/collective.ts`:
   - Extender `CollectiveStatsResult` agregando `battingSummary`, `pitchingSummary`, `fieldingSummary`.
   - Definir interfaces auxiliares `LeagueSummaryRow<T>`.

2. `src/lib/collective.ts`:
   - Implementar cálculo de resúmenes en `getCollectiveStats()`.
   - Incorporar formateo numérico seguro (evitando NaN o división entre 0).

3. `src/components/colectivas/colectivas-view.tsx`:
   - Añadir `<tfoot>` estilizado en las tablas de Bateo, Pitcheo y Fildeo.
   - Fila 1: Total Liga (Acumulado) con borde superior `border-t-2 border-[#FDB827]/40`, fondo `bg-[#070B19]/90`.
   - Fila 2: Promedio por Juego (Partido Completo) con fondo `bg-[#0B1224]/80`, texto `text-slate-300`, badges distintivos.
   - Incorporar toggle o tab para consultar promedios por equipo.

4. Verificación y Testing:
   - Validación de compilación Next.js (`npm run build`).
   - Verificación de consistencia visual responsive en móviles y pantallas anchas.
