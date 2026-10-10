# Implementation Plan: Splits Individuales Exhaustivos en Stats Individuales

**Identificador**: `individuales-splits`  
**Prioridad**: Alta  
**Rama**: `main`  
**Estado**: Pendiente de Aprobación por Usuario (Planning Mode)  

---

## 1. Contexto Técnico y Arquitectura

- **Framework**: Next.js 16 (App Router) con React 19 y TypeScript 5.
- **Estilos**: Tailwind CSS v4, tema Dark Navy (`#070B19`), Glassmorphism (`#0D152B`), Acentos dorados Caraquistas (`#FDB827`), Borde `#1E2B4D`.
- **Archivos Afectados / Creados**:
  - `src/types/player-splits.ts`: [NEW] Tipos TypeScript para los splits individuales de bateadores y lanzadores.
  - `src/lib/player-splits-service.ts`: [NEW] Servicio backend y motor de agregación de splits desde Supabase y PBP.
  - `src/app/api/stats/player-splits/route.ts`: [NEW] API Route serverless para consultar splits bajo demanda con revalidación y caché.
  - `src/components/stats/splits/player-splits-view.tsx`: [NEW] Vista completa e interactiva de splits individuales con selector de jugador, avatar, tarjetas de KPIs y tablas por categoría.
  - `src/components/stats/splits/split-table-group.tsx`: [NEW] Subcomponente reutilizable de tabla sabermétrica para cada grupo de splits (Contexto, Situacional, Platoon, Rivales, Meses).
  - `src/components/stats/individuales-view.tsx`: [MODIFY] Integrar la pestaña `⚡ Splits Situacionales` junto a Bateo, Pitcheo y Fildeo, e incorporar el botón de acción en cada fila de las tablas principales.
  - `src/components/stats/batting-table.tsx`: [MODIFY] Agregar botón `⚡ Splits` en cada fila que notifica al componente padre para cambiar a la pestaña de splits con el ID del jugador seleccionado.
  - `src/components/stats/pitching-table.tsx`: [MODIFY] Agregar botón `⚡ Splits` en cada fila.

---

## 2. Validación de Constitución y Principios

- **No romper nada**: Se preservan al 100% las vistas existentes de Bateo Sabermétrico, Pitcheo y Fildeo.
- **Cero Statcast en LVBP**: Solo métricas oficiales de caja y PBP clásico (PA, AB, H, 2B, 3B, HR, RBI, BB, SO, AVG, OBP, SLG, OPS, ERA, WHIP).
- **Créditos canónicos**: Sello canónico `@republicaraquista • Jorge Leonardo Loreto`.
- **Rendimiento Edge**: Caché local en memoria y revalidación ISR para consultas sub-segundo.

---

## 3. Fases de Implementación

- **Fase 1: Tipado y Modelado (`src/types/player-splits.ts`)**:
  - Crear interfaces `PlayerSplitRow`, `PitcherSplitRow`, `PlayerSplitsProfile`.
- **Fase 2: Motor de Servicio (`src/lib/player-splits-service.ts`)**:
  - Agregar algoritmo de extracción y cálculo de splits cruzando `batting_stats` / `pitching_stats` con `games`.
  - Integrar splits situacionales PBP (RISP, 2 Outs, Bases Llenas, Platoon).
- **Fase 3: Endpoint Serverless (`src/app/api/stats/player-splits/route.ts`)**:
  - Exponer endpoint GET seguro con validación de parámetros y fallback robusto.
- **Fase 4: Componentes de UI de Splits (`src/components/stats/splits/`)**:
  - Crear `split-table-group.tsx` con diseño estilizado y ordenamiento.
  - Crear `player-splits-view.tsx` con selector reactivo de jugador, avatares y métricas.
- **Fase 5: Integración en `/individuales`**:
  - Actualizar `individuales-view.tsx`, `batting-table.tsx` y `pitching-table.tsx` para interconectar pestañas y navegación.
- **Fase 6: Verificación de Build & Pruebas**:
  - Compilación exitosa con `npm run build`.
- **Fase 7: Despliegue Git / Vercel**:
  - `git commit` y `git push origin main`.
