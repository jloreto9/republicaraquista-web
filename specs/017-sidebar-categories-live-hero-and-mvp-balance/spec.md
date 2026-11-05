# Especificación de Feature 017: Menú Lateral por Categorías, Live Hero en Centro de Mando y Balance Equitativo de MVP

## 1. Resumen Ejecutivo
Esta feature aborda 3 necesidades críticas de UX y análisis sabermétrico en **República Caraquista Web**:
1. **Reorganización Estructurada del Menú Lateral**: Agrupación del menú plano de 14 items en 3 categorías temáticas claras y profesionales en Desktop (`Sidebar`) y Móvil (`MobileNav`).
2. **Centro de Mando Live Hero Game Center**: Implementación de una tarjeta destacada superior en el `Centro de Mando` (`/`) que resume el juego en curso o más reciente (marcador, linescore, mini diamante con conteo B/S/O y curva WPA integrada).
3. **Equidad y Balance en Jugador del Juego (Bateador vs Lanzador)**: Corrección de la distorsión del modelo WPA en juegos individuales donde solo ganaban bateadores y se premiaba a bateadores de 1-4 en derrotas 4-9. Se implementa cálculo dual (Líder Ofensivo y Líder de Pitcheo con Tango Game Score v2) y conmutador interactivo Bateo/Pitcheo.

---

## 2. Requerimientos Funcionales

### RF-01: Categorización del Menú Lateral (Sidebar & MobileNav)
- Las rutas se agrupan en:
  - **En Vivo & Cobertura**:
    - `Centro de Mando` (`/`)
    - `Game Center (En Vivo)` (`/game-center` con badge "LIVE")
    - `NotiCueva` (`/noticueva` con badge "NUEVO")
  - **Temporada & Equipo**:
    - `Posiciones & ELO` (`/standings`)
    - `Calendario Oficial` (`/calendario`)
    - `Roster Oficial & Staff` (`/roster` con badge "34")
    - `Bullpen & Lineups` (`/bullpen`)
  - **Laboratorio Sabermétrico**:
    - `Líderes Individuales` (`/individuales`)
    - `Pitching Summary` (`/pitching`)
    - `Matchup 360 (H2H)` (`/matchup`)
    - `Estadísticas Colectivas` (`/colectivas`)
    - `Win Expectancy & WPA` (`/wpa`)
    - `Splits Situacionales` (`/situacional`)
    - `Spray Charts` (`/spray-charts`)
- Se muestran encabezados de categoría elegantes en tipografía mono/sans de baja saturación con separadores visuales.
- Se mantiene sincronización idéntica entre versión Desktop y Drawer Móvil.
- Se corrigen caracteres especiales corruptos en los títulos (ej. `Líderes Individuales`, `Estadísticas Colectivas`).

### RF-02: Live Hero Game Card en Centro de Mando (`/`)
- Ubicado en la parte superior del Centro de Mando (`src/app/page.tsx`), antes o después del banner de temporada.
- Estado Visual:
  - Si hay un juego EN VIVO:
    - Badge animado: `● EN VIVO · [Entrada Actual]` (verde esmeralda pulsante).
    - Marcador en vivo (carreras de Leones y del rival).
    - Inning-by-inning linescore resumido (entradas jugadas, R, H, E).
    - Mini Diamante con bases ocupadas en tiempo real.
    - Conteo actual: Bolas, Strikes, Outs (`B`, `S`, `O`).
    - Bateador de turno y Lanzador activo con sus estadísticas del día.
    - Curva mini de Win Probability con porcentaje en vivo (ej. `68% Leones`) y jugada clave.
  - Si el juego es FINAL (o no ha comenzado):
    - Muestra el resultado final (o abridor anunciado), linescore completo y curva WPA histórica.
- Botón accesible para expandir: *"Ver en Game Center Completo ↗"*.

### RF-03: Balance de MVP / Destacados (Bateador vs Lanzador)
- **Diagnóstico del Fallo Actual**:
  - `wpaTotal` en un juego individual premia swings únicos de bateadores (+0.20 WPA) mientras el pitcheo en LVBP se divide en 5-7 relevistas que suman apenas +0.02 por entrada.
  - En derrotas (ej. 4-9), todos los pitchers tienen WPA negativo, por lo que el algoritmo seleccionaba al único bateador con un hit aislado (+0.108), catalogándolo como "MVP de Leones (1-4, 0 CI)" en una derrota dolorosa.
- **Solución Sabermétrica**:
  - Si el juego terminó en derrota (`!leonesWon`): La tarjeta pasa de llamarse `⭐ MVP DE LEONES` a `⭐ DESTACADO DE LEONES` para evitar contrasentidos de negocio.
  - Se calculan de forma independiente:
    - `topBatter`: Bateador de Caracas con mayor aporte WPA / carreras producidas (con hits, AB, HR, CI).
    - `topPitcher`: Lanzador de Caracas con mejor actuación combinada (WPA positivo, entradas limpias y Game Score v2 de Tom Tango).
  - Selector/Pestañas en la UI de `LastGameTab`:
    - Botones sutiles: `[ ⭐ General ]`, `[ 🏏 Bateo ]`, `[ ⚾ Pitcheo ]`.
    - Permite al usuario consultar inmediatamente tanto al mejor bateador como al mejor lanzador del juego, garantizando igualdad de condiciones.
    - Al seleccionar pitcheo, muestra: IP, Carreras Limpias, Ponches, Boletos y Game Score / WPA.

---

## 3. Criterios de Aceptación
1. El sidebar y el menú móvil presentan las 3 categorías con diseño premium consistente.
2. La página de inicio `/` despliega la tarjeta Hero del juego en vivo/reciente con linescore, diamante y probabilidad de ganar.
3. En la tarjeta de MVP del último juego, los lanzadores tienen una vía explícita y equitativa para ser consultados y destacados, y en derrotas se titula "DESTACADO" en vez de "MVP".
4. Cero errores de TypeScript (`npm run build` exitoso).
5. Despliegue sin regresiones en Vercel.
