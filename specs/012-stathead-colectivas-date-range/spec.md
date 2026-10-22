# Feature Specification: 012 - Buscador de Colectivas tipo Stathead con Rango de Fechas y Comparación Interanual

**Feature Directory**: `specs/012-stathead-colectivas-date-range`  
**Feature Branch**: `012-stathead-colectivas-date-range`  
**Created**: 2026-10-22  
**Status**: In Progress (Track 2: Spec-Driven Development)  
**Target Repository**: `republicaraquista-web` (Next.js 16 / React 19 en Vercel)  
**Input**: Buscador de estadísticas colectivas (bateo y pitcheo) para los 8 equipos de la LVBP tipo Stathead (Baseball-Reference), permitiendo filtrar por rangos de fecha arbitrarios (`startDate`, `endDate`), comparar contra el mismo período de la temporada anterior (`season - 1`), y visualizar diferenciales delta ($\Delta$) de rendimiento colectivo y de liga.

---

## 1. User Scenarios & Acceptance Criteria *(mandatory)*

### User Story 1 - Buscador Colectivo por Rango de Fechas Arbitrario (Priority: P1) 🎯 MVP

Como analista o fanático de la LVBP, quiero ingresar un rango de fechas (`Fecha Inicio` a `Fecha Fin`) en la vista de Colectivas para obtener las estadísticas acumuladas de bateo y pitcheo de los 8 equipos exclusivamente durante ese tramo de tiempo:
- **Bateo Colectivo**: `JJ`, `PA`, `AB`, `R`, `H`, `2B`, `3B`, `HR`, `RBI`, `BB`, `SO`, `SB`, `AVG`, `OBP`, `SLG`, `OPS`, `BABIP`.
- **Pitcheo Colectivo**: `JJ`, `IP`, `H`, `R`, `ER (CL)`, `BB`, `SO`, `HR`, `ERA`, `WHIP`, `K/9`, `BB/9`, `K/BB`.
- **Selector de Grupo**: Pestañas o conmutador directo entre **Bateo Colectivo** y **Pitcheo Colectivo**.
- **Fuente de Datos**: Consulta al endpoint nativo de MLB Stats API con `stats=byDateRange&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`.

**Acceptance Criteria**:
1. Al seleccionar una fecha inicial y fecha final válidas y presionar "Consultar", la tabla se actualiza mostrando los datos agregados reales devueltos por MLB Stats API para ese intervalo.
2. Si la fecha de inicio es posterior a la fecha de fin, se muestra una alerta defensiva sin disparar peticiones inválidas.
3. El estado de carga (skeleton / spinner de béisbol) es visible mientras la petición completa.
4. Se mantiene el resaltado distintivo para Leones del Caracas (dorado / azul navy) y los logos oficiales de los 8 equipos.

---

### User Story 2 - Comparativa Interanual ("Versus Año Anterior") con Cálculo de Deltas (Priority: P1) 🎯 MVP

Como usuario, quiero activar un conmutador **"Comparar contra temporada anterior"** para contrastar el desempeño colectivo del período actual contra el tramo equivalente del año previo:
- **Cálculo de Período Equivalente**:
  - Por defecto, el sistema proyecta el mismo rango calendario del año anterior (`startDate - 1 año` a `endDate - 1 año`), permitiendo además ajustar manualmente las fechas del año anterior si el usuario lo desea.
- **Visualización Diferencial ($\Delta$)**:
  - Para cada equipo (y para el total de la liga), mostrar las columnas clave con su valor del año actual, valor del año anterior y la variación neta $\Delta$:
    - $\Delta \text{OPS} = \text{OPS}_{2025} - \text{OPS}_{2024}$ (Verde si sube, rojo si baja).
    - $\Delta \text{ERA} = \text{ERA}_{2025} - \text{ERA}_{2024}$ (Verde si baja —mejor pitcheo—, rojo si sube).
    - $\Delta \text{WHIP} = \text{WHIP}_{2025} - \text{WHIP}_{2024}$ (Verde si baja, rojo si sube).
    - $\Delta \text{R/J} = (\text{R/JJ})_{2025} - (\text{R/JJ})_{2024}$ (Carreras por juego anotadas o permitidas).
- **Modos de Vista en Tabla**:
  - Vista Dual (Columnas lado a lado o badge con $\Delta$).

