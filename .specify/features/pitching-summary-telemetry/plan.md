# Implementation Plan: Pitching Summary & Telemetría

**Identificador**: `pitching-summary-telemetry`  
**Prioridad**: Alta  
**Rama**: `main`  
**Estado**: Listo para Tareas  

---

## 1. Contexto Técnico y Arquitectura

- **Framework**: Next.js 16 (App Router) con React 19 y TypeScript 5.
- **Estilos y Componentes**: Tailwind CSS v4, Lucide React icons, paleta oficial Dark Navy (`#070B19`), Tarjetas Glassmorphism (`#0D152B`), Acentos Dorados Caraquistas (`#FDB827`), Borde dorado sutil (`#1E2B4D`).
- **Visualización**: SVG interactivo y Recharts para gráficos de movimiento, strike zone, apalancamiento y carga por entrada; HTML5 Canvas de ultra-alta definición (2400x1350 px a escala 2x / 300 DPI) para exportación directa de tarjetas panorámicas PNG estilo Thomas Nestico.
- **Endpoints Serverless**:
  - `src/app/api/pitching/search/route.ts`
  - `src/app/api/pitching/game-logs/route.ts`
  - `src/app/api/pitching/game-data/route.ts`
- **Páginas y Componentes**:
  - `src/app/pitching/page.tsx`
  - `src/components/pitching/pitching-view.tsx`
  - `src/components/pitching/pitching-search.tsx`
  - `src/components/pitching/pitching-header.tsx`
  - `src/components/pitching/pbp-panel.tsx`
  - `src/components/pitching/statcast-panel.tsx`
  - `src/components/pitching/pitch-card-canvas.ts`
- **Navegación e Integración**:
  - Actualización de `src/components/layout/sidebar.tsx`
  - Actualización de `src/components/layout/mobile-nav.tsx`
  - Enlaces contextuales en `src/components/individuales/individuales-view.tsx` y `src/components/bullpen/bullpen-view.tsx`

---

## 2. Validación de Constitución y Principios

- **No romper nada**: Se preservan intactas todas las vistas y APIs existentes.
- **Cero Statcast en LVBP**: La rama de Leones del Caracas / LVBP solo muestra métricas PBP determinísticas (destinos de pitcheos, strikes cantados, whiffs, fouls, en juego, carga de entradas, Leverage Index y splits de platoon).
- **Créditos y Branding**: Footer obligatorio con créditos a `@republicaraquista • Jorge Leonardo Loreto` y atribución metodológica a Thomas Nestico (@TJStats).
- **Timeouts Defensivos**: Todas las llamadas de red `fetch` en las API routes tienen timeouts explícitos de 6 a 10 segundos y cabeceras User-Agent para evitar bloqueos.

---

## 3. Fases de Implementación

- **Fase 1: Setup y Tipos**: Definir todas las interfaces TypeScript en `src/types/pitching.ts` y constantes de repertorio (colores canónicos de pitcheo).
- **Fase 2: Motor de Backend y API Routes**: Crear los handlers `/api/pitching/search`, `/api/pitching/game-logs` y `/api/pitching/game-data` con soporte para MLB Stats API y LVBP.
- **Fase 3: Componentes de Búsqueda y Cabecera**: Pantalla inicial con buscador centralizado, sugerencias de Leones del Caracas y perfil con selector de salidas.
- **Fase 4: Panel Play-by-Play Sabermétrico (LVBP)**: Boxscore en pastillas, tabla de destinos, Inning Workload, Leverage Index y Platoon Splits.
- **Fase 5: Panel Statcast y Repertorio (MLB)**: Tabla de lanzamientos con promedios, plano cartesiano de quiebre (iVB vs HB) y dispersión en zona de strike.
- **Fase 6: Exportador de Tarjeta HD (300 DPI)**: Motor de dibujo canvas 16:9 con descarga en PNG.
- **Fase 7: Navegación, Enlaces Contextuales y Pulido**: Actualizar barra lateral, navegación móvil y accesos directos desde líderes individuales y bullpen.
