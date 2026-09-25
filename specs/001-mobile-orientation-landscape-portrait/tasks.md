# Tasks: Mobile Responsive Orientation (Landscape / Portrait Mode)

> **Feature**: `001-mobile-orientation-landscape-portrait`  
> **App**: `republicaraquista-web`  
> **Status**: Ready for Implementation  

---

## Task List

- [x] **Task 1: Desbloquear orientación en PWA Manifests**
  - Archivos: [`public/manifest.json`](file:///c:/Users/Administrator/Projets/republicaraquista-web/public/manifest.json), [`src/app/manifest.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/manifest.ts)
  - Acción: Cambiar `"orientation": "portrait"` por `"orientation": "any"`.

- [x] **Task 2: Configurar Viewport con Cover y Safe Areas**
  - Archivos: [`src/app/layout.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/layout.tsx), [`src/app/globals.css`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/globals.css)
  - Acción: Añadir `viewportFit: "cover"` al objeto `viewport`. Configurar soporte de `safe-area-inset-left` y `safe-area-inset-right` para evitar colisiones con el notch/isla dinámica en landscape.

- [x] **Task 3: Crear Hook React de Detección de Orientación Móvil**
  - Archivo: `src/hooks/use-orientation.ts`
  - Acción: Implementar hook cliente `useOrientation()` que retorne `{ isLandscape, isMobileLandscape }` combinando `window.matchMedia('(orientation: landscape)')` y umbral de altura `innerHeight <= 520`.

- [x] **Task 4: Adaptar Barra de Navegación Móvil para Landscape**
  - Archivo: [`src/components/layout/mobile-nav.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/layout/mobile-nav.tsx), [`src/app/globals.css`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/globals.css)
  - Acción: Reducir altura e íconos en apaisado (`landscape-compact-nav` y `landscape-compact-header` a 42px) para liberar el 88%+ de la pantalla útil a los datos.

- [x] **Task 5: Optimizar Vista `/pitching` en Landscape Móvil**
  - Archivo: [`src/components/pitching/pitching-game-logs-table.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/pitching/pitching-game-logs-table.tsx)
  - Acción: Permitir que la tabla de 10 juegos se despliegue a ancho completo con las 15 columnas legibles cuando el teléfono se gire a horizontal con tip de orientación en vertical.

- [x] **Task 6: Optimizar Vista `/wpa` y `/spray-charts` en Landscape Móvil**
  - Archivos: [`src/components/wpa/wpa-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/wpa/wpa-view.tsx), [`src/components/spray/spray-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/spray/spray-view.tsx)
  - Acción: Reconfigurar cuadrantes de KPIs a `grid-cols-2 landscape:grid-cols-4 md:grid-cols-4` para consolidar métricas en una fila en modo horizontal.

- [x] **Task 7: Pruebas de Verificación y Demostración**
  - Acción: Compilación exitosa con `next build` y generación de reporte en `implementation.md`.
