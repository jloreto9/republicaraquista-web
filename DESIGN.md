# DESIGN.md — REPUBLICARAQUISTAPP (Plan de Evolución Visual Anti-AI Slop)

> **Estado:** Planificado para ejecutar al cierre de la temporada LVBP 2026–2027 (temporada muerta).
> **Objetivo:** Migrar la interfaz desde la plantilla genérica de dashboard SaaS oscuro (*glassmorphism + glow dorado + `font-mono` ubicuo + tarjetas burbuja*) hacia una identidad propia de **analítica deportiva editorial y broadcast de estadio**, sin alterar pipelines de datos, esquemas Supabase ni lógica de negocio.

---

## 1. Línea Base — Auditoría Anti-AI Slop (`src/`)

Escaneo realizado sobre `src/**/*.tsx` y `src/**/*.css` bajo los criterios de **Impeccable / Craft Floor**:

| Patrón detectado | Ocurrencias | Problema visual |
|---|---:|---|
| `text-slate-400` / `text-slate-500` | 1,234 | Gris neutro sobre fondo navy (`#070B19`); apaga el contraste y ensucia la paleta. |
| `font-mono` | 1,028 | Usado como "disfraz técnico" en botones, links, subtítulos y categorías del sidebar. |
| `text-[9px]` / `text-[10px]` | 623 | Exceso de micro-etiquetas, kickers y píldoras que compiten por atención. |
| `shadow-lg/xl/2xl` y `shadow-[0_0_*]` | 190 | *Glow* dorado artificial en tarjetas y estados activos. |
| `uppercase tracking-*` | 174 | Sobrecarga tipográfica en mayúsculas espaciadas. |
| `rounded-2xl` / `rounded-3xl` | 131 | Estética blanda de burbuja SaaS en lugar de precisión técnica deportiva. |
| `animate-ping` / `animate-pulse` | 46 | Animaciones activas en elementos estáticos (selector de temporada, banner promocional). |
| `bg-gradient-to-*` / `glass-panel` | 44 | Degradados y `backdrop-blur` que reducen legibilidad en vistas densas de datos. |

### Hallazgos puntuales en la portada actual
1. **Tipografía sin sistema cohesionado (`src/app/layout.tsx`, `src/app/globals.css`):** Se cargan 4 fuentes de Google (`Geist`, `Geist_Mono`, `Righteous`, `Jura`), pero `@theme` no mapea `--font-sans` ni `--font-display`. Faltan estilos de superficies nativas (`::selection`, `caret-color`, `:focus-visible`).
2. **Banner promocional SaaS (`src/app/page.tsx`):** Kicker con punto `animate-ping`, degradado de fondo, borde con glow dorado y CTA en `font-mono`.
3. **KPIs genéricos (`src/components/dashboard/kpi-summary.tsx`):** 5 tarjetas casi idénticas con ícono decorativo arriba a la derecha (repitiendo `Flame` en *Diferencial de Carreras* y *Racha Actual*) y glow en la primera caja.
4. **Ruido en Shell (`src/components/layout/sidebar.tsx`, `src/components/layout/header.tsx`):** Índices `01`/`02`/`03` en mono, glow en ítem activo, punto `animate-pulse` en el dropdown de temporada y badge `CAR` redundante en el header.

---

## 2. Dirección Estética Objetivo — Editorial + Broadcast de Estadio

Referencias de lenguaje visual: *Baseball Savant*, *The Athletic*, *FanGraphs* y graficación *MLB Network*, anclados a la identidad histórica de **Leones del Caracas**.

### Principios de Superficie y Geometría
- **Capas planas por luminosidad**, nunca glassmorphism ni glows.
- **Divisores nítidos de `1px` (*hairlines*)** en lugar de tarjetas anidadas (*cards in cards*).
- **Esquinas afiladas:** máximo `rounded-md` / `rounded-lg` (`6px–8px`); eliminar `rounded-2xl` / `rounded-3xl` en contenedores de datos.

### Sistema de Tokens Propuesto (`src/app/globals.css`)

```css
@theme {
  /* Superficies (navy profundo por capas, sin blur ni glow) */
  --color-surface-canvas: #070B19;
  --color-surface-raised: #0D152B;
  --color-surface-elevated: #121D3A;
  --color-border-subtle: #1D2B4E;
  --color-border-strong: #2A3D6B;

  /* Tinta entintada en azul (cero gris neutro sobre navy; contraste WCAG AA >= 4.5:1) */
  --color-ink-primary: #F4F7FC;
  --color-ink-secondary: #9BAAD0;
  --color-ink-muted: #7082AD;

  /* Señal de marca (uso deliberado, nunca decorativo) */
  --color-accent-gold: #FDB827;
  --color-accent-gold-hover: #E5A31A;
  --color-accent-caracas: #002D62;

  /* Estados semánticos */
  --color-signal-live: #22C55E;
  --color-signal-positive: #34D399;
  --color-signal-negative: #F87171;
}
```

