# Feature Specification: Centro de Mando — Suite de Pestañas y Leones Stats

**Identificador**: `centro-mando-leones-stats`  
**Estado**: Especificado  
**Prioridad**: Alta  
**Aplicación**: REPUBLICARAQUISTAPP (Next.js 16 / React 19 / Vercel)  

---

## 1. Visión General y Problema

En la versión original de **RepubliCaraquistApp** (Streamlit y Reflex), la pantalla principal (Centro de Mando / Dashboard `/`) contaba con una barra interactiva de 4 pestañas de alto valor sabermétrico y seguimiento caraquista:
1. **📅 Último Juego**: Marcador cara a cara final del encuentro más reciente + Tarjeta destacada de **MVP de Leones** con desglose de Win Probability Added (**WPA Total, WPA Bateo, WPA Pitcheo, Clutch** basado en Tango RE24).
2. **📈 Tendencias**: Historial de los **Últimos 10 Juegos (U10J)** en tabla interactiva con indicador visual de victoria/derrota (W verde / L rojo), rival, fecha y marcador.
3. **🌟 Líderes del Equipo**: Top 5 bateadores de Leones (ordenados por OPS, mín. 10 AB) y Top 5 lanzadores de Leones (ordenados por ERA, mín. 5 IP) con tarjetas destacadas para el Líder de OPS y Líder de ERA.
4. **🦁 Leones Stats**: Cuadrícula exhaustiva de estadísticas de situación del equipo:
   - **Condiciones y Récord**: Juego actual N°, Récord W-L, Home Club, Visitante, De noche (>= 7:00 PM VET), De día (< 7:00 PM VET), Blanqueos (Shutouts), Racha actual, En extrainnings, Últimos 10 Juegos.
   - **Situaciones de Presión y Decisiones**: Por 1 Carrera, Remontados (viniendo de atrás tras el 6to inning), Arriba (liderando tras el 6to inning), Terreneadas (Walk-off wins en 9na o extra innings), Abridores (SP W-L), Relevistas (RP W-L), Salvados, Desglose mensual (Octubre, Noviembre, Diciembre).
   - **Por Día de Semana**: Desglose W-L de Lunes a Domingo.
   - **Desglose Semana a Semana**: Tabla interactiva por semanas ISO de campeonato (Semana, Juegos, G, P, PCT, CF, CP, DIF, Récord).

En la migración inicial a Next.js 16 (`republicaraquista-web`), esta suite interactiva de 4 pestañas fue omitida del dashboard principal, dejando únicamente los KPIs generales y el scoreboard cara a cara, perdiéndose la vista integral de **Leones Stats** que es identitaria de República Caraquista.

---

## 2. Reglas Críticas de Negocio y Dominio

1. **Paridad Matemática y Sabermétrica Total**:
   - Fórmulas de WPA y Clutch idénticas a `wpa-engine.ts` y Tango RE24.
   - Definición canónica de *Remontada*: Victoria tras estar abajo en el marcador al finalizar el 6to inning.
   - Definición canónica de *Arriba*: Récord del equipo cuando lideraba al finalizar el 6to inning.
   - Definición canónica de *Terreneada (Walk-off)*: Victoria de Leones como equipo local (Home) decretada en la parte baja del 9no inning o en entradas extra.
   - Definición de *De Noche vs De Día*: Horario venezolano (VET / UTC-4) >= 19:00 es juego nocturno.
2. **Prohibición Estricta de Statcast en LVBP**:
   - Cero menciones ni cálculos de Exit Velocity, Launch Angle, Barrels o Sprint Speed.
3. **Cero Jerga Corporativa**:
   - Prohibido usar "Dashboard Ejecutivo", "Executive KPIs" u otros términos corporativos. Usar terminología sabermétrica ("Centro de Mando", "Condiciones de Juego", "Líderes de Temporada", "Desglose Situacional").
4. **Identidad Visual y Branding**:
   - Paleta oficial Dark Navy (`#070B19`), fondo de tarjeta Glassmorphism (`#0D152B`), acentos dorados Caraquistas (`#FDB827`), borde `#1E2B4D`.
   - Créditos canónicos en el footer: `@republicaraquista • Jorge Leonardo Loreto`.
   - Nombre de la PWA: `REPUBLICARAQUISTAPP`.

---

## 3. Criterios de Aceptación

1. **Barra de Pestañas en Centro de Mando (`/`)**:
   - Implementar un conmutador reactivo de 4 pestañas:
     - `[ 📅 Último Juego ]`
     - `[ 📈 Tendencias ]`
     - `[ 🌟 Líderes del Equipo ]`
     - `[ 🦁 Leones Stats ]`
2. **Pestaña `📅 Último Juego`**:
   - Renderizar el último resultado final de Leones con marcador, fecha, venue y logos oficiales.
   - Tarjeta destacada de MVP del juego según WPA con desglose (WPA Total, WPA Bat, WPA Pit, Clutch).
3. **Pestaña `📈 Tendencias`**:
   - Tabla con los últimos 10 juegos de Leones, rival con logo/abreviatura, resultado (W badge verde / L badge rojo), marcador y fecha.
4. **Pestaña `🌟 Líderes del Equipo`**:
   - Columnas duales para Bateo (AVG, HR, RBI, OPS, AB, H) y Pitcheo (ERA, WHIP, IP, SO, BB).
   - Tarjetas destacadas con corona de Líder OPS y Líder ERA.
5. **Pestaña `🦁 Leones Stats` (Pantalla de la imagen)**:
   - Encabezado: `🦁 Leones del Caracas {season_display}`.
   - Cuadrícula de 3 columnas responsiva (móvil y escritorio):
     - Columna 1: Juego N°, Récord, Home Club, Visitante, De Noche, De Día, Blanqueo, Racha, Extra Inning, U10J.
     - Columna 2: Por 1 Carrera, Remontados, Arriba, Terreneadas, Abridores, Relevistas, Salvados, OCT, NOV, DEC.
     - Columna 3: Por Día de Semana (Lunes a Domingo).
   - Tabla inferior: Desglose Semana a Semana por semanas ISO de campeonato (Semana, Juegos, G, P, PCT, CF, CP, DIF, Récord).
6. **Robustez y Rendimiento**:
   - Fallbacks seguros si un dato no está disponible (cero crashes).
   - TypeScript estricto sin `any`.
   - `npm run build` exitoso sin advertencias de lint.
7. **Sub-panel `📺 Récord por Canal de Transmisión` (TV & Streaming)**:
   - Monitoreo del récord de Leones del Caracas (`W-L`, `PCT`, total juegos asignados y jugados) con cada canal de transmisión:
     - **ByM Sport**
     - **1Baseball**
     - **IVC**
     - **Televen**
     - **Venevisión**
     - **Meridiano TV**
     - **LVBP YouTube**
     - **SimpleTV**
   - **Regla de Exclusión de BeisbolPlay**: BeisbolPlay no entra en la comparativa de canales lineales individuales ya que transmite el 100% de los encuentros (56 juegos). Se exhibe un badge aclaratorio sutil ("BeisbolPlay transmite el 100% de la temporada vía streaming").
   - Integración visual de los logotipos vectoriales de `public/assets/channels/` para cada canal.
   - Sincronización automática de resultados cruzando fecha y rival con el calendario verificado de transmisiones.
