# Spec 040: Generador Admin de Insights para X (𝕏) con Gemini (`gemini-3.8-flash`) y Tarjeta Dato PNG

**Slug:** `040-admin-x-insights-gemini`  
**Autor:** Spec-Kit Swarm & Jorge Leonardo Loreto  
**Fecha:** 2026-11-28  
**Estado:** Especificado (Fase 1 de Spec-Kit)  
**Relacionados:** [Spec 027](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/027-admin-lineup-card-generator/spec.md) · [`src/app/api/noticueva/route.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/api/noticueva/route.ts) · [`src/lib/noticueva-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/noticueva-service.ts) · [`src/components/noticueva/noticueva-admin.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/noticueva/noticueva-admin.tsx) · [`src/lib/probabilidades-card-canvas.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/probabilidades-card-canvas.ts)

---

## 1. Contexto y Problema

El equipo editorial de **REPUBLICARAQUISTAPP** gestiona diariamente la cuenta `@RepubCaraquista` en X (antes Twitter) desde el panel administrativo `/admin` (`NotiCuevaAdmin`). Aunque ya existen herramientas de publicación de notas (`NotiCueva`), tarjetas de alineación (`Tarjeta Lineup`) y notificaciones (`Web Push`), el flujo para redactar publicaciones e hilos de alto enganche sobre **Leones del Caracas** y la **LVBP** carecía de asistencia integrada:

1. **Ausencia de síntesis editorial basada en datos reales del ecosistema:** Redactar tuits e hilos requería cruzar manualmente estadísticas de equipo, rachas, último juego, líderes ofensivos/pitcheo, historial frente a rivales y tabla de posiciones.
2. **Riesgo de alucinaciones y violaciones de reglas del dominio:** Usar un LLM genérico sin contexto estructurado ni guardrails podía inventar cifras, usar métricas Statcast inexistentes en la LVBP, mencionar términos prohibidos (`ELO`, `sabermétrico/a/sabermetría`) o atribuir erróneamente la sede de los Leones fuera del **Estadio Monumental Simón Bolívar (Caracas)**.
3. **Falta de estudio visual compacto para X (`1200×675` y `1080×1080`):** No existía un generador directo desde `/admin` para convertir el dato principal de un borrador en una **Tarjeta Dato 𝕏 (PNG)** lista para adjuntar al tuit o hilo.

---

## 2. Requerimientos Funcionales

### RF-01: Contratos Compartidos y Configuración de Entorno (`.env.example`, `src/types/x-insights.ts`)
- Actualizar `.env.example` preservando todas las variables existentes y agregando:
  - `GEMINI_API_KEY=tu-api-key-de-google-ai-studio`
  - `GEMINI_MODEL=gemini-3.8-flash`
- Definir e exportar en `src/types/x-insights.ts` el contrato compartido:
  - `XInsightFocus = "auto" | "postgame" | "tendencia" | "debate" | "hilo"`
  - `XInsightCardVisualData`: `{ kicker: string; headline: string; primaryStatValue: string; primaryStatLabel: string; comparisonText: string; sourceFooter: string }`
  - `XInsightDraft`: `{ id: string; angleLabel: string; format: "single" | "thread"; tweets: string[]; backingFact: string; engagementHook: string; pollOptions?: string[]; cardSuggestion: XInsightCardVisualData }`
  - `XInsightsContextSummary`: `{ leonesRecord: string; leonesPosition: number; streak: string; lastGameHeadline: string }`
  - `XInsightsRequestPayload`: `{ focus?: XInsightFocus; manualContext?: string; forceRefresh?: boolean; season?: number }`
  - `XInsightsResponseData`: `{ season: number; model: string; generatedAt: string; focus: XInsightFocus; cached: boolean; contextSummary: XInsightsContextSummary; drafts: XInsightDraft[] }`

### RF-02: Servicio de Contexto LVBP, Prompting XML y Cliente Gemini (`src/lib/x-insights-service.ts`)
- Implementar `collectLvbpContextSnapshot(season)` mediante `Promise.allSettled` con valores de respaldo defensivos para que el fallo parcial de una fuente nunca aborte la generación. Debe consolidar datos reales de:
  - `getStandings` (`src/lib/supabase.ts`)
  - `getLeonesAdvancedStats`, `getLastGameDetail`, `getRecentTrends`, `getCaracasTeamLeaders`, `getHeadToHeadRecords` (`src/lib/leones-stats-service.ts`)
  - `getStreaksData` (`src/lib/streaks-service.ts`)
  - `getCollectiveStats` (`src/lib/collective.ts`)
  - `fetchSeasonWpaLeaders` (`src/lib/wpa-engine.ts`)
  - Tabla de posiciones y comparativa colectiva de los 8 equipos de la LVBP.
