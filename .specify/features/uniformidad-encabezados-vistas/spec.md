# Feature Specification: Uniformidad Tipográfica y Estructural de Encabezados en Todas las Vistas

## 1. Visión y Justificación del Problema
En la plataforma **REPUBLICARAQUISTAPP**, existe una disparidad visible en la presentación tipográfica y arquitectónica de los encabezados entre las diferentes vistas de la aplicación:
- **Vistas Canónicas (Consistentes):**
  - `/` (Centro de Mando)
  - `/standings` (Posiciones & ELO)
  - `/individuales` (Líderes Individuales)
  Utilizan el componente oficial `<Header>` (`src/components/layout/header.tsx`), montado sobre un contenedor `<div className="flex-1 flex flex-col min-h-screen">` con barra superior adhesiva (`sticky top-0 z-20`), píldora de estatus de temporada con indicador pulsante esmeralda (`Temporada 2025 (2025-26)`), mini-badge oficial de Leones (`CAR`) y tipografía canónica (`text-sm sm:text-base font-bold text-slate-100 tracking-tight`, subtítulo `text-[11px] sm:text-xs text-slate-400 font-normal`).
- **Vistas Divergentes (A Estandarizar):**
  - `/matchup` (Matchup 360)
  - `/colectivas` (Estadísticas Colectivas)
  - `/bullpen` (Bullpen & Lineups)
  - `/wpa` (Win Expectancy & WPA)
  - `/situacional` (Splits Situacionales & LOB Tracker)
  - `/spray-charts` (Spray Charts & Strike Zone)
  Carecían del componente `<Header>` unificado y utilizaban encabezados ad-hoc (`h1` con `font-black text-xl md:text-2xl` o tarjetas internas de tamaño dispar), rompiendo la coherencia visual al navegar entre secciones.

---

## 2. Requerimientos de Estandarización Universal

Todas las 9 páginas de la aplicación deben implementar exactamente la misma jerarquía estructural y tipográfica:

```tsx
<div className="flex-1 flex flex-col min-h-screen">
  <Header
    title="{TITULO_CANONICO}"
    subtitle="{SUBTITULO_CANONICO}"
    season={2025}
  />
  <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
    {/* Contenido de la vista */}
  </main>
</div>
```

### Catálogo Canónico de Títulos y Subtítulos:

| Ruta | Título Canónico (`title`) | Subtítulo Canónico (`subtitle`) |
|---|---|---|
| `/` | `Centro de Mando` | `Temporada Regular LVBP • Leones del Caracas` |
| `/standings` | `Posiciones & ELO` | `Expectativa Pitagórica • Simulador de Clasificación • Power Rankings` |
| `/individuales` | `Líderes Individuales` | `Estadísticas Tradicionales & Sabermetría • LVBP` |
| `/matchup` | `Matchup 360 (H2H)` | `Comparador Sabermétrico Cara a Cara • Radar Polar 8D • LVBP` |
| `/colectivas` | `Estadísticas Colectivas` | `Comparativa de los 8 Equipos • Bateo, Pitcheo y Fildeo LVBP` |
| `/bullpen` | `Bullpen & Lineups` | `Herencia de Corredores (IR/IRS) • Dugout Scorecard 1-9 • Matriz de Alineaciones` |
| `/wpa` | `Win Expectancy & WPA` | `Probabilidad de Victoria • Matriz Tango RE24 • Apalancamiento (Leverage Index)` |
| `/situacional` | `Splits Situacionales & LOB Tracker` | `Rendimiento en Presión (RISP, Clutch, Bases Llenas) • Dejados en Base • BvP` |
| `/spray-charts` | `Spray Charts & Strike Zone` | `Geometría Espacial en Diamante • Modelo BIS de Dureza • Zona 3x3` |

---

## 3. Modificaciones Específicas por Archivo

1. **`src/app/matchup/page.tsx`**:
   - Importar y montar `<Header title="Matchup 360 (H2H)" subtitle="..." season={2025} />`.
   - Eliminar el bloque anterior de título ad-hoc (`MATCHUP 360 HEAD-TO-HEAD`).
   - Envolver el contenido en `<main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">`.

2. **`src/app/colectivas/page.tsx`**:
   - Importar y montar `<Header title="Estadísticas Colectivas" subtitle="..." season={2025} />`.
   - Eliminar el bloque anterior de título ad-hoc (`ESTADÍSTICAS COLECTIVAS LVBP`).
   - Envolver el contenido en `<main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">`.

3. **`src/app/bullpen/page.tsx`**:
   - Importar y montar `<Header title="Bullpen & Lineups" subtitle="..." season={2025} />`.
   - Eliminar el bloque anterior de título ad-hoc (`BULLPEN & TRACKER LINEUPS 1-9`).
   - Envolver el contenido en `<main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">`.

4. **`src/app/wpa/page.tsx` & `src/components/wpa/wpa-view.tsx`**:
   - Montar `<Header title="Win Expectancy & WPA" subtitle="..." season={2025} />` en `src/app/wpa/page.tsx`.
   - En `src/components/wpa/wpa-view.tsx`, remover la tarjeta de título duplicada y mantener el selector de partido integrado de manera limpia en la barra de controles.

5. **`src/app/situacional/page.tsx` & `src/components/situacional/situacional-view.tsx`**:
   - Montar `<Header title="Splits Situacionales & LOB Tracker" subtitle="..." season={2025} />` en `src/app/situacional/page.tsx`.
   - En `src/components/situacional/situacional-view.tsx`, remover la tarjeta de título duplicada.

6. **`src/app/spray-charts/page.tsx` & `src/components/spray/spray-view.tsx`**:
   - Montar `<Header title="Spray Charts & Strike Zone" subtitle="..." season={2025} />` en `src/app/spray-charts/page.tsx`.
   - En `src/components/spray/spray-view.tsx`, remover la tarjeta de título duplicada y mantener el selector de bateador integrado elegantemente.

---

## 4. Criterios de Aceptación
1. **Uniformidad tipográfica 100%:** Al transitar por cualquiera de las 9 rutas, la fuente, peso, tracking, espaciado, píldora de estado y badge de Leones son exactamente idénticos y fijos en la barra superior.
2. **Cero duplicación de encabezados:** Ninguna vista renderiza un `h1` alternativo dentro del cuerpo de la página cuando el `<Header>` ya provee el título oficial de la sección.
3. **Cero regresiones:** `npx tsc --noEmit` y `npm run lint` pasan con 0 errores y 0 warnings.
4. **Build y Despliegue Exitosos:** `npm run build` compila limpiamente y el despliegue en Vercel responde con `HTTP 200 OK` en todas las rutas.
