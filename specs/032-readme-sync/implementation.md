# Informe de Implementación 032: Sincronización Integral del `README.md`

**Slug:** `032-readme-sync`  
**Fecha:** 2026-11-16  
**Estado:** Implementado y Sincronizado (Converged)

---

## 1. Actualizaciones Realizadas en [`README.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/README.md)

- **Nuevas rutas y módulos añadidos:** `/park-factors` (*Factores de Parque*), `/admin` (incluyendo *Generador de Tarjeta Oficial de Lineup HD*), `/privacidad`, `/privacy` y `/terms`.
- **Capacidades actualizadas en vistas existentes:**
  - `/`: Live Ticker LVBP, sincronización canónica post-partido con write-through atómico, extrainnings y series particulares.
  - `/game-center`: Hoja de Anotación (Scorecard Oficial), Win Probability en vivo y envío directo del lineup al Optimizador Tom Tango.
  - `/individuales`: Pestañas *Premios (MVP y Pitcher del Año)*, *Splits*, *Fildeo* y *Buscador por Rango de Fechas* con calificación dinámica y comparativa interanual ($\Delta$).
  - `/colectivas`: Totales de Liga, Promedios por Juego (`/JJ` y `9 Inn`), `GIDP` y Buscador por rango de fechas.
  - `/bullpen`: Optimizador Tom Tango y *Mejor Lineup Posible sobre Roster Activo*.
  - `/spray-charts`: Evaluador *Would It Dong?* (`HR en X/8` estadios).
  - `/standings`: Nomenclatura actualizada a **Posiciones** y **Power Rankings** (conservando la columna `ELO` únicamente en la tabla de *Probabilidades de Clasificación por Franquicia* del simulador).
  - Categoría principal actualizada a **Analítica Avanzada**.
- **Árbol `src/app/api/` completado:** Añadidos `notifications/`, `park-factors/`, `push/broadcast-scoring/`, `stats/fielding/`, `ticker/`, `noticueva/route.ts` y `noticueva/lineup-card/`.
- **Stack, pruebas y specs:** Añadidos `@vercel/analytics`, `lucide-react`, `SUPABASE_SERVICE_ROLE_KEY`, comandos reales de ejecución de pruebas (`npx tsx` y `node`) y referencia a `specs/`.

---

## 2. Verificación

- Verificadas todas las rutas en `src/app/**/page.tsx` (20 páginas) y `src/app/api/**/route.ts` (33 endpoints).
- Sin cambios en código de aplicación (`README.md` y `specs/032-readme-sync/` únicamente).
