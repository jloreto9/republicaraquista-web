# Feature Specification: Pitching Summary & Telemetría

**Identificador**: `pitching-summary-telemetry`  
**Estado**: Listo para Planificación  
**Autor**: Spec-Kit  
**Fecha**: 2026-09-24  

---

## 1. Visión General

La vista **Pitching Summary & Telemetría** constituye la 9ª vista analítica de la suite de **REPUBLICARAQUISTAPP**. Su objetivo es proporcionar un centro de mando para el análisis pormenorizado del pitcheo, ofreciendo una experiencia integral inspirada en el marco visual y metodológico de Thomas Nestico (@TJStats), con una bifurcación dual entre:
1. **Rama Leones del Caracas / LVBP (Play-by-Play Sabermétrico)**: Adaptado para el contexto invernal venezolano sin telemetría de radar, calculando destinos de lanzamientos (bolas, strikes cantados, abanicados, fouls, pelotas en juego), carga de trabajo por entrada, índice de apalancamiento (Leverage Index Tango RE24) y splits por mano de bateador (LHB vs RHB).
2. **Rama MLB / MiLB (Statcast & Hawk-Eye)**: Explotación de la telemetría óptica de radar (velocidad inicial, rotación, quiebre horizontal, quiebre vertical inducido, CSW%, Whiff% y Zone%), matriz de repertorio y planos de movimiento.
3. **Tarjeta Gráfica Exportable HD (300 DPI)**: Generación y descarga directa en formato PNG con proporciones 16:9 apta para publicación en medios digitales y redes sociales con identidad oficial y créditos al autor.

---

## 2. Historias de Usuario & Escenarios

### Historia de Usuario 1 (P1): Búsqueda Universal y Perfil de Lanzador
**Como** analista de béisbol o aficionado caraquista,  
**quiero** buscar cualquier lanzador por su nombre o identificación oficial de MLB y visualizar su biografía, foto oficial y filiación con Leones del Caracas o franquicias invernales,  
**para** consultar el rendimiento de abridores y relevistas en el momento en que suben al montículo.

- **Escenario 1.1 (Lanzador de Leones)**: El usuario escribe "Albert Suárez" o selecciona un botón de acceso rápido; el sistema resuelve de inmediato su foto oficial, mano de lanzar (RHP), estatus con Leones del Caracas y despliega su registro de salidas recientes.
- **Escenario 1.2 (Lanzador de Grandes Ligas)**: El usuario escribe "Tarik Skubal" o "Gerrit Cole"; el sistema identifica su equipo de MLB y habilita la vista de telemetría Statcast.
- **Escenario 1.3 (Búsqueda por ID directo)**: El usuario introduce "544150"; el sistema resuelve el perfil correspondiente directamente.

### Historia de Usuario 2 (P2): Análisis Play-by-Play LVBP (Leones del Caracas)
**Como** seguidor técnico de Leones del Caracas,  
**quiero** inspeccionar una salida específica de un lanzador en la LVBP con desglose pitcheo a pitcheo,  
**para** entender la eficiencia real más allá de la efectividad tradicional (ERA).

- **Escenario 2.1 (Boxscore Sabermétrico)**: Al seleccionar una apertura, el usuario ve en pastillas: Entradas (IP), Hits (H), Carreras (R), Carreras Limpias (ER), Boletos (BB), Ponches (SO), Pitcheos Totales, Strikes, CSW% y Whiff%.
- **Escenario 2.2 (Destinos de Pitcheos)**: El usuario visualiza una tabla con la distribución porcentual de Bolas, Strikes Cantados, Whiffs, Fouls y Pelotas en Juego.
- **Escenario 2.3 (Carga por Entrada & Apalancamiento)**: El usuario observa un gráfico de barras apiladas de strikes y bolas por cada inning lanzado, junto con la curva de presión/apalancamiento (Leverage Index) que enfrentó el lanzador en cada momento.
- **Escenario 2.4 (Platoon Splits)**: El usuario revisa cómo rindió el lanzador frente a bateadores zurdos (LHB) contra derechos (RHB).

### Historia de Usuario 3 (P3): Repertorio y Telemetría Statcast (MLB / Triple-A)
**Como** evaluador de talento o aficionado sabermétrico,  
**quiero** analizar lanzadores con datos de radar Hawk-Eye (MLB / Triple-A),  
**para** descomponer el movimiento y efectividad de cada tipo de lanzamiento de su repertorio.

