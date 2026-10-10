# Quickstart & Validation Guide: Splits Individuales Exhaustivos

**Identificador**: `individuales-splits`  

---

## 1. Escenarios de Prueba Manual

### Escenario 1: Navegación a la Pestaña Splits en `/individuales`
1. Navegar a `http://localhost:3000/individuales`.
2. Verificar que se renderizan las 4 pestañas:
   - `[ 🏏 Bateo ]`
   - `[ ⚾ Pitcheo ]`
   - `[ ⚡ Splits Situacionales ]`
   - `[ 🧤 Fildeo & Defensa ]`
3. Hacer clic en `⚡ Splits Situacionales`.
4. Validar que la vista de splits carga de forma reactiva con un jugador predeterminado (ej: Aldrem Corredor o Harold Castro).

### Escenario 2: Exploración de Grupos de Splits
1. Verificar que se despliegan los paneles:
   - **Situaciones de Juego**: Bases Limpias, Hombres en Base, RISP, RISP con 2 Outs (Clutch), Bases Llenas.
   - **Platoon**: vs RHP y vs LHP.
   - **Contexto de Partido**: Home vs Away, De Día vs De Noche, Victorias vs Derrotas.
   - **Por Rival**: Desglose contra los 7 equipos de la LVBP con logos.
   - **Por Mes**: Octubre, Noviembre, Diciembre.
2. Comprobar que los números coinciden y las métricas (`AVG`, `OBP`, `SLG`, `OPS`) están formateadas adecuadamente.

### Escenario 3: Acceso Directo desde la Tabla de Bateo
1. En la pestaña `[ 🏏 Bateo ]`, localizar a un jugador en la tabla.
2. Hacer clic en el botón de acción `⚡ Splits`.
3. Comprobar que la vista cambia automáticamente a la pestaña de splits con dicho jugador seleccionado.

### Escenario 4: Splits de Pitcheo
1. Conmutar el selector de tipo de jugador a "Lanzador".
2. Seleccionar un pitcher (ej: Norwith Gudiño, Colin Rea o Rito Lugo).
3. Verificar que se muestran sus splits con métricas de pitcheo (`IP, H, R, ER, BB, SO, ERA, WHIP`).

### Escenario 5: Validación de Build
1. Ejecutar `npm run build` en `republicaraquista-web`.
2. Verificar cero errores de tipos o lint.
