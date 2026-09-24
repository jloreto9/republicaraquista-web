# Implementation Plan: Pitching Summary & Telemetría

**Identificador**: `pitching-summary-telemetry`  
**Prioridad**: Alta  
**Rama**: `main`  
**Estado**: Listo para Tareas  

---

## 1. Contexto Técnico y Arquitectura

- **Framework**: Next.js 16 (App Router) con React 19 y TypeScript 5.
- **Estilos y Componentes**: Tailwind CSS v4, Lucide React icons, paleta oficial Dark Navy (`#070B19`), Tarjetas Glassmorphism (`#0D152B`), Acentos Dorados Caraquistas (`#FDB827`), Borde dorado sutil (`#1E2B4D`).
- **Visualización**: SVG interactivo y Recharts para gráficos en pantalla; HTML5 Canvas de ultra-alta definición (2400x2400 px, fondo blanco pulcro `#FFFFFF` a 300 DPI) para exportación directa de tarjetas cuadradas PNG con diseño oficial 1:1 de Thomas Nestico (@TJStats), idéntica a la implementación de Reflex y Streamlit.
- **Endpoints Serverless**:
  - `src/app/api/pitching/search/route.ts`
  - `src/app/api/pitching/game-logs/route.ts`
  - `src/app/api/pitching/game-data/route.ts`
  - `src/app/api/pitching/season-data/route.ts`
- **Páginas y Componentes**:
  - `src/app/pitching/page.tsx`
  - `src/components/pitching/pitching-view.tsx`
  - `src/components/pitching/pitching-search.tsx`
  - `src/components/pitching/pitching-header.tsx`
  - `src/components/pitching/pbp-panel.tsx`
  - `src/components/pitching/statcast-panel.tsx`
  - `src/lib/pitch-card-canvas.ts`
- **Navegación e Integración**:
  - Actualización de `src/components/layout/sidebar.tsx`
  - Actualización de `src/components/layout/mobile-nav.tsx`
  - Enlaces contextuales en `src/components/stats/pitching-table.tsx` y `src/components/bullpen/bullpen-view.tsx`

---

## 2. Validación de Constitución y Principios

- **No romper nada**: Se preservan intactas todas las vistas y APIs existentes.
- **Cero Statcast en LVBP**: La rama de Leones del Caracas / LVBP solo muestra métricas PBP determinísticas (destinos de pitcheos, strikes cantados, whiffs, fouls, en juego, carga de entradas, Leverage Index y splits de platoon).
- **Créditos y Branding Thomas Nestico**: Pie de página obligatorio con doble bloque: izquierda con República Caraquista y `@republicaraquista • Jorge Leonardo Loreto`; derecha con `Diseño inspirado en Thomas Nestico (@TJStats)` y origen de datos (`Data: MLB Stats API / Gameday PBP`).
- **Timeouts Defensivos**: Todas las llamadas de red `fetch` en las API routes tienen timeouts explícitos de 6 a 10 segundos y cabeceras User-Agent para evitar bloqueos.

---

## 3. Fases de Implementación

- **Fase 1: Setup y Tipos**: Definir todas las interfaces TypeScript en `src/types/pitching.ts` y constantes de repertorio (colores canónicos de pitcheo).
- **Fase 2: Motor de Backend y API Routes**: Crear los handlers `/api/pitching/search`, `/api/pitching/game-logs`, `/api/pitching/game-data` y `/api/pitching/season-data`.
- **Fase 3: Componentes de Búsqueda y Cabecera**: Pantalla inicial con buscador centralizado, sugerencias de Leones del Caracas y perfil con selectores.
- **Fase 4: Panel Play-by-Play Sabermétrico (LVBP)**: Boxscore en pastillas, tabla de destinos, Inning Workload, Leverage Index y Platoon Splits.
- **Fase 5: Panel Statcast y Repertorio (MLB)**: Tabla de lanzamientos con promedios, plano cartesiano de quiebre (iVB vs HB) y dispersión en zona de strike.
- **Fase 6: Exportador de Tarjeta HD Thomas Nestico (2400x2400 @ 300 DPI, Fondo Blanco Pulcro)**: Motor de dibujo canvas en `src/lib/pitch-card-canvas.ts` replicando el GridSpec 20x20 de `core/pitching_card.py` (Streamlit/Reflex) para juego y temporada.
- **Fase 7: Navegación, Enlaces Contextuales y Pulido**: Actualizar barra lateral, navegación móvil y accesos directos desde líderes individuales y bullpen.