- **Escenario 3.1 (Matriz de Lanzamientos)**: El usuario consulta una tabla clasificada por tipo de pitcheo (4-Seam, Sinker, Slider, Changeup, etc.), con métricas de velocidad promedio y máxima, revoluciones por minuto (Spin), quiebre vertical inducido (iVB) en pulgadas, quiebre horizontal (HB) en pulgadas, porcentaje de uso, Whiff%, CSW% y Zone%.
- **Escenario 3.2 (Plano Cartesiano de Quiebre)**: El usuario examina un gráfico cartesiano de movimiento donde el eje X muestra el quiebre horizontal (Glove vs Arm side) y el eje Y muestra el quiebre inducido vertical.
- **Escenario 3.3 (Dispersión en Zona de Strike)**: El usuario analiza la ubicación exacta de cada lanzamiento respecto al rectángulo regulatorio de home plate.

### Historia de Usuario 4 (P4): Exportación de Tarjeta Gráfica en Alta Resolución
**Como** creador de contenido de República Caraquista,  
**quiero** exportar una tarjeta visual panorámica (formato 16:9 a 300 DPI) con un solo clic,  
**para** compartirla en redes sociales (@republicaraquista) con diseño editorial consistente y créditos oficiales.

- **Escenario 4.1**: El usuario pulsa "Descargar Tarjeta HD"; se genera un archivo PNG nítido con el encabezado biográfico, avatar, boxscore, los tres paneles visuales y el pie de página con créditos a Jorge Leonardo Loreto y Thomas Nestico.

### Historia de Usuario 5 (P5): Integración Repo-wide y Navegación Contextual
**Como** usuario navegando la aplicación,  
**quiero** acceder a la vista de pitcheo desde el menú principal y mediante enlaces directos en las fichas de lanzadores de otras vistas,  
**para** tener una experiencia de usuario fluida e interconectada.

### Historia de Usuario 6 (P6): Modos Temporales (Salida Individual vs Temporada Completa)
**Como** analista sabermétrico o aficionado,  
**quiero** alternar con un botón entre el análisis de una salida puntual ("Salida Individual") y el consolidado acumulado de toda la temporada ("Temporada Completa"),  
**para** evaluar tanto el desempeño en un partido específico como la consistencia y tendencias del repertorio a lo largo de todo el año.

- **Escenario 6.1 (Modo Juego)**: El usuario selecciona una salida y analiza el boxscore, destinos y gráficos de ese juego en particular.
- **Escenario 6.2 (Modo Temporada)**: El usuario pulsa "Temporada Completa"; el sistema consolida todas las apariciones de la temporada seleccionada, suma las entradas lanzadas, carreras, boletos, ponches y pitcheos, calculando ERA, WHIP y CSW% global, y agrupando todos los lanzamientos registrados de la temporada en la matriz de destinos o repertorio.

---

## 3. Requerimientos Funcionales

- **RF-01 (Buscador Reactivo y Filtro)**: Campo de búsqueda con autocompletado en tiempo real tras ingresar al menos 2 caracteres, con priorización de lanzadores con historial en Leones del Caracas y la LVBP.
- **RF-02 (Accesos Rápidos a Referentes Caraquistas)**: Despliegue de accesos directos de un clic a lanzadores clave (Albert Suárez, Erick Leal, Norwith Gudiño, Jhoulys Chacín, Ricardo Rodríguez, José Mujica).
- **RF-03 (Selector de Temporadas y Salidas)**: Soporte para temporadas 2022 a 2026, selector de fase (Todas las Fases, Temporada Regular, Round Robin, Serie Final) y listado ordenado cronológicamente de salidas individuales con resultado y rol.
- **RF-04 (Bifurcación de Modos)**: Conmutación clara entre la pestaña LVBP (Play-by-Play) y la pestaña MLB/MiLB (Statcast), ajustando automáticamente las métricas e interfaces al nivel de telemetría disponible.
- **RF-05 (Tablas Sabermétricas Adaptativas)**: Renderizado de la tabla de destinos de pitcheos para LVBP y de la tabla de repertorio Hawk-Eye para MLB, con formato numérico y porcentual estricto.
- **RF-06 (Visualización Gráfica Tríptica)**:
  - En LVBP: Gráfico de Carga por Entrada (barras apiladas de strikes y bolas), Curva de Apalancamiento Tango RE24 con cota de 1.0, y Gráfico comparativo de Platoon Splits (LHB vs RHB).
  - En MLB: Gráfico cartesiano de movimiento (iVB vs HB en pulgadas), Dispersión en Zona de Strike con marco regulatorio y Distribución de velocidades/uso.
