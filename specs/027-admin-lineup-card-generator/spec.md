# Spec 027: Generador Admin de Tarjeta de Lineup Oficial (1080×1920 HD) y Push 1-Click

**Slug:** `027-admin-lineup-card-generator`  
**Autor:** Spec-Kit Swarm & Jorge Leonardo Loreto  
**Fecha:** 2026-11-16  
**Estado:** Especificado (Fase 1 de Spec-Kit)  
**Relacionados:** [Spec 011](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/011-web-push-notifications/spec.md) · [Spec 026](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/026-realtime-postgame-sync/spec.md) · [`src/lib/game-feed-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/game-feed-service.ts) · [`src/lib/probabilidades-card-canvas.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/probabilidades-card-canvas.ts) · [`src/components/noticueva/noticueva-admin.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/noticueva/noticueva-admin.tsx) · [`src/components/admin/push-broadcast-panel.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/admin/push-broadcast-panel.tsx)

---

## 1. Contexto y Problema

El equipo editorial de **REPUBLICARAQUISTAPP** publica diariamente la alineación titular de **Leones del Caracas** en redes sociales (Instagram Stories, X, estados de WhatsApp) y notifica a los suscriptores vía Web Push (`NotiCueva Admin`). Actualmente este flujo requería armado manual en diseño gráfico externo y redacción separada del aviso push en `PushBroadcastPanel`:

1. **Ausencia de extracción unificada para tarjeta vertical 9:16:** Aunque `extractTeamGameLineupFromFeed` (`src/lib/game-feed-service.ts`) ya lee alineaciones desde MLB Stats API, faltaba un servicio dedicado que normalice posiciones al español (`DH -> BD`), nombres cortos de los 7 rivales de la LVBP, formato compacto de fecha (`14NOV`) y hora (`8:00PM`), cruce con transmisión y estadio de `src/data/calendar_2026_27.json`, y extracción prioritaria del lanzador abridor.
2. **Falta de renderizador Canvas HD 1080×1920 sobre la plantilla oficial:** No existía un motor en cliente (`HTMLCanvasElement`) que superpusiera dinámicamente los datos del juego sobre `/assets/lineup-template-bg.jpg` con actualización instantánea al editar campos manualmente.
3. **Sin despacho push 1-Click ni auto-detección segura de lineup oficial:** El administrador debía copiar manualmente el orden al bate para enviar notificaciones en `topic: "news_roster"` hacia `/api/push/send`, y no contaba con sondeo seguro en segundo plano (sin bucles en `useEffect`) mientras espera que MLB Stats API publique el lineup oficial del día.

---

## 2. Requerimientos Funcionales

### RF-01: Asset de Plantilla y Servicio Backend de Lineup (`src/lib/lineup-card-service.ts`, `src/app/api/noticueva/lineup-card/route.ts`)
- Almacenar la plantilla base oficial en `public/assets/lineup-template-bg.jpg`.
- Definir e exportar los contratos tipados:
  - `LineupCardSlot`: `{ order: number; position: string; playerName: string; playerId?: number }`
  - `LineupCardGameOption`: `{ gamePk: number; date: string; dateShort: string; timeDisplay: string; opponentId: number; opponentName: string; opponentShort: string; isHome: boolean; status: string; isToday: boolean; stadiumName: string; transmissionLine1: string; transmissionLine2: string }`
  - `LineupCardPayload`: `{ gamePk: number; date: string; dateShort: string; timeCompact: string; opponentId: number; opponentName: string; opponentShort: string; isHome: boolean; status: string; hasOfficialLineup: boolean; slots: LineupCardSlot[]; pitcherName: string; transmissionLine1: string; transmissionLine2: string; stadiumName: string; availableGames: LineupCardGameOption[] }`
