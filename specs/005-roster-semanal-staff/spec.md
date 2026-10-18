# Especificación Funcional: Roster Semanal Oficial (Tope 34), Plantel General y Coaching Staff (`/roster`)

## 1. Resumen Ejecutivo y Propósito
El módulo **/roster** incorpora a **REPUBLICARAQUISTAPP** el centro de gestión y consulta oficial de la nómina de los **Leones del Caracas** para la temporada 2026-2027, emulando y superando la experiencia oficial de la LVBP (`stats.lvbp.com/rosters.php`) y FansMagallanes 360.

Esta funcionalidad permite:
1. **Roster Semanal Oficial (Tope 34 Plazas LVBP):**
   - Visualizar los 34 peloteros habilitados para la semana activa (Semana 1: 13-10-2026 al 19-10-2026), desglosados por Lanzadores (21), Receptores (2), Infielders (6) y Outfielders/Utility (5).
   - Acceder al documento oficial emitido por la LVBP (`Leones_20261013.pdf` respaldado por TuJonrón.com) mediante visor embebido y botón de descarga directa en PDF.
   - Analizar métricas de plantilla: conteo de Criollos (26) vs Importados (8), desglose de brazos (15 RHP / 6 LHP) y niveles de procedencia (MLB, AAA, AA, A+, A, IND. LEAGUE, OTRO).
2. **Plantel General (Roster Ampliado / Reserva):**
   - Consulta de la nómina global de peloteros pertenecientes a la reserva de Leones del Caracas.
   - Buscador en tiempo real por nombre, número de uniforme, posición y estatus.
3. **Coaching Staff Oficial 2026-2027:**
   - Presentación ejecutiva del cuerpo técnico caraquista liderado por el mánager **Lipso Nava** (#79), el coach de banca **Heberto Andrade** (#12), el coach de pitcheo **Wilson Álvarez** (#40), los coaches de bateo **Ramón Castro** (#72) y **Willie Romero** (#52), coach de 1B **Roger Cedeño** (#47), coach de 3B **Franklin Font** (#62), coach de bullpen **Levi Romero** (#64), coach de receptores/bullpen **Alfredo González**, asistente **Ligmer Morales** y gerencia deportiva de **Robinson Chirinos**.

---

## 2. Definición Canónica de Datos

### 2.1. Peloteros del Roster Semanal (34 Habilitados):
- **Lanzadores (21):**
  - #88 Dany Toussaint (RHP · Importado · 30a · Florida, USA)
  - #95 Alberto Leandro (RHP · Criollo · 24a · Caracas)
  - #59 Carlos Romero (RHP · Criollo · 27a · San Antonio, Monagas)
  - #48 Connor Van Scoyoc (RHP · Importado · 26a · AAA · Iowa, USA)
  - #67 Dale Stanavich (LHP · Importado · 27a · AAA · New York, USA)
  - #33 Erick Leal (RHP · Criollo · 31a · Valencia, Carabobo)
  - #51 Joan Gonzalez (RHP · Importado · 28a · Ind. League · Rep. Dominicana)
  - #31 Juan Sanchez (LHP · Criollo · 25a · AAA · Valencia)
  - #87 Julio Rodriguez (RHP · Importado · 26a · AAA · Camagüey, Cuba)
  - #29 Luarbert Arias (RHP · Criollo · 25a · MLB · Maracay)
  - #57 Luis Curvelo (RHP · Criollo · 25a · A+ · Higuerote, Miranda)
  - #39 Luis Palacios (LHP · Criollo · 26a · AAA · Cagua, Aragua)
  - #21 Marvin Alcántara (RHP · Criollo · 21a · AA · La Victoria, Aragua)
  - #63 Mikell Manzano (RHP · Criollo · 23a · Ocumare del Tuy)
  - #90 Nic Swanson (RHP · Importado · 27a · AAA · Oklahoma, USA)
  - #85 Norwith Gudiño (RHP · Criollo · 30a · Puerto Cabello, Carabobo)
  - #18 Raimon Gomez (RHP · Criollo · 25a · ROK · Barcelona, Anzoátegui)
  - #97 Sandy Gaston (RHP · Importado · 24a · AAA · Matanzas, Cuba)
  - #32 Wilkel Hernandez (RHP · Criollo · 27a · Caracas, Dto. Capital)
  - #73 Yoimer Camacho (RHP · Criollo · 36a · Santa Teresa del Tuy)
  - #49 Zac Kent (RHP · Importado · 28a · MLB · Virginia, USA)
- **Catchers (2):**
  - #10 Alfredo Duno (C · Criollo · 20a · AA · Coro, Falcón)
  - #75 Gabriel Lino (C · Criollo · 33a · Maracay, Aragua)
- **Infielders (6):**
  - #37 Aldrem Corredor (1B/OF · Criollo · 30a · Ind. League · Ocumare del Tuy)
  - #61 Leandro Cedeño (1B/DH · Criollo · 28a · AAA · Guatire, Miranda)
  - #50 Lenin Sosa (2B/SS · Criollo · 26a · MLB · Ciudad Bolívar)
  - #19 Liván Soto (SS/2B · Criollo · 27a · Valencia, Carabobo)
  - #81 Ricardo Cova (IF · Criollo · 22a · A · Anzoátegui)
  - #7 Wilfredo Tovar (IF · Criollo · 35a · Santa Teresa, Miranda)
- **Outfielders / Utility (5):**
  - #5 Brainer Bonaci (UT · Criollo · 24a · Maiquetía, La Guaira)
  - #9 José Rondón (UT/OF · Criollo · 32a · Villa de Cura, Aragua)
  - #28 Kenedy Corona (OF · Criollo · 26a · AAA · Maracaibo, Zulia)
  - #43 Wuilfredo Antunez (OF · Criollo · 24a · AAA · Río Tucaní, Mérida)
  - #22 Yonathan Daza (OF · Criollo · 32a · Maracay, Aragua)

---

## 3. Requisitos de UI/UX

1. **Selector de Pestañas Canónicas:**
   - `Roster Semanal (34 Habilitados)` [Por defecto]
   - `Plantel Ampliado (Reserva)`
   - `Coaching Staff (Cuerpo Técnico)`
   - `Documento Oficial PDF` (Visor y descarga)
2. **Panel de KPIs Ejecutivos:**
   - 34 / 34 Jugadores Habilitados (100% cupo oficial cubierto).
   - 26 Criollos · 8 Importados.
   - 21 Lanzadores (15 RHP / 6 LHP) · 2 Catchers · 6 Infielders · 5 Outfielders.
3. **Filtros Interactivos:**
   - Filtro por posición: `Todos`, `Lanzadores`, `Receptores`, `Infielders`, `Outfielders / Utility`.
   - Filtro por origen: `Todos`, `Criollos`, `Importados`.
   - Búsqueda en vivo por texto.
4. **Visor de PDF Integrado:**
   - Modal y/o sección embebida con `<iframe src="/documents/Leones_20261013.pdf">` y botón de descarga directa para abrir en PDF nativo de Android/iOS.
5. **Navegación Global:**
   - Enlace directo a `/roster` con icono de `Users` / `ClipboardCheck` tanto en la Sidebar de escritorio como en el menú lateral móvil.
