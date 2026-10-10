# Implementation Plan: Centro de Mando — Suite de Pestañas y Leones Stats

**Identificador**: `centro-mando-leones-stats`  
**Prioridad**: Alta  
**Rama**: `main`  
**Estado**: Listo para Ejecución  

---

## 1. Contexto Técnico y Arquitectura

- **Framework**: Next.js 16 (App Router) con React 19 y TypeScript 5.
- **Estilos**: Tailwind CSS v4, tema Dark Navy (`#070B19`), Tarjetas Glassmorphism (`#0D152B`), Acentos dorados Caraquistas (`#FDB827`), Borde `#1E2B4D`.
- **Archivos Afectados / Creados**:
  - `src/types/leones-stats.ts`: Interfaces tipadas para estadísticas avanzadas, semanas ISO, MVP, tendencias y líderes.
  - `src/lib/leones-stats-service.ts`: Proveedor y motor de cálculo de `LeonesAdvancedStats`, `WeeklyRecord`, `GameMVP`, `Trends` y `Leaders`, reutilizando los datos existentes de `games`, `batting_stats`, `pitching_stats` y `wpa-engine.ts`.
  - `src/components/dashboard/dashboard-tabs.tsx`: Componente contenedor cliente para el conmutador de 4 pestañas: `Último Juego`, `Tendencias`, `Líderes del Equipo` y `Leones Stats`.
  - `src/components/dashboard/tabs/last-game-tab.tsx`: Subcomponente con el último marcador cara a cara y tarjeta de ⭐ MVP de Leones con WPA y Clutch.
  - `src/components/dashboard/tabs/trends-tab.tsx`: Subcomponente con la tabla de los Últimos 10 Juegos y badges verde/rojo.
  - `src/components/dashboard/tabs/team-leaders-tab.tsx`: Subcomponente con líderes de bateo y pitcheo de Leones con tarjetas destacadas.
  - `src/components/dashboard/tabs/leones-stats-tab.tsx`: Subcomponente con la cuadrícula de 3 columnas (la pantalla exacta de la captura del usuario) y tabla de semanas ISO.
  - `src/app/page.tsx`: Integración de `DashboardTabs` en la página principal del Centro de Mando inmediatamente debajo de los KPIs de resumen.

---

## 2. Validación de Constitución y Principios

- **No romper nada**: Se preservan el banner del calendario oficial 2026-2027, los KPIs ejecutivos (`KPISummary`), el scoreboard cara a cara y las posiciones de campeonato.
- **Cero Statcast en LVBP**: Todo cálculo se basa en eventos de anotación, carreras, innings, decisiones de pitcheo y matriz Tango RE24.
- **Créditos y Branding**: Mantenimiento estricto del sello `@republicaraquista • Jorge Leonardo Loreto` en pie de página y metadatos.
- **Resiliencia Defensiva**: Manejo de nulos, carga asíncrona limpia y tipado estricto.

---

## 3. Fases de Implementación

- **Fase 1: Modelado y Tipos**: Crear `src/types/leones-stats.ts`.
- **Fase 2: Motor de Servicio y Datos**: Crear `src/lib/leones-stats-service.ts` con cálculo determinístico de estadísticas situacionales, desglose semanal ISO, MVP de WPA y líderes del equipo.
- **Fase 3: Componentes de UI por Pestaña**:
  - `src/components/dashboard/tabs/leones-stats-tab.tsx` (Grid de 3 columnas + tabla de semanas).
  - `src/components/dashboard/tabs/last-game-tab.tsx` (Último juego + MVP WPA).
  - `src/components/dashboard/tabs/trends-tab.tsx` (Últimos 10 juegos).
  - `src/components/dashboard/tabs/team-leaders-tab.tsx` (Líderes de bateo y pitcheo).
- **Fase 4: Conmutador Principal e Integración en `/`**:
  - `src/components/dashboard/dashboard-tabs.tsx`.
  - Integrar en `src/app/page.tsx`.
- **Fase 5: Verificación de Build y Pruebas**:
  - Ejecutar `npm run build` en `republicaraquista-web`.
  - Validar renderizado responsivo y conmutación fluida.
- **Fase 6: Despliegue Git / Vercel**:
  - `git add`, `git commit` y `git push origin main`.