- Exportar funciones puras de normalización y formato:
  - `normalizeLineupPosition(pos?: string): string`: convierte `"DH"` a `"BD"`; para el resto retorna mayúsculas sin espacios laterales (con fallback seguro).
  - `formatOpponentShortName(opponentIdOrName: number | string): string`: mapea los 7 rivales oficiales de la LVBP a su nombre corto en mayúsculas sin tildes (`AGUILAS`, `CARDENALES`, `CARIBES`, `MAGALLANES`, `BRAVOS`, `TIBURONES`, `TIGRES`).
  - `formatShortSpanishDate(isoDate: string): string`: transforma `"YYYY-MM-DD"` a `<día sin cero a la izquierda><MES 3 LETRAS>` en español (`"2026-11-14"` → `"14NOV"`, `"2026-10-05"` → `"5OCT"`, `"2026-12-01"` → `"1DIC"`).
  - `formatCompactTime(timeDisplay?: string): string`: compacta la hora eliminando el espacio antes de AM/PM (`"8:00 PM"` → `"8:00PM"`).
  - `formatTransmissionLines(rawTransmission?: string): { line1: string; line2: string }`: separa por coma, excluye `BeisbolPlay` y `La Mega` de los canales lineales; si existen canales lineales produce `line1 = "TRANSMISIÓN " + linearChannels.map(c => c.toUpperCase()).join(", ") + ","` (o `"TRANSMISIÓN OFICIAL"` si no hay canales lineales) y `line2 = "BeisbolPlay, La Mega"`.
  - `formatStadiumBannerName(rawStadium?: string): string`: retorna en mayúsculas removiendo signos diacríticos en vocales (ej. `"Estadio Monumental Simón Bolívar"` → `"ESTADIO MONUMENTAL SIMON BOLIVAR"`).
  - `formatPlayerDisplayName(rawName?: string): string`: retorna en mayúsculas removiendo acentos en vocales (`ÁÉÍÓÚÜ` → `AEIOUU`) pero **preservando estrictamente la letra `Ñ`** (ej. `"Leandro Cedeño"` → `"LEANDRO CEDEÑO"`, `"Víctor Bericoto"` → `"VICTOR BERICOTO"`).
- Exportar `getLineupCardData(targetGamePk?: number, season = 2026): Promise<LineupCardPayload>`:
  - Consultar `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=${season}&hydrate=lineups,probablePitcher` (`AbortSignal.timeout(8000)`, `next: { revalidate: 15 }`) y cruzar por `officialDate` con `src/data/calendar_2026_27.json` (con degradación controlada al calendario local si MLB Stats API falla o viene vacío).
  - Priorizar en `availableGames` los juegos de Leones del Caracas (`695`): primero juego de hoy en hora VET (`getVenezuelanToday()`) o en vivo, luego el próximo juego programado más cercano, luego juegos recientes en orden descendente.
  - Consultar `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live` (`AbortSignal.timeout(8000)`, `next: { revalidate: 15 }`) para el `gamePk` seleccionado y extraer la alineación de 9 titulares reutilizando `extractTeamGameLineupFromFeed` (y respaldo `scheduleGame.lineups`), normalizando posiciones (`DH -> BD`) y nombres (`formatPlayerDisplayName`). Si hay `< 9` titulares oficiales (`hasOfficialLineup = false`), proveer 9 slots editables vacíos `order: 1..9` con posiciones base (`LF`, `CF`, `RF`, `BD`, `3B`, `SS`, `2B`, `1B`, `C`).
  - Resolver lanzador abridor de Leones en orden de prioridad:
    1. `feed?.gameData?.probablePitchers?.[isHome ? "home" : "away"]?.fullName`
    2. `scheduleGame?.teams?.[isHome ? "home" : "away"]?.probablePitcher?.fullName`
    3. Primer lanzador en `feed?.liveData?.boxscore?.teams?.[isHome ? "home" : "away"]?.pitchers?.[0]` (buscando en `boxscore.players['ID'+id]?.person?.fullName` o `gameData.players['ID'+id]?.fullName`)
    4. `"POR ANUNCIAR"`
  - Formatear el nombre del lanzador con `formatPlayerDisplayName`.
