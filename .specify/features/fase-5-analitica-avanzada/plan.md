# Plan de Implementación: Fase 5 - Módulos de Juego Avanzado (Next.js en Vercel)

## 1. Arquitectura Técnica
- **Stack:** Next.js 15 (App Router, Server Components + Client Components), TypeScript, Tailwind CSS, Lucide React.
- **Visualización Vectorial:** Gráficos SVG interactivos en tiempo real con renderizado reactivo para:
  - Curva de Win Expectancy & WPA (área dual con umbral en 50%).
  - Diamante geométrico de Spray Chart (proporciones de estadio real con campo verde, líneas de cal blancas, arco de infield y barda a escala de pies).
  - Matriz 3x3 de Zona de Strike con dispersión de lanzamientos y mapa de calor.
- **Fuentes de Datos:**
  - Snapshots locales precacheados en `src/data/` para carga en <10ms.
  - Consumo directo en servidor de MLB Stats API (`https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live`) para detalles de jugadas, coordenadas y lanzamientos.
  - Endpoints REST Next.js Route Handlers (`/api/wpa`, `/api/situacional`, `/api/spray`) con revalidación y headers de caché Edge.

## 2. Estructura de Archivos a Crear / Modificar
```
src/
├── types/
│   ├── wpa.ts                  # Tipos para jugadas WPA, matriz RE24, apalancamiento LI
│   ├── situational.ts          # Tipos para splits situacionales, LOB Tracker y BvP
│   └── spray.ts                # Tipos para coordenadas Gameday, modelo BIS y Zona 3x3
├── lib/
│   ├── wpa-engine.ts           # Matriz Tango RE24, Win Expectancy, Leverage Index y parseo
│   ├── situational-engine.ts   # Agregador de splits, cálculo de slash line, tracker LOB
│   └── spray-engine.ts         # Transformación gameday a pies, clasificador BIS, zona 3x3
├── app/
│   ├── api/
│   │   ├── wpa/route.ts        # Route handler para WPA por juego y líderes de temporada
│   │   ├── situacional/route.ts# Route handler para splits y LOB
│   │   └── spray/route.ts      # Route handler para batazos y lanzamientos
│   ├── wpa/page.tsx            # Vista de Win Expectancy & WPA (Server Component ISR)
│   ├── situacional/page.tsx    # Vista de Splits Situacionales & LOB (Server Component ISR)
│   └── spray-charts/page.tsx   # Vista de Spray Charts & Strike Zone (Server Component ISR)
└── components/
    ├── layout/
    │   ├── sidebar.tsx         # Activación de enlaces /wpa, /situacional, /spray-charts
    │   └── mobile-nav.tsx      # Activación en menú móvil
    ├── wpa/
    │   ├── wpa-chart.tsx       # Gráfico interactivo SVG de Win Expectancy
    │   └── wpa-view.tsx        # Vista cliente con selectores, KPIs y tablas
    ├── situacional/
    │   └── situacional-view.tsx# Vista con tabs Splits, LOB Tracker y BvP
    └── spray/
        ├── baseball-diamond.tsx# Lienzo SVG del diamante con modelo BIS
        ├── strike-zone-heatmap.tsx # Mapa 3x3 de zona de strike y disciplina
        └── spray-view.tsx      # Vista cliente con selector de bateador y filtros
```

## 3. Plan de Verificación
1. `npx tsc --noEmit` para verificar 0 errores de tipado TypeScript.
2. `npm run lint` para garantizar 0 errores de linting.
3. `npm run build` para validar generación de páginas estáticas e ISR.
4. `git commit` descriptivo en español y `git push origin main`.
5. Verificación HTTP 200 en Vercel con `curl.exe` defensivo.