### Sistema Tipográfico
- **Display (títulos de vista, marcadores, encabezados de sección):** Sans condensada atlética (*Barlow Condensed* o *Oswald*, pesos `600`/`700`). Reemplaza `Righteous` y `Jura`.
- **UI / Cuerpo:** *Geist* (o *Plus Jakarta Sans*), tamaño base legible; erradicar micro-texto `< 11px` salvo encabezados de tabla muy compactos.
- **Datos numéricos:** `font-variant-numeric: tabular-nums` en la fuente principal o `font-mono` **estrictamente** en columnas numéricas, slash lines (`AVG/OBP/SLG`), marcadores y deltas. **Prohibido** en botones, enlaces o títulos.

### Reglas Innegociables (*Craft Floor*)
- Sin *eyebrow/kicker chips* flotantes sobre títulos.
- Sin texto en gradiente ni `shadow-[0_0_*]` en contenedores pasivos.
- Sin tarjetas dentro de tarjetas.
- Sin `animate-ping` / `animate-pulse` fuera de un juego realmente `LIVE`.
- Sin emojis como iconos de UI (mantener Lucide con grosor consistente).
- Superficies nativas tematizadas: `::selection`, `caret-color`, `scrollbar-color` y `:focus-visible`.
- Transiciones breves (`150–250ms`) con `cubic-bezier(0.16, 1, 0.3, 1)`.
- Mantener invariantes de dominio LVBP: idioma 100% español, cero terminología Statcast/Hawk-Eye, visibilidad estricta de `ELO` solo en la columna correspondiente de *Probabilidades de Clasificación por Franquicia*.

---

## 3. Hoja de Ruta por Fases (Temporada Muerta)

### Fase 1 — Sistema de Diseño Base
- **Archivos:** `src/app/globals.css`, `src/app/layout.tsx`.
- **Acciones:**
  - Implementar tokens semánticos en `@theme`.
  - Sustituir `Righteous` + `Jura` por la fuente Display condensada y enlazar `--font-display`, `--font-sans`, `--font-mono`.
  - Eliminar `.glass-panel-glow` y reducir `.glass-panel` solo a overlays estrictos si hicieran falta.
  - Agregar `::selection`, `caret-color`, `:focus-visible` y utilidad `.tabular-data`.

### Fase 2 — Shell de Navegación
- **Archivos:** `src/components/layout/sidebar.tsx`, `src/components/layout/header.tsx`, `src/components/layout/mobile-nav.tsx`, `src/components/layout/bottom-nav.tsx`.
- **Acciones:**
  - Sidebar: eliminar índices `01/02/03`, quitar glow del enlace activo y usar indicador sólido izquierdo de `2px` en `#FDB827` + superficie elevada plana.
  - Header: eliminar el punto `animate-pulse` del selector de temporada y el badge redundante `CAR`; mejorar jerarquía del título con fuente Display.

### Fase 3 — Piloto Visual en el Centro de Mando
- **Archivos:** `src/app/page.tsx`, `src/components/dashboard/kpi-summary.tsx`, `src/components/dashboard/live-hero-game-card.tsx`, `src/components/dashboard/scoreboard.tsx`.
- **Acciones:**
  - Reemplazar las 5 tarjetas de `KPISummary` por una **tira de marcador horizontal unificada** con divisores verticales de `1px` y cero íconos repetidos.
  - Sustituir el banner promocional degradado por una franja editorial limpia o acceso directo en el header/calendario.
  - Quitar `font-mono` de CTAs y enlaces; validar contraste WCAG AA en desktop (`1280px+`), tablet (`768px`) y móvil (`390px`).

### Fase 4 — Propagación Sistémica
- **Vistas:** Standings, Game Center, Individuales, Colectivas, Matchup, WPA/RE24, Situacional, Spray Charts, Bullpen, Pitching, Park Factors, Calendario, NotiCueva y Tipster Hub.
- **Acciones:**
  - Migrar `text-slate-400/500` a tokens `--color-ink-secondary` / `--color-ink-muted`.
  - Estandarizar tablas (encabezados nítidos, `tabular-nums`, hover sutil, fila de Leones destacada con acento limpio en `#FDB827`).
  - Preservar intactos la lógica de datos, tests unitarios (`src/lib/__tests__/`), contratos Supabase y el exportador Canvas HD 2400×2400.

---

## 4. Criterios de Verificación al Ejecutar
- `npm run lint` y `npm run build` sin errores.
- Suite de tests existente pasando sin regresiones.
- Revisión visual en los 3 viewports clave (`390px`, `768px`, `1280px+`) comprobando contraste, densidad y ausencia de desbordes.
- Reducción medible en el re-escaneo de anti-patrones (`font-mono` fuera de métricas, `text-slate-400/500`, `shadow-[0_0_*]`, `animate-pulse` estático).