**Acceptance Criteria**:
1. Al activar el modo comparativa, la interfaz consulta en paralelo ambos períodos (año actual y año anterior).
2. Los diferenciales delta se calculan con signo explícito (`+` o `-`) y color semántico acorde a la métrica (en pitcheo menor ERA/WHIP es verde; en bateo mayor OPS/AVG/R es verde).
3. Si un equipo no disputó juegos en ese rango en el año anterior (ej. por lluvia o calendario), se indica como `N/D` o `-` sin romper el cálculo del resto de los equipos.

---

### User Story 3 - Totales y Promedios de la Liga Comparados en el Rango (Priority: P2)

Como aficionado analítico, quiero ver en el pie de tabla (`<tfoot>`) la fila de **"Total Liga"** y **"Promedio por Juego"** para el rango de fechas seleccionado, contrastando ambos años:
- Permite responder preguntas como: *"¿Se están anotando más carreras en la LVBP en las primeras 2 semanas de octubre respecto al año pasado?"*
- Totales ponderados reales recalculados para la liga en ambos períodos temporales.

**Acceptance Criteria**:
1. El pie de tabla refleja la suma de los 8 equipos y los ratios globales recalculados de la liga para ambos años en el rango.
2. Muestra el diferencial global de la liga ($\Delta \text{R/J de la Liga}$, $\Delta \text{ERA de la Liga}$, etc.).

---

### User Story 4 - Presets Rápidos de Rango Temporal (Priority: P2)

Como usuario móvil o de escritorio, quiero botones de acceso rápido para períodos frecuentes sin tener que abrir el selector de calendario manualmente:
- **"Últimos 7 días"** (desde hoy hacia atrás 7 días).
- **"Últimos 14 días"**.
- **"Mes de Octubre"** (del 12 al 31 de octubre).
- **"Mes de Noviembre"** (del 1 al 30 de noviembre).
- **"Mes de Diciembre"** (del 1 al 31 de diciembre).
- **"Temporada Completa a la Fecha"**.

**Acceptance Criteria**:
1. Al hacer clic en un preset, los campos de fecha se autocompletan instantáneamente y disparan la consulta.
2. Si el modo de comparación está activo, las fechas del año anterior se alinean automáticamente al preset equivalente.

---

## 2. Invariantes de Dominio y Contrato Técnico

1. **Convención de Temporada**:
   - Temporada activa identificada como `season=2025` (no confundir con año calendario de finalización 2026).
   - Temporada anterior de comparación: `previousSeason = season - 1` (ej. 2024).
2. **Endpoint MLB Stats API**:
   - `group=hitting` y `group=pitching`.
   - `stats=byDateRange`.
   - Parámetros obligatorios: `sportIds=17`, `leagueIds=135`, `startDate=YYYY-MM-DD`, `endDate=YYYY-MM-DD`.
3. **Manejo de Caché en Vercel**:
   - Consultas con fechas en el pasado (anteriores a hoy): Caché de larga duración (`revalidate: 86400` / 24 horas), garantizando costo 0 y latencia mínima.
   - Consultas que incluyen la fecha de hoy: Caché de 5 minutos (`revalidate: 300`).
4. **Respeto a la Arquitectura Existente**:
   - No romper ni alterar el comportamiento por defecto de `/colectivas`.
   - El buscador se integrará como una pestaña principal o módulo autónomo dentro de `/colectivas` (pestaña `"🔍 Buscador Stathead"`).
5. **Idioma**: Toda la interfaz, nombres de métricas y mensajes explicativos 100% en **español**.

---

## 3. Requerimientos Funcionales

- **FR-001**: El backend (`src/lib/collective.ts` y `/api/stats/collective`) DEBE aceptar los parámetros opcionales `startDate` y `endDate`.
- **FR-002**: Cuando `startDate` y `endDate` estén presentes, el servicio DEBE utilizar `stats=byDateRange` en lugar de `stats=season`.
- **FR-003**: El componente DEBE proveer un comparador interanual con cálculo automático de diferencias ($\Delta$) formateadas con signo y color contextual.
- **FR-004**: Los ratios sabermétricos de la liga (`AVG`, `OBP`, `SLG`, `OPS`, `BABIP`, `ERA`, `WHIP`) para el rango temporal DEBEN recalcularse con ponderación exacta de volumen (no promedio simple de ratios).