- Exportar funciones puras testeables:
  - `buildXInsightsPrompt(snapshot, focus, manualContext?)`:
    - Estructura el prompt con delimitadores XML explícitos: `<role>`, `<constraints>`, `<focus_directive>`, `<verified_data>` y `<manual_context>`.
    - Sanitiza caracteres de control/inyección y recorta `manualContext` a un máximo de **400 caracteres**.
    - Incluye reglas explícitas: sede oficial de Leones en el **Estadio Monumental Simón Bolívar (Caracas)**, prohibición absoluta de inventar cifras fuera de `<verified_data>`, prohibición de mencionar métricas Statcast/Hawk-Eye (`Exit Velocity`, `Launch Angle`, `Barrels`, `Sprint Speed`), prohibición de usar `"ELO"` o `"sabermétrico/sabermétrica/sabermetría"`, voz deportiva en español para `@RepubCaraquista` con ganchos fuertes, CTAs de debate/encuesta y límite de `<= 280` caracteres por tuit en `tweets[]`.
  - `normalizeXInsightsResponse(rawText, snapshot, focus, model, cached)`:
    - Limpia cercas Markdown (` ```json ... ``` `) si el modelo las emite y parsea JSON de manera segura.
    - Elimina o sustituye términos prohibidos (`sabermétrico`, `sabermétrica`, `sabermetría`, `ELO`, términos Statcast) en los campos textuales devueltos.
    - Garantiza que cada elemento de `tweets[]` respete `<= 280` caracteres (truncado limpio con resguardo).
    - Provee fallbacks defensivos para `cardSuggestion`, `contextSummary` y campos parciales.
- Implementar caché en memoria (`Map`) con TTL de 5 minutos indexado por `season:focus:normalizedManualContext`, además de `clearXInsightsCache()` para pruebas unitarias.
- Implementar `generateXInsightsWithGemini(options)`:
  - Lee `process.env.GEMINI_API_KEY` y `process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash"`.
  - Ejecuta `fetch` nativo hacia `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` enviando la clave **únicamente** en la cabecera `"x-goog-api-key": apiKey` (nunca en query string).
  - Usa `AbortSignal.timeout(25000)` y `generationConfig` con `temperature: 0.75`, `responseMimeType: "application/json"` y `responseSchema` tipado.
  - Lanza errores claros en español diferenciando clave faltante, `401`/`403`, `429`, timeout o respuesta inválida.

### RF-03: Endpoint API Seguro (`src/app/api/noticueva/x-insights/route.ts`)
- Exportar `export const dynamic = "force-dynamic"`.
- Validar autenticación fail-closed siguiendo el patrón de `src/app/api/noticueva/route.ts`: leer cabecera `x-admin-key` (o `body.password` como respaldo) y comparar contra `NOTICUEVA_ADMIN_PASSWORD`; responder HTTP `401` si falta o es incorrecta.
- Implementar cooldown ligero en memoria de **4 segundos por IP cliente** cuando `forceRefresh=true`, respondiendo HTTP `429` en español con cabecera `Retry-After`.
- Validar `focus` (HTTP `400` si es inválido) y disponibilidad de `GEMINI_API_KEY` (HTTP `503` si no está configurada).
- Retornar HTTP `200` `{ success: true, data }` con cabecera `Cache-Control: no-store, max-age=0`.

### RF-04: Motor Canvas Tarjeta Dato 𝕏 (`src/lib/x-insight-card-canvas.ts`)
- Exportar `XInsightCardFormat = "landscape" | "square"`:
  - `"landscape"`: `1200×675` (feed panorámico de X).
  - `"square"`: `1080×1080` (formato cuadrado 1:1).
- Exportar `renderXInsightCardOnCanvas(canvas, cardData, format)` y `generateXInsightCardBlob(cardData, format)`.
- Diseño editorial deportivo limpio: capas planas navy `#070B19` / `#002D62`, bordes nítidos de `1px` en `#1E2B4D`, acento dorado Caracas `#FDB827`, cifras principales con `tabular-nums`, ajuste automático de líneas, logo oficial `/assets/logo.png` (carga CORS-safe) y pie `@RepubCaraquista`. Cero brillo neón artificial y cero menciones prohibidas.

### RF-05: Panel Admin `Insights 𝕏 (IA)` y Pestañas en `/admin` (`src/components/admin/x-insights-panel.tsx`, `src/components/noticueva/noticueva-admin.tsx`)
- En `NotiCuevaAdmin` (Vista 2 autenticada), agregar un selector limpio de 4 pestañas inmediatamente debajo de la barra de bienvenida:
  - `"NotiCueva"` (activa por defecto) | `"Insights 𝕏 (IA)"` | `"Tarjeta Lineup"` | `"Web Push"`
  - Preservar sin regresiones todo el estado y comportamiento existente del editor/publicaciones de NotiCueva, `<LineupCardGeneratorPanel adminPassword={password} />` y `<PushBroadcastPanel adminPassword={password} />`.
