# Feature Specification: Fase 5 - Módulos de Juego Avanzado (WPA, Situacional & Spray Charts)

## 1. Visión General
Implementación de los 3 módulos sabermétricos analíticos de juego avanzado en la plataforma **REPUBLICARAQUISTAPP**:
1. **/wpa**: Win Expectancy (WE), Win Probability Added (WPA), matriz Tango RE24 de 24 estados y apalancamiento (Leverage Index).
2. **/situacional**: Splits Situacionales (RISP, Clutch 2-outs, Bases Llenas, Platoon LHP/RHP, segmentos de entradas), LOB Tracker (Dejados en Base) y matriz BvP.
3. **/spray-charts**: Spray Charts espaciales interactivos en diamante con modelo determinístico de dureza BIS (Hard, Medium, Soft) y mapas de calor 3x3 de disciplina en el plato (O-Swing%, Z-Swing%, Z-Contact%, Whiff%, CSW%, SwStr%).

## 2. Reglas Críticas de Negocio
- **Cero Statcast en LVBP**: Prohibición estricta de métricas de radar/cámara Hawkeye inexistentes en LVBP (Exit Velocity, Launch Angle, Barrels). La clasificación de dureza debe regirse exclusivamente por el modelo BIS determinístico (Evento, Trayectoria, Distancia en pies).
- **Cero Jerga Corporativa**: Prohibido usar "Dashboard Ejecutivo", "Executive KPIs" u otros términos corporativos. Usar terminología sabermétrica ("Resumen de Apalancamiento", "Líderes de Probabilidad", "Dejados en Base", etc.).
- **Matriz Tango RE24**: Uso exacto de los 24 estados base-out clásicos (0, 1 y 2 outs cruzados con estados de bases 0 a 7).
- **Créditos y Branding**: Footer obligatorio con créditos a `@republicaraquista • Jorge Leonardo Loreto`. PWA identity: `REPUBLICARAQUISTAPP`.

## 3. Criterios de Aceptación
1. **/wpa**:
   - Curva interactiva de probabilidad de victoria que oscila de 0% a 100% con áreas sombreadas (Oro Caraquista `#FDB827` para Leones y Rojo `#CE1141` para Rival).
   - Selector reactivo de partido para los juegos de la temporada.
   - Tabla de jugadas cruciales (Pivotal Plays) con ordenamiento por magnitud de WPA.
   - Tabla de líderes acumulados de la temporada en WPA, WPA/LI y Clutch.
2. **/situacional**:
   - Tabla de splits clave: Total General, Bases Limpias, Hombres en Base, RISP, RISP con 2 Outs (Clutch), Bases Llenas, vs RHP, vs LHP, Inicios (1-3), Medios (4-6), Finales/Clutch (7-9+).
   - Métricas completas: PA, AB, H, 2B, 3B, HR, BB, SO, RBI, AVG, OBP, SLG, OPS.
   - LOB Tracker completo: LOB al terminar inning (3er out), RISP LOB al terminar inning, RISP LOB en medio del inning (0/1 out sin remolcar) y ranking de bateadores.
   - Buscador de enfrentamientos directos BvP (Bateador vs Lanzador).
3. **/spray-charts**:
   - Diamante de béisbol SVG escalado geométricamente (poste de foul 335 ft, CF 400 ft, arco de infield radio 95 ft, bases en diamante).
   - Bateos clasificados por Evento (1B, 2B, 3B, HR, Out), Trayectoria (GB, LD, FB, PU) y Dureza BIS (Hard, Medium, Soft).
   - Selector de bateador del roster de Leones.
   - Pestaña de Zona de Strike 3x3 interactiva con métricas O-Swing%, Z-Contact%, SwStr%, Whiff%, CSW%.
4. **Arquitectura y Rendimiento**:
   - TypeScript estricto sin `any` ambiguos.
   - Compilación limpia con `npm run build` y cero errores de lint.
   - Despliegue en Vercel respondiendo con HTTP 200 OK.
