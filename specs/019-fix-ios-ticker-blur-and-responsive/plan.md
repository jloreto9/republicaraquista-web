# Plan Técnico: Feature 019 - Fix iOS Ticker Blur y Responsive Safe Areas

## 1. Arquitectura y Enfoque de Modificación
- **Fuente de verdad**: Se modifican directamente los 4 componentes de presentación involucrados en `src/components/layout/` y `src/components/radio/`.
- **Enfoque Ponytail**: Cambio mínimo, eliminación de abstracciones superfluas (`backdrop-blur` innecesario en un bloque estático) y soporte a variables de entorno nativas de CSS (`env(safe-area-inset-top)` y `env(safe-area-inset-bottom)`).

## 2. Archivos Afectados
1. `src/components/layout/live-ticker.tsx`: Reemplazo de backdrop-filter por fondo sólido y `antialiased transform-gpu`.
2. `src/components/layout/mobile-nav.tsx`: Adición de padding top y cálculo de altura dinámica con `env(safe-area-inset-top, 0px)`.
3. `src/components/layout/header.tsx`: Cambio de clase a `relative lg:sticky top-0 z-20`.
4. `src/components/radio/radio-player.tsx`: Actualización de posición `bottom` en móvil con `env(safe-area-inset-bottom, 0px)`.

## 3. Plan de Rollback
Los cambios son reversibles mediante `git checkout` de los 4 archivos modificados.