- En `XInsightsPanel` (`{ adminPassword: string }`):
  - Selector de enfoque en pills (`"Automático"`, `"Postgame"`, `"Tendencia / Dato"`, `"Debate / Polémica"`, `"Hilo 3-4 tuits"`), input opcional de contexto manual (máx. 400 caracteres), botón principal `"Generar Insights para 𝕏"` y botón `"Regenerar"` (`forceRefresh: true`).
  - Llamar a `POST /api/noticueva/x-insights` enviando `"x-admin-key": adminPassword`.
  - Mostrar barra compacta de resumen de contexto (récord, posición, racha, último juego) y 3–4 tarjetas editables con:
    - Badge de ángulo y formato (`"Post Único"` / `"Hilo N tuits"`).
    - `textarea` editable por tuit con contador de caracteres en vivo (`N / 280`, color de advertencia si supera 280).
    - `"Dato de respaldo verificado"` y `"Sugerencia de encuesta / CTA"` con botón para copiar opciones.
    - Acciones rápidas: `"Copiar texto"`, `"Abrir en 𝕏"` (`https://x.com/intent/tweet?text=...`) y `"Usar en Tarjeta PNG"`.
  - Estudio opcional inline/colapsable `"Tarjeta Dato 𝕏 (PNG)"`: toggle de formato (`1200×675` / `1080×1080`), inputs editables en vivo (`kicker`, `headline`, `primaryStatValue`, `primaryStatLabel`, `comparisonText`), vista previa `<canvas>`, y botones de **Descargar PNG** y **Copiar Imagen**.
  - Persistir el último `XInsightsResponseData` en `sessionStorage` (`"noticueva_x_insights_cache"`) para no perder borradores al cambiar de pestaña en `/admin`.

---

## 3. Invariantes y Guardrails Obligatorios

1. **Idioma y Copy Deportivo Limpio (`GEMINI.md` §1.1):** 100% en español deportivo directo; **cero ocurrencias** de `"sabermétrico"`, `"sabermétrica"`, `"sabermetría"` ni `"ELO"` en UI, tarjetas PNG, prompts o respuestas normalizadas.
2. **Prohibición Estricta de Statcast en LVBP (`GEMINI.md` §1.1):** Prohibido promover o mostrar métricas Hawk-Eye/Statcast (`Exit Velocity`, `Launch Angle`, `Barrels`, `Sprint Speed`).
3. **Sede Oficial de Leones del Caracas:** El estadio de local de Leones del Caracas es **Estadio Monumental Simón Bolívar (Caracas)**, nunca otros parques antiguos ni estadios de rivales.
4. **Cero Inventiva Numérica:** Los tuits y tarjetas deben fundamentarse exclusivamente en los datos verificados de `<verified_data>`.
5. **Seguridad de Credenciales y API (`CLAUDE.md` §13):**
   - `GEMINI_API_KEY` solo se lee en servidor y se envía en la cabecera `x-goog-api-key` (nunca en query string ni en bundles cliente).
   - `POST /api/noticueva/x-insights` valida `x-admin-key` de forma fail-closed contra `NOTICUEVA_ADMIN_PASSWORD`.
6. **Acceso Defensivo y Timeouts:** `Promise.allSettled` con fallbacks seguros para fuentes internas y `AbortSignal.timeout(25000)` para llamadas a Gemini.

---

## 4. Criterios de Aceptación

1. **CA-01 (Prompt Builder):** `buildXInsightsPrompt` incluye los bloques `<role>`, `<constraints>`, `<focus_directive>`, `<verified_data>` y `<manual_context>`, declara la regla del Estadio Monumental Simón Bolívar, prohíbe Statcast/ELO/sabermetría y sanea/trunca `manualContext` a `<= 400` caracteres.
2. **CA-02 (Normalizador Defensivo):** `normalizeXInsightsResponse` procesa JSON válido o envuelto en cercas Markdown, garantiza tuits `<= 280` caracteres, limpia términos prohibidos si el modelo los emite y aplica fallbacks seguros ante campos parciales.
3. **CA-03 (Cliente Gemini y Caché):** Con `globalThis.fetch` mockeado, `generateXInsightsWithGemini` solicita `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`, envía `x-goog-api-key` en header (no en URL), configura `responseMimeType: "application/json"`, maneja clave faltante / `429` / `401` / timeout, reutiliza caché en memoria y la omite cuando `forceRefresh=true`.
4. **CA-04 (Endpoint `/admin`, Canvas y Navegación por Pestañas):** `/api/noticueva/x-insights` aplica auth fail-closed, cooldown de 4s y códigos `401`/`400`/`429`/`503`/`200`; `x-insight-card-canvas.ts` genera tarjetas `1200×675` y `1080×1080`; `NotiCuevaAdmin` expone las 4 pestañas sin regresiones en las vistas existentes.
5. **CA-05 (Pruebas, Lint y Compilación):** `npx tsx src/lib/__tests__/x-insights.test.ts` y `npx tsx src/lib/__tests__/lineup-card.test.ts` pasan al 100%, `npx eslint` sobre los archivos nuevos/modificados pasa sin errores y `npm run build` compila limpio.