- Exponer el endpoint `GET /api/noticueva/lineup-card` (`export const dynamic = "force-dynamic"`):
  - Leer `gamePk` y `season` de `searchParams`, invocar `getLineupCardData(gamePk, season)` y responder `{ success: true, data }` con cabecera `Cache-Control: no-store, max-age=0`.

### RF-02: Motor Canvas HD 1080×1920 (`src/lib/lineup-card-canvas.ts`)
- Definir `LineupCardRenderData`, `LINEUP_CARD_WIDTH = 1080`, `LINEUP_CARD_HEIGHT = 1920`, `SCALE = 1080 / 576` (`1.875`) y `ROW_CYS = [278, 334, 389, 444, 503, 558, 613.5, 668.5, 724]`.
- Cargar `/assets/lineup-template-bg.jpg` (o `customBgSrc` opcional) con caché en memoria de `HTMLImageElement` por URL/origen para evitar parpadeo durante edición en vivo, y degradado de respaldo (`#041421` → `#071F32`) si falla la imagen.
- Exportar `renderLineupCardOnCanvas(canvas, data, customBgSrc?)` y `generateLineupCardBlob(data, customBgSrc?)` dibujando las 5 zonas escaladas por `SCALE`:
  1. Encabezado `LINE UP ` (`#C59D4D`) + `VS` (`#FFFFFF`) y rival (`data.opponentShort`) con auto-ajuste de fuente dentro de `255 * SCALE`.
  2. 9 filas de bateadores (píldora de posición `rgba(116, 101, 61, 0.84)` + texto de posición centrado + nombre del bateador alineado a la izquierda con sombra sutil).
  3. Píldora dinámica de lanzador (`PITCHER: <NOMBRE>`).
  4. Pie izquierdo de transmisión (`transmissionLine1`, `transmissionLine2`) y pie derecho de fecha/hora (`dateShort`, `timeCompact`).
  5. Banner inferior de estadio (`stadiumName`).

### RF-03: Panel Admin en NotiCueva (`src/components/admin/lineup-card-generator-panel.tsx`, `src/components/noticueva/noticueva-admin.tsx`)
- Renderizar `<LineupCardGeneratorPanel adminPassword={password} />` dentro de la vista autenticada de `NotiCuevaAdmin`, justo encima de `<PushBroadcastPanel adminPassword={password} />`.
- Cargar `/api/noticueva/lineup-card` al montar y al cambiar el juego seleccionado.
- Si `isToday && !hasOfficialLineup`, activar un temporizador de polling cada 30 segundos controlado mediante `useRef` y pausado cuando `document.visibilityState !== "visible"` (sin colocar estado mutado por fetch en dependencias de `useEffect`, Lección 5). Si llega el lineup oficial (`hasOfficialLineup === true`), poblar automáticamente los 9 slots y el lanzador salvo que el usuario haya editado manualmente (`isDirtyRef`).
- Incluir selector de juegos (`availableGames`), botón `"Sincronizar MLB API"`, input opcional `"Cambiar fondo"`, editor compacto en vivo (rival, 9 slots con selector de posición `LF, CF, RF, 3B, SS, 2B, 1B, C, BD` e input de nombre, lanzador, líneas 1 y 2 de transmisión, fecha, hora y estadio) y vista previa `<canvas>` (`aspect-[9/16] w-full max-w-[340px]`).
- Proveer 4 botones de acción:
  1. **Descargar PNG HD (1080×1920)** con nombre `lineup-leones-vs-${opponentShort.toLowerCase()}-${dateShort.toLowerCase()}.png`.
  2. **Copiar Imagen** vía `navigator.clipboard.write` (`ClipboardItem`).
  3. **Compartir** vía `navigator.share` con archivo PNG `File` y mensaje de respaldo si el navegador no soporta Web Share Files.
  4. **1-Click: Enviar Push de Lineup** vía `POST /api/push/send` con cabecera `x-admin-key: adminPassword`, `topic: "news_roster"`, `title: "🦁 Lineup Oficial vs ${opponentShort} (${timeCompact})"`, cuerpo con los 9 bateadores y lanzador, y `url: "/game-center?gamePk=" + gamePk`.

