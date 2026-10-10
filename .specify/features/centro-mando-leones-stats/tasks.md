# Tasks: Centro de Mando — Suite de Pestañas y Leones Stats

**Identificador**: `centro-mando-leones-stats`  

---

## Tareas de Implementación

- [ ] **T1: Modelado de Tipos TypeScript**
  - Crear `src/types/leones-stats.ts` con `LeonesAdvancedStats`, `WeeklyRecord`, `GameMVP`, `LastGameDetail`, `TrendGameItem`, `BatterLeaderItem`, `PitcherLeaderItem`, `BroadcastChannelRecord`.
- [ ] **T2: Motor de Datos y Cálculos Sabermétricos**
  - Implementar `src/lib/leones-stats-service.ts` con funciones de agregación para:
    - `getLeonesAdvancedStats()`
    - `getWeeklyRecords()`
    - `getLastGameDetail()`
    - `getRecentTrends()`
    - `getCaracasTeamLeaders()`
    - `getBroadcastChannelRecords()` (cruce de transmisiones y resultados, excluyendo BeisbolPlay).
- [ ] **T3: Componente `LeonesStatsTab` (Fidelidad Imagen Usuario + Canales TV)**
  - Implementar `src/components/dashboard/tabs/leones-stats-tab.tsx`:
    - Grid de 3 columnas para Condiciones, Situaciones de Presión/Decisiones y Días de Semana.
    - Sub-panel de Récord por Canal de Transmisión con logos de canales y badge de BeisbolPlay.
    - Tabla interactiva de semanas ISO con G, P, PCT, CF, CP, DIF, Récord.
- [ ] **T4: Componente `LastGameTab`**
  - Implementar `src/components/dashboard/tabs/last-game-tab.tsx`:
    - Marcador cara a cara del último partido con logos oficiales y resultado final.
    - Tarjeta destacada de ⭐ MVP de Leones con WPA y métricas desglosadas.
- [ ] **T5: Componentes `TrendsTab` y `TeamLeadersTab`**
  - Implementar `src/components/dashboard/tabs/trends-tab.tsx` (Últimos 10 juegos con W/L).
  - Implementar `src/components/dashboard/tabs/team-leaders-tab.tsx` (Líderes de bateo y pitcheo con tarjetas destacadas).
- [ ] **T6: Conmutador `DashboardTabs` e Integración en `page.tsx`**
  - Implementar `src/components/dashboard/dashboard-tabs.tsx` con tabs responsivas.
  - Integrar en `src/app/page.tsx` con paso de datos por SSR/ISR.
- [ ] **T7: Compilación, Verificación y Despliegue en Edge**
  - Ejecutar `npm run build` en `republicaraquista-web`.
  - Push a GitHub para detonar el despliegue automático en Vercel.
