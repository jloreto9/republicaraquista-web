# Spec 032: Sincronización Integral del `README.md` con el Estado Actual de la App

**Slug:** `032-readme-sync`  
**Autor:** Jorge Leonardo Loreto & Antigravity  
**Fecha:** 2026-11-16  
**Estado:** Especificado (Track 2: Spec-Driven Development)  
**Repositorio:** `republicaraquista-web`

---

## 1. Contexto y Objetivo

El [`README.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/README.md) quedó desactualizado respecto a las funcionalidades entregadas en los specs recientes (`003`–`031`), incluyendo nuevas rutas (`/park-factors`, `/admin` con Generador de Tarjeta de Lineup HD, `/privacidad`, `/privacy`, `/terms`), nuevas pestañas y motores (`/individuales` con Premios MVP/Pitcher del Año, Fildeo y Buscador por rango de fechas; `/bullpen` con Optimizador Tom Tango y Mejor Lineup Posible sobre Roster Activo; `/game-center` con Scorecard Oficial y envío al Optimizador; `/spray-charts` con evaluador *Would It Dong?*), nuevos endpoints (`/api/park-factors`, `/api/ticker`, `/api/notifications`, `/api/stats/fielding`, `/api/push/broadcast-scoring`, `/api/noticueva/lineup-card`), sincronización canónica post-partido con MLB Stats API, Vercel Web Analytics, comandos de pruebas reales y las convenciones actualizadas de nomenclatura (`Posiciones`, `Power Rankings`, `Analítica Avanzada`).

---

## 2. Criterios de Aceptación

1. **CA-01:** Todas las rutas en `src/app/**/page.tsx` y endpoints en `src/app/api/**/route.ts` quedan documentados fielmente.
2. **CA-02:** Se incorporan las capacidades nuevas de cada módulo (`/individuales`, `/colectivas`, `/park-factors`, `/bullpen`, `/game-center`, `/spray-charts`, `/admin`, `/`, globales).
3. **CA-03:** Se respeta la nomenclatura vigente (`Posiciones`, `Power Rankings` sin "ELO", `Analítica Avanzada`, `ELO` exclusivamente como columna en *Probabilidades de Clasificación por Franquicia*).
4. **CA-04:** Se documentan las instrucciones reales de pruebas (`npx tsx` / `node`) y `npm run build` sin romper formato ni enlaces.
