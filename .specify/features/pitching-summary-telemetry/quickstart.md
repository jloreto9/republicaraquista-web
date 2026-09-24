# Quickstart Guide: Validating Pitching Summary & Telemetría

## Escenarios de Validación

### 1. Búsqueda de Lanzadores
1. Abrir `/pitching` en el navegador.
2. Comprobar que se presenta el buscador con accesos rápidos a Albert Suárez, Erick Leal, Jhoulys Chacín, Norwith Gudiño, etc.
3. Escribir "Albert" en la caja de búsqueda.
4. Validar que la API `/api/pitching/search?q=Albert` responde en < 500ms y despliega la tarjeta con el badge de Leones del Caracas.

### 2. Carga de Salidas (Game Logs)
1. Hacer clic en "Albert Suárez".
2. Confirmar que se carga la lista de salidas para la temporada 2025.
3. Comprobar que se muestran las estadísticas tradicionales (IP, H, ER, BB, K, Decisiones W/L/SV/HLD).

### 3. Inspección Play-by-Play LVBP
1. Seleccionar una apertura de Albert Suárez.
2. Verificar las pastillas de KPI: Conteo de pitcheos, strikes, CSW%, Whiff%.
3. Verificar la tabla de Destinos de Pitcheos (Bolas, Strikes Cantados, Whiffs, Fouls, En Juego) con sumatoria del 100%.
4. Inspeccionar el gráfico de Inning Workload: verificar barras apiladas de strikes y bolas con etiquetas enteras `Inn 1`, `Inn 2`, etc.
5. Inspeccionar el gráfico de Leverage Index: verificar línea de tendencia y línea de referencia 1.0 (Average Leverage).
6. Inspeccionar los Splits de Platoon: verificar tasas porcentuales vs zurdos y vs derechos.

### 4. Rama MLB Statcast (ej: Tarik Skubal)
1. Buscar "Tarik Skubal" (ID: 669373).
2. Conmutar a la pestaña "MLB / MiLB (Statcast)".
3. Verificar la tabla de repertorio: velocidad promedio, quiebre vertical inducido (iVB), quiebre horizontal (HB), spin rate, Whiff% y CSW%.
4. Verificar el gráfico cartesiano de movimiento (iVB vs HB) coloreado por tipo de lanzamiento.
5. Verificar el gráfico de dispersión en la Zona de Strike.

### 5. Descarga de Tarjeta HD (300 DPI)
1. Pulsar el botón "Descargar Tarjeta HD (PNG)".
2. Verificar que se descarga el archivo `pitching_summary_[nombre]_[fecha].png`.
3. Abrir la imagen y comprobar su nitidez (2400x1350 px), cabecera, gráficos, tabla y créditos a `@republicaraquista • Jorge Leonardo Loreto` y Thomas Nestico (@TJStats).

### 6. Navegación Unificada
1. Comprobar que "Pitching Summary" aparece en la barra lateral (`/pitching`) con su icono correspondiente.
2. Comprobar que en dispositivos móviles aparece en el menú desplegable.
3. Comprobar que en `/individuales` (pestaña pitcheo), cada lanzador tiene un botón directo para abrir su Pitching Summary.
