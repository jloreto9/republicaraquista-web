# Quickstart & Validation Guide: Centro de Mando — Suite de Pestañas y Leones Stats

**Identificador**: `centro-mando-leones-stats`  

---

## 1. Escenarios de Validación

### Escenario 1: Carga y Conmutación de Pestañas
1. Navegar a `http://localhost:3000/`.
2. Verificar que se renderizan las 4 pestañas:
   - `[ 📅 Último Juego ]`
   - `[ 📈 Tendencias ]`
   - `[ 🌟 Líderes del Equipo ]`
   - `[ 🦁 Leones Stats ]`
3. Hacer clic en cada pestaña y validar que el contenido conmuta de forma reactiva, instantánea y sin parpadeos ni recargas completas.

### Escenario 2: Verificación de la Pestaña `🦁 Leones Stats` (Fidelidad de la Captura)
1. Activar la pestaña `🦁 Leones Stats`.
2. Comprobar que se muestran las 3 columnas:
   - **Columna 1**: Juego N°, Récord, Home Club, Visitante, De noche, De día, Blanqueo, Racha, En extrainning, Ult-10J.
   - **Columna 2**: Por 1 Carrera, Remontados, Arriba, Terreneadas, Abridores, Relevistas, Salvados, OCT, NOV, DEC.
   - **Columna 3**: Por Día de Semana (Lunes a Domingo).
3. Comprobar que en la parte inferior se renderiza la tabla interactiva de **Desglose Semana a Semana** (Semana, Juegos, G, P, PCT, CF, CP, DIF, Récord).

### Escenario 3: Pestaña `📅 Último Juego`
1. Comprobar el marcador del último partido con logos de ambos equipos.
2. Comprobar la tarjeta del **⭐ MVP de Leones** con el valor de WPA Total, Bateo, Pitcheo y Clutch.

### Escenario 4: Pestaña `📈 Tendencias`
1. Comprobar que la tabla lista los últimos 10 juegos con rival, fecha, marcador y badges verde/rojo para W/L.

### Escenario 5: Pestaña `🌟 Líderes del Equipo`
1. Comprobar los líderes de bateo (ordenados por OPS) y pitcheo (ordenados por ERA) con sus respectivas tarjetas de líderes coronados.

### Escenario 6: Validación de Build y Tipos
1. Ejecutar en terminal: `npm run build`.
2. Comprobar que no hay errores de TypeScript ni errores de lint.
