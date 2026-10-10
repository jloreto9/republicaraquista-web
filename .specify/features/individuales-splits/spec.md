# Feature Specification: Splits Individuales Exhaustivos en Stats Individuales

**Identificador**: `individuales-splits`  
**Estado**: Especificado  
**Prioridad**: Alta  
**Aplicación**: REPUBLICARAQUISTAPP (Next.js 16 / React 19 / Vercel)  
**Ubicación**: `/individuales` (`src/app/individuales/page.tsx` y `src/components/stats/`)  

---

## 1. Visión General y Objetivo

Incorporar dentro del módulo de **Estadísticas Individuales** (`/individuales`) la visualización y exploración exhaustiva de **todos los splits posibles** para cualquier jugador (bateador o lanzador) de la LVBP y Leones del Caracas.

Actualmente, `/individuales` presenta únicamente las tablas agregadas de temporada de Bateo Sabermétrico, Pitcheo y Fildeo. Con esta funcionalidad, el usuario podrá desglosar el rendimiento individual en todas las dimensiones competitivas disponibles en nuestra base de datos relacional y telemetría de jugadas.

---

## 2. Catálogo de Splits a Implementar

### A. Splits de Contexto de Juego & Calendario (Para Todos los Jugadores de la LVBP)
Calculados dinámicamente desde `batting_stats` / `pitching_stats` cruzados con `games`:
1. **Localía**: En Casa (Home) vs En la Carretera (Visitante/Away).
2. **Horario**: De Día (< 7:00 PM VET) vs De Noche (>= 7:00 PM VET).
3. **Resultado del Encuentro**: En Victorias (Wins) vs En Derrotas (Losses).
4. **Por Mes de Campeonato**: Octubre vs Noviembre vs Diciembre vs Enero.
5. **Por Rival (Opponent Split)**: Desglose cara a cara contra los 7 equipos rivales (Magallanes, Tiburones, Cardenales, Águilas, Tigres, Caribes, Bravos).
6. **Por Fase**: Temporada Regular ('R'), Round Robin ('L'), Serie Final ('F').
7. **Por Día de la Semana**: Lunes a Domingo.

### B. Splits Situacionales de Jugada & Presión (PBP / Sabermetría de Turno)
Integrados desde el motor situacional (`situational-engine.ts` y PBP):
1. **Situación en Base**:
   - Bases Limpias (Bases Vacías)
   - Hombres en Base (Con Corredores)
   - En Posición Anotadora (RISP - 2da o 3ra base)
   - RISP con 2 Outs (Clutch / Máxima Presión)
   - Bases Llenas (Amenaza de Grand Slam)
2. **Conteo de Outs**:
   - Con 0 Outs
   - Con 1 Out
   - Con 2 Outs
3. **Platoon (Mano de Lanzador / Bateador)**:
   - Para Bateadores: vs Lanzadores Derechos (RHP) vs vs Lanzadores Zurdos (LHP).
   - Para Lanzadores: vs Bateadores Derechos (RHB) vs vs Bateadores Zurdos (LHB).
4. **Segmento de Entradas**:
   - Entradas Tempranas (Innings 1 al 3)
   - Entradas Medias (Innings 4 al 6)
   - Entradas Tardías / Definición (Innings 7 al 9+)
5. **LOB Tracker (Dejados en Base Individual)**:
   - LOB al terminar inning (3er out con corredores).
   - RISP LOB al terminar inning.
   - RISP LOB en medio de la entrada (0 o 1 out sin remolcar).
   - Total Oportunidades RISP LOB.
6. **Enfrentamientos Directos BvP**:
   - Rendimiento histórico contra cada lanzador rival específico.

---

## 3. Criterios de Aceptación

1. **Pestaña `⚡ Splits Situacionales & Desglose` en `/individuales`**:
   - Navegación clara de 4 pestañas: `[ 🏏 Bateo ] [ ⚾ Pitcheo ] [ ⚡ Splits ] [ 🧤 Fildeo & Defensa ]`.
2. **Selector y Modal de Jugador**:
   - Barra de búsqueda y selector reactivo para elegir cualquier jugador de la temporada (con fotos oficiales y badge de equipo).
   - Conmutador entre **Bateadores** y **Lanzadores**.
   - Acceso contextual: Botón "⚡ Ver Splits" en cada fila de las tablas principales de Bateo y Pitcheo para abrir instantáneamente los splits de ese jugador.
3. **Organización Visual por Categorías de Splits**:
   - Tarjetas agrupadas con diseño Dark Navy (`#070B19`), Glassmorphism (`#0D152B`) y acentos dorados (`#FDB827`):
     - Grupo 1: *Situaciones de Juego (Bases, Outs y Platoon)*
     - Grupo 2: *Localía, Horario y Resultado (Home/Away, Día/Noche, W/L)*
     - Grupo 3: *Por Rival (Los 7 equipos LVBP con logos vectoriales)*
     - Grupo 4: *Por Mes y Calendario*
     - Grupo 5: *Módulo LOB & BvP*
4. **Métricas Completas por Split**:
   - Para Bateadores: `PA, AB, H, 2B, 3B, HR, RBI, BB, SO, HBP, SF, AVG, OBP, SLG, OPS`.
   - Para Lanzadores: `BF, IP, H, R, ER, BB, SO, HR, ERA, WHIP, BAA, K/9, BB/9`.
5. **Rendimiento e Integración**:
   - Endpoint `/api/stats/player-splits?player_id={id}&type=batter|pitcher&season={year}` con revalidación y caché en memoria.
   - Cero crashes ante datos parciales; fallbacks defensivos.
   - Compilación exitosa con Next.js 16 (Turbopack).