---

## 3. Invariantes y Guardrails Obligatorios

1. **Idioma y Copy Deportivo Limpio (Lección 3):** Todo texto visible en el panel admin, botones, alertas y notificaciones debe estar en español deportivo directo, con **cero ocurrencias** de `"sabermétrico"`, `"sabermétrica"` o `"sabermetría"`.
2. **Normalización Horaria VET (UTC-4) y `officialDate` (Lección 4):** El emparejamiento entre `/schedule` de MLB Stats API y `calendar_2026_27.json` así como la detección de `isToday` deben usar `officialDate` y `getVenezuelanToday()`.
3. **Prevención de Bucles Infinitos en Polling React (Lección 5):** Prohibido incluir estado mutado por el fetch de `/api/noticueva/lineup-card` en el arreglo de dependencias de `useEffect`. El intervalo de 30s debe gestionarse vía `useRef` y respetar `document.visibilityState === "visible"`.
4. **Reglas Tipográficas en Español para Tarjeta:** `DH` siempre se normaliza a `BD`; las vocales con tilde se limpian a ASCII en nombres y estadios (`Víctor Bericoto` → `VICTOR BERICOTO`, `Estadio Monumental Simón Bolívar` → `ESTADIO MONUMENTAL SIMON BOLIVAR`), pero `Ñ`/`ñ` se preserva intacta (`Leandro Cedeño` → `LEANDRO CEDEÑO`).
5. **Acceso Defensivo y Timeouts:** Toda lectura de objetos externos de MLB Stats API debe usar optional chaining / fallbacks seguros y `AbortSignal.timeout(8000)`.
6. **Seguridad en Push:** El envío push desde el cliente debe reenviar `x-admin-key: adminPassword` hacia `/api/push/send` sin hardcodear claves en código fuente.

---

## 4. Criterios de Aceptación

1. **CA-01 (Normalización y Formateadores):** `normalizeLineupPosition("DH") === "BD"` (además de `LF`, `CF`, `RF`, `3B`, `SS`, `2B`, `1B`, `C`), `formatOpponentShortName` cubre los 7 rivales de la LVBP, `formatShortSpanishDate` convierte `"2026-11-14"` → `"14NOV"` (y casos OCT/DIC), `formatCompactTime("8:00 PM") === "8:00PM"`, `formatTransmissionLines("IVC, BeisbolPlay")` retorna `{ line1: "TRANSMISIÓN IVC,", line2: "BeisbolPlay, La Mega" }`, `formatStadiumBannerName("Estadio Monumental Simón Bolívar") === "ESTADIO MONUMENTAL SIMON BOLIVAR"`, y `formatPlayerDisplayName` preserva `Ñ` mientras limpia tildes en vocales.
2. **CA-02 (Orquestación `getLineupCardData`):** Con `globalThis.fetch` simulando `/schedule?hydrate=lineups,probablePitcher` y `/feed/live`, retorna `hasOfficialLineup === true`, 9 titulares ordenados con `"BD"` normalizado, nombre formateado del lanzador abridor, transmisión/hora/estadio del calendario y metadatos del juego.
3. **CA-03 (Renderizado Canvas HD y Panel Admin):** `lineup-card-canvas.ts` genera tarjetas 1080×1920 con caché de imagen; `LineupCardGeneratorPanel` se renderiza sobre `PushBroadcastPanel` en `noticueva-admin.tsx`, soporta edición en vivo, descarga, copia, compartir, polling seguro de 30s y push 1-Click.
4. **CA-04 (Calidad y Compilación):** `npx tsx src/lib/__tests__/lineup-card.test.ts` pasa al 100%, `npx eslint` sobre los archivos nuevos/modificados no introduce errores y `npm run build` compila sin errores.
