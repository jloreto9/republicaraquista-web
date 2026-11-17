# Spec 031: Factores de Parque Empíricos de la LVBP (`/park-factors`)

**Slug:** `031-lvbp-park-factors`  
**Autor:** Jorge Leonardo Loreto & Antigravity  
**Fecha:** 2026-11-16  
**Estado:** Especificado (Track 2: Spec-Driven Development)  
**Repositorio:** `republicaraquista-web` (Next.js 16 / React 19 / TypeScript)  
**Relacionados:** [`src/lib/stadiums-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/stadiums-service.ts) · [`src/components/layout/nav-data.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/layout/nav-data.ts)

---

## 1. Contexto y Problema

Hasta ahora la aplicación únicamente contaba con factores de parque estáticos para modelos de proyección, sin una sección dedicada dentro del grupo de analítica avanzada (`Laboratorio Sabermétrico` en el menú) que calcule y visualice los **Factores de Parque empíricos** de los estadios de la LVBP a partir de los resultados reales de juego y boxscores.

Adicionalmente, en la LVBP existen particularidades reales de calendario y sedes (ej. Tiburones de La Guaira dividiendo juegos como local entre el Estadio Universitario de Caracas y el Forum La Guaira de Macuto, o partidos ocasionales en plazas alternas como San Cristóbal) que exigen agrupar estrictamente por **estadio real (`venue`)** y controlar simultáneamente la fuerza ofensiva/pitcheo de ambos equipos en cada temporada, además de ofrecer estabilización bayesiana ante muestras pequeñas.

---

## 2. Escenarios de Usuario y Criterios de Aceptación

### Historia 1 — Cálculo Empírico de Factores de Parque por Estadio y Evento (P1)
Como usuario de República Caraquista, quiero acceder a una nueva sección **Factores de Parque** (`/park-factors`) en el menú lateral para consultar cuánto favorece o penaliza cada estadio de la LVBP a la ofensiva y al pitcheo:
- **Carreras (`R`)** calculadas sobre juegos finalizados de ronda regular (`2024`, `2025`, `2026` vía MLB Stats API `schedule` y Supabase `games`).
- **Múltiples eventos (`HR`, `H`, `2B`, `3B`, `BB`, `SO`)** calculados desde los boxscores juego a juego en Supabase (`batting_stats` + `games`, temporadas `2025` y `2026`).
- **Separación estricta por estadio real (`venue`):** distinguir explícitamente Estadio Universitario (UCV) de Estadio Jorge Luis García Carneiro (Macuto), además del Monumental Simón Bolívar, Valencia, Barquisimeto, Maracay, Maracaibo, Puerto La Cruz y Margarita.

### Historia 2 — Selector de Ventana Temporal, Estabilización y Escala (P1)
Como analista, quiero alternar entre:
- **Ventana temporal:** `Multi-Año (2024–2026)` (Carreras 3 años / Eventos `2025–2026`), `2026-27 (En Curso)`, `2025-26` y `2024-25` (solo Carreras desde MLB API).
- **Modo de cálculo:** `Estabilizado (k=30)` (regresión bayesiana hacia `1.000` / `100` para proteger estadios con pocos juegos como Macuto) vs. `Crudo (Sin regresión)`.
- **Formato de escala:** `Base 100` (ej. `122`, `100`, `90`) o `Multiplicador` (`1.22`, `1.00`, `0.90`).

### Historia 3 — Visualización Comparativa y Metadata Física del Estadio (P2)
Como aficionado, quiero ver:
- 4 tarjetas KPI resumen (*Más Ofensivo en Carreras*, *Más Jonronero (HR)*, *Más Favorable al Pitcheo* y *Líder en Dobles (2B)*).
- Tabla ordenable con logo del equipo anfitrión, ciudad, elevación (`m`), dimensiones de barda (`LF-CF-RF`), `JJ`, `R/J` y los 7 factores.
- Gráfico comparativo horizontal con línea de referencia neutra (`100` / `1.00`) y selector de métrica (`R`, `HR`, `H`, `2B`, `3B`, `BB`, `SO`).
- Guía metodológica desplegable en español claro.

---

## 3. Requerimientos Funcionales y Contrato Técnico

### RF-01: Motor `src/lib/park-factors-service.ts`
1. **Normalización de `venue`:** Mapear variantes de nombres de MLB Stats API y Supabase al identificador canónico de `LVBP_STADIUMS` (`monumental`, `universitario`, `valencia`, `barquisimeto`, `maracay`, `maracaibo`, `plc`, `macuto`, `margarita`, o slug de sede alterna si `>= 1` juego).
2. **Paginación segura en Supabase:** Leer `batting_stats` paginando en bloques de `1000` filas (evitando el límite por defecto de PostgREST) para capturar el 100% de los juegos de `2025` y `2026`.
3. **Algoritmo Iterativo Controlado por Equipos (`computeIterativeParkFactors`):**
   - Modela cada partido $g$ en temporada $s$, estadio $v$, con equipos $(h, a)$ ajustando factores $\text{Team}_{h,s}$, $\text{Team}_{a,s}$ y $\text{PF}_v$ respecto a la media $\mu_s$ de cada temporada hasta convergencia (40 iteraciones), normalizando el promedio ponderado por juegos de la liga a `1.000`.
   - Calcula $\text{PF}_{\text{reg}} = \frac{n \cdot \text{PF}_{\text{raw}} + k \cdot 1.0}{n + k}$ con $k = 30$.
4. **Caché en memoria con TTL:** Cachear resultados por `scope` (`15 min` si incluye temporada activa `2026`, `6 horas` para temporadas cerradas `2024`/`2025`) para respuesta sub-segundo en navegación.

### RF-02: Endpoint `/api/park-factors`
- `GET /api/park-factors?scope=multi|2026|2025|2024`
- Retorna HTTP `400` si `scope` no es válido y HTTP `200` con `ParkFactorsResponse` + cabecera `Cache-Control` (`max-age=3600, s-maxage=3600` en cerradas; `max-age=300, s-maxage=300` en activa/multi).

### RF-03: Navegación y Página `/park-factors`
- Registrar `{ name: "Factores de Parque", href: "/park-factors", icon: Landmark }` dentro de `"Laboratorio Sabermétrico"` en `src/components/layout/nav-data.ts`.
- Implementar `src/app/park-factors/page.tsx` y `src/components/park-factors/park-factors-view.tsx`.

---

## 4. Invariantes y Guardrails
1. **Idioma 100% español.**
2. **Prohibición de jerga en UI nueva:** Cero ocurrencias de `"sabermétrico"`, `"sabermétrica"` o `"sabermetría"` en `park-factors-service.ts`, `route.ts`, `page.tsx` y `park-factors-view.tsx`.
3. **Cero regresión:** No modificar `probabilidades-engine.ts` ni las rutas existentes.
4. **Cero credenciales hardcodeadas y paginación defensiva en Supabase.**
