# Especificación de Feature: Hoja de Anotación Oficial en Vivo (Baseball Scorecard) en Game Center

**Slug:** `014-game-center-scorecard`  
**Autor:** Antigravity & Jorge Leonardo Loreto (@JorgeLoreto)  
**Fecha:** 2026-10-25  
**Estado:** Especificado (Fase 1 de Spec-Kit)  

---

## 1. Contexto y Objetivos de Negocio

El **Game Center** de **República Caraquista** (`/game-center`) funciona como la Segunda Pantalla definitiva para los aficionados de los Leones del Caracas en la LVBP, contando actualmente con tres pestañas:
1. `GameCast`: Diamante interactivo SVG, conteo LED, duelo bateador vs lanzador, linescore y feed jugada a jugada.
2. `Alineaciones & Boxscore`: Tablas tradicionales de bateo 1-9 y pitcheo de ambos equipos.
3. `Estadio & Transmisión`: Detalles de la sede y enlaces radiales/televisivos.

Sin embargo, en la cultura del béisbol venezolano y del aficionado analítico, la **Hoja de Anotación (Scorecard / Scorebook Grid)** es el registro canónico por excelencia del juego: permite visualizar la evolución de cada entrada, el avance de bases corredor por corredor sobre el rombo de béisbol, los outs acumulados (➀, ➁, ➂), las carreras anotadas (rombo sombreado) y la notación técnica estandarizada (`K`, `ꓘ`, `1B`, `2B`, `3B`, `HR`, `BB`, `HBP`, `6-3`, `4-3`, `F8`, `L6`, `DP 6-4-3`, etc.).

**Ningún portal de la LVBP ni app de béisbol venezolana cuenta con una hoja de anotación interactiva digital en tiempo real.**

El objetivo de esta especificación es incorporar la 4ta pestaña en `/game-center`: **"Hoja de Anotación" (Scorecard)**, completamente automatizada a partir de los datos atómicos de jugadas de MLB Stats API (`liveData.plays.allPlays`), renderizada con vectores SVG nativos y optimizada para ejecutarse en Vercel con cero sobrecosto de infraestructura.

---

## 2. Requerimientos Funcionales

### RF01: Integración en la Barra de Pestañas del Game Center
- En [src/components/game-center/game-center-view.tsx](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/game-center/game-center-view.tsx), ampliar el estado `activeTab` para admitir `"scorecard"`:
  ```typescript
  type GameCenterTab = "gamecast" | "boxscore" | "scorecard" | "stadium";
  ```
- Botón en la barra de navegación:
  - Icono: `ClipboardList` o `FileSpreadsheet` de `lucide-react`.
  - Etiqueta: `Hoja de Anotación` (badge "Oficial" o distintivo sutil).

### RF02: Selector de Equipo (Leones vs Rival)
- En la parte superior de la hoja de anotación, permitir al usuario alternar con un click entre:
  - Equipo Visitante (Away)
  - Equipo Local (Home)
- El botón de Leones del Caracas debe lucir el acento dorado Caraquista `#FDB827` distintivo.

### RF03: Motor de Reconstrucción de la Hoja de Anotación (`scorecard-engine.ts`)
- Mapear cada jugada de `allPlays` hacia su respectivo bateador, entrada y avance de bases:
  1. **Asignación a la Cuadrícula**: Orden al bate (1 al 9) y sustitutos (PH, PR, DEF) colocados en la fila correspondiente a su slot.
  2. **Resolución de Múltiples Turnos por Inning**: Si un equipo batea alrededor (más de 9 bateadores en una sola entrada), la matriz soporta múltiples apariciones por bateador en la misma columna/entrada sin colisiones ni sobreescrituras.
  3. **Trazado del Rombo de Bases**:
     - Arista Home $\to$ 1B: si el bateador alcanzó la primera base (hit, boleto, error, etc.).
     - Arista 1B $\to$ 2B: si el corredor avanzó a segunda en esa o jugadas posteriores de la misma entrada.
     - Arista 2B $\to$ 3B: si avanzó a tercera base.
     - Arista 3B $\to$ Home: si anotó carrera.
     - Relleno del Rombo: sombreado/iluminado en oro/esmeralda si anotó carrera (`scored = true`).
  4. **Notación Clásica de Béisbol**:
     - Ponches: `K` (swinging) vs `ꓘ` (looking).
     - Extrabases: `1B`, `2B`, `3B`, `HR`.
     - Boletos: `BB`, `IBB`, `HBP`.
     - Jugadas defensivas / outs de campo deducidos de la descripción: `6-3`, `4-3`, `5-3`, `1-3`, `3-1`, `F8`, `F7`, `F9`, `L6`, `L4`, `P2`, `DP 6-4-3`, `SF`, `SH`, `E`.
  5. **Outs e Impulsadas**:
     - Badge numérico con el out de la entrada generado: ➀, ➁, ➂.
     - Indicador de Carreras Impulsadas (RBI dots: `•`, `••`).

### RF04: Componente de UI (`ScorecardTab` y `ScorecardDiamondCell`)
- **Cabecera Fija (Sticky Column)**:
  - Slot (#1 a #9), Nombre del Pelotero, Dorsal, Posición defensiva y línea resumida del día (ej. `4-2, HR, 2 RBI`).
- **Columnas de Entradas (Innings 1 a 9+)**:
  - Encabezados claros de cada inning (1 al 9, y entradas extra 10, 11...).
  - Celdas con rombo SVG de béisbol, aristas de avance iluminadas y notación centrada.
  - Al posar el cursor o pulsar en móvil (Tooltip / Popover): muestra la descripción completa en español de la jugada y el lanzador enfrentado.
- **Filas de Resumen por Inning al Pie**:
  - Carreras (R) anotadas en esa entrada.
  - Imparables (H) conectados en esa entrada.
  - Errores (E) cometidos por la defensa rival.
  - Dejados en Base (LOB) en esa entrada.
- **Totales Acumulados al Final de la Fila**:
  - Columnas de totales por bateador: `AB`, `R`, `H`, `2B`, `3B`, `HR`, `RBI`, `BB`, `SO`.

### RF05: Guía y Glosario Didáctico de Anotación
- Sección desplegable o drawer que explique brevemente a los fanáticos novatos cómo leer la hoja: qué significa `K` vs `ꓘ`, `6-3`, el rombo iluminado y los números de out.

---

## 3. Criterios de Aceptación (DoD)

1. **Exactitud de Anotación**: El total de carreras, hits y outs representados en los rombos coincide exactamente con el Linescore y Boxscore oficial del juego.
2. **Compatibilidad con Partidos en Vivo y Finalizados**: Funciona tanto en tiempo real (actualizándose cada 15s con el polling del Game Center) como en cualquier partido histórico de la temporada 2026/2025.
3. **Responsive**: Desplazamiento horizontal fluido en dispositivos móviles sin desbordar el contenedor principal.
4. **Cero Dependencias Adicionales**: Uso de TypeScript nativo, Tailwind CSS y SVG sin librerías externas.
5. **Compilación Limpia**: `npx tsc --noEmit` ejecuta sin errores de tipos.