- **RF-07 (Generador de Tarjeta Gráfica en Cliente)**: Renderizado dinámico de la tarjeta panorámica en resolución ultra-alta (2400x1350 px equivalentes a 300 DPI) con preservación tipográfica, avatares circulares y marcas de agua.
- **RF-08 (Navegación Unificada)**: Incorporación oficial de `/pitching` en la barra lateral de escritorio y en la navegación móvil, con estado activo destacado.
- **RF-09 (Atribución y Cumplimiento de Marca)**: Inclusión obligatoria de créditos editoriales en pie de página para `@republicaraquista • Jorge Leonardo Loreto` y atribución metodológica a Thomas Nestico (@TJStats).
- **RF-10 (Selector de Modo Temporal)**: Selector conmutador de alta visibilidad entre "Salida Individual" (un juego) y "Temporada Completa", recalculando automáticamente las métricas agregadas (IP acumuladas, ERA, WHIP, consolidación de la tabla de destinos o repertorio, y proyecciones de volumen) sin recargar la página.

---

## 4. Criterios de Éxito (Medibles y Tecnológicamente Agnósticos)

1. **Tiempo de Localización**: Un usuario puede localizar a cualquier lanzador caraquista en menos de 2 segundos mediante el buscador o accesos directos.
2. **Precisión de Boxscore**: El 100% de las salidas de la LVBP deben reportar exactamente el número de pitcheos, strikes y outs registrados en el acta oficial de juego sin discrepancias.
3. **Calidad Gráfica de Exportación**: La imagen descargada debe generarse en menos de 1.5 segundos en el navegador, con legibilidad tipográfica perfecta en pantallas Retina/4K y sin solapamiento de textos o leyendas.
4. **Respuesta Móvil y Táctil**: Todas las tablas, selectores y gráficos deben ser completamente operables en pantallas de dispositivos móviles (375px en adelante) sin desbordamiento horizontal no intencionado.
5. **Cero Dependencia de Statcast en LVBP**: Ninguna vista de la LVBP debe intentar mostrar métricas de radar inexistentes (Exit Velocity o Barrels), manteniendo la fidelidad sabermétrica de la liga.

---

## 5. Entidades Clave

- **Perfil de Lanzador**: Identificador oficial, nombre completo, foto oficial, mano de lanzar, equipo actual, indicador de historial en Leones del Caracas, historial en LVBP y liga principal.
- **Registro de Salida (Game Log)**: Identificador de juego, fecha, rival, condición de local/visitante, rol (Abridor/Relevista), entradas lanzadas, carreras permitidas, limpias, boletos, ponches, conteo de pitcheos, strikes y decisión (W, L, SV, HLD).
- **Detalle de Pitcheo**: Número de secuencia, tipo de lanzamiento, velocidad inicial, rotación, quiebre vertical inducido, quiebre horizontal, coordenadas en el plato, resultado del lanzamiento (bola, strike cantado, whiff, foul, en juego), bateador enfrentado, outs y apalancamiento (Leverage Index).
- **Resumen Sabermétrico PBP**: Conteo y porcentajes de bolas, strikes cantados, whiffs, fouls, pelotas en juego, CSW%, Whiff%, porcentaje de strikes totales y porcentaje de primer strike (1stS%).
- **Métricas de Repertorio Hawk-Eye**: Tipo de pitcheo, frecuencia de uso, velocidad promedio/máxima, spin promedio, quiebre vertical inducido, quiebre horizontal, Whiff%, CSW% y Zone%.

---

## 6. Supuestos y Límites

- **Fuente de Datos**: Los registros de juego se consumen de las fuentes oficiales de MLB Stats API y de los registros históricos de Leones del Caracas en la base de datos de la plataforma.
- **Límite de Alcance**: La plataforma no busca simular telemetría sintética donde no existe (cero Statcast inventado en LVBP).
- **Persistencia**: La generación de tarjetas gráficas se realiza enteramente en el cliente para garantizar inmediatez y no saturar almacenamiento en el servidor.
