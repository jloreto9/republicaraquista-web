# Plan Técnico: Feature 018 Mobile-First Optimization

## 1. Archivos Afectados
- `src/components/layout/bottom-nav.tsx`: Componente nuevo para la barra inferior.
- `src/components/layout/mobile-nav.tsx`: Integración del trigger de apertura de drawer compartido.
- `src/app/layout.tsx`: Inyección de `BottomNav` y padding de scroll `pb-36`.
- `src/components/radio/radio-player.tsx`: Elevación sobre el `BottomNav` (`bottom-20`).
- `src/components/standings/standings-table.tsx`: Columnas esenciales y acordeón de fila expandible.
- `src/components/game-center/boxscore-lineups-tab.tsx`: Columnas esenciales en móvil.
- `src/components/dashboard/live-hero-game-card.tsx`: Ajustes táctiles móviles.

## 2. Guardrails
- Compatibilidad desktop completa (`lg:hidden` en bottom nav, `hidden lg:flex` en sidebar).
- Zero regression en TypeScript y Turbopack (`npm run build`).
