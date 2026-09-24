# Tasks: Fase 5 - Módulos de Juego Avanzado (WPA, Situacional & Spray Charts)

- [x] **Tarea 1: Tipos y Contratos TypeScript**
  - [x] 1.1 Crear `src/types/wpa.ts` con interfaces para jugadas WPA, estados de base-out, apalancamiento LI, juego y líderes.
  - [x] 1.2 Crear `src/types/situational.ts` con interfaces para splits situacionales, slash line, LOB Tracker y BvP.
  - [x] 1.3 Crear `src/types/spray.ts` con interfaces para coordenadas Gameday, modelo BIS, mapa 3x3 y métricas de disciplina.

- [x] **Tarea 2: Motores Analíticos Sabermétricos (`src/lib/`)**
  - [x] 2.1 Implementar `src/lib/wpa-engine.ts` con matriz Tango RE24, cálculo de Win Expectancy, Leverage Index y parseo de juego.
  - [x] 2.2 Implementar `src/lib/situational-engine.ts` con clasificador de contextos, cálculo de slash line y tracking LOB.
  - [x] 2.3 Implementar `src/lib/spray-engine.ts` con transformación geométrica a pies, clasificador de dureza BIS y zona 3x3.

- [x] **Tarea 3: API Route Handlers (`src/app/api/`)**
  - [x] 3.1 Implementar `src/app/api/wpa/route.ts` para consulta de WPA por juego y líderes de temporada.
  - [x] 3.2 Implementar `src/app/api/situacional/route.ts` para agregación de splits situacionales y LOB.
  - [x] 3.3 Implementar `src/app/api/spray/route.ts` para extracción de coordenadas de batazos y pitcheos.

- [x] **Tarea 4: Componentes de Visualización e Interfaz de Usuario**
  - [x] 4.1 Implementar `src/components/wpa/wpa-chart.tsx` (gráfico interactivo SVG de curva de probabilidad).
  - [x] 4.2 Implementar `src/components/wpa/wpa-view.tsx` (orquestador de vista WPA con selector de juegos y tablas).
  - [x] 4.3 Implementar `src/components/situacional/situacional-view.tsx` (orquestador de Splits, LOB Tracker y BvP).
  - [x] 4.4 Implementar `src/components/spray/baseball-diamond.tsx` (lienzo SVG del diamante con barda, bases y batazos BIS).
  - [x] 4.5 Implementar `src/components/spray/strike-zone-heatmap.tsx` (mapa de calor 3x3 de zona de strike y disciplina).
  - [x] 4.6 Implementar `src/components/spray/spray-view.tsx` (orquestador de vista con selector de bateador y modos de color).

- [x] **Tarea 5: Páginas Server Components & Navegación Global**
  - [x] 5.1 Crear `src/app/wpa/page.tsx` con ISR.
  - [x] 5.2 Crear `src/app/situacional/page.tsx` con ISR.
  - [x] 5.3 Crear `src/app/spray-charts/page.tsx` con ISR.
  - [x] 5.4 Activar rutas en `src/components/layout/sidebar.tsx` y `src/components/layout/mobile-nav.tsx` removiendo los badges "Fase 5".

- [x] **Tarea 6: Validación, Build y Despliegue en Producción**
  - [x] 6.1 Ejecutar `npx tsc --noEmit` y `npm run lint`.
  - [x] 6.2 Ejecutar `npm run build` garantizando generación de rutas estáticas.
  - [x] 6.3 Commit descriptivo en español y push a GitHub (`main`).
  - [x] 6.4 Verificación HTTP 200 en Vercel para `/wpa`, `/situacional` y `/spray-charts`.
