# Especificación Funcional: Emulador de Estadios y Simulador "HR en X/8" (Would It Dong?)

## 1. Resumen Ejecutivo y Propósito
El módulo de **Spray Charts** de República Caraquista incorpora el **Emulador de Estadios de la LVBP y Simulador Sabermétrico de Jonrones ("HR en X/8 Estadios" / Would It Dong?)**.
Esta funcionalidad permite a los usuarios:
1. Superponer con precisión geométrica las bardas perimetrales reales de los **9 estadios de la LVBP** sobre el diamante interactivo.
2. Evaluar de forma determinística si cualquier batazo profundo ($\ge 300$ pies: Jonrones reales, elevados profundos, dobles contra la barda y líneas) habría sido Home Run en cada uno de los estadios de la liga según el ángulo exacto $\theta$ y la distancia proyectada.
3. Analizar tanto la perspectiva de **8 Franquicias Oficiales** (con toggle canónico) como la de los **9 Estadios Totales** (incluyendo el Estadio Universitario de Caracas y Forum La Guaira).

---

## 2. Definición Canónica de los 9 Estadios de la LVBP

Cada estadio se modela mediante sus coordenadas radiales, dimensiones oficiales de barda en 5 sectores clave, altura promedio de pared y franquicia asociada:

| ID | Estadio | Ciudad | Franquicia Principal | LF (ft) | LCF (ft) | CF (ft) | RCF (ft) | RF (ft) | Altura Pared (ft) | Color Trazo |
|---|---|---|---|---|---|---|---|---|---|---|
| `monumental` | **Estadio Monumental Simón Bolívar** | Caracas | Leones del Caracas (695) | 338 | 375 | 403 | 375 | 338 | 10 - 12 | `#FDB827` (Dorado) |
| `universitario` | **Estadio Universitario de Caracas** | Caracas | Tiburones / UCV (698) | 347 | 385 | 407 | 385 | 347 | 8 - 10 | `#0ea5e9` (Azul Cielo) |
| `valencia` | **Estadio José Bernardo Pérez** | Valencia | Navegantes del Magallanes (696) | 347 | 365 | 385 | 365 | 347 | 8 | `#3b82f6` (Azul Eléctrico) |
| `barquisimeto` | **Estadio Antonio Herrera Gutiérrez** | Barquisimeto | Cardenales de Lara (693) | 338 | 375 | 407 | 375 | 338 | 8 - 10 | `#dc2626` (Rojo Cardenal) |
| `maracay` | **Estadio José Pérez Colmenares** | Maracay | Tigres de Aragua (699) | 335 | 360 | 380 | 360 | 335 | 8 | `#059669` (Esmeralda) |
| `maracaibo` | **Estadio Luis Aparicio 'El Grande'** | Maracaibo | Águilas del Zulia (692) | 348 | 378 | 401 | 378 | 348 | 8 - 10 | `#f59e0b` (Ámbar) |
| `plc` | **Estadio Alfonso 'Chico' Carrasquel** | Puerto La Cruz | Caribes de Anzoátegui (694) | 325 | 360 | 380 | 360 | 325 | 8 - 12 | `#f97316` (Naranja) |
| `macuto` | **Estadio Jorge Luis García Carneiro** | La Guaira | Tiburones de La Guaira (698) | 335 | 370 | 395 | 370 | 335 | 8 - 9 | `#06b6d4` (Cian) |
| `margarita` | **Estadio Nueva Esparta** | Porlamar | Bravos de Margarita (697) | 335 | 370 | 395 | 370 | 335 | 8 | `#8b5cf6` (Púrpura) |

---

## 3. Modelo Matemático y Físico de Emulación de Barda

### 3.1. Coordenadas y Proyección Radial
Para cualquier batazo con coordenadas de impacto $(x_{ft}, y_{ft})$:
1. **Distancia Euclidiana**: $d = \sqrt{x_{ft}^2 + y_{ft}^2}$.
2. **Ángulo de Spray ($\theta$)**: $\theta = \text{atan2}(x_{ft}, y_{ft}) \times \frac{180}{\pi}$, normalizado en el rango $[-45^\circ, +45^\circ]$ entre las líneas de cal.
   - $\theta = -45^\circ$: Poste de foul izquierdo (LF).
   - $\theta = -22.5^\circ$: Callejón izquierdo (LCF).
   - $\theta = 0^\circ$: Jardín central exacto (CF).
   - $\theta = +22.5^\circ$: Callejón derecho (RCF).
   - $\theta = +45^\circ$: Poste de foul derecho (RF).

### 3.2. Curvatura de Barda $R_S(\theta)$ por Estadio
La distancia a la barda $R_S(\theta)$ en cualquier ángulo continuo se interpola cuadráticamente o por spline cúbico hermitiano a través de los 5 puntos de anclaje:
$$R_S(\theta) = \text{Interpolate}\big(\{(-45^\circ, D_{LF}), (-22.5^\circ, D_{LCF}), (0^\circ, D_{CF}), (+22.5^\circ, D_{RCF}), (+45^\circ, D_{RF})\}, \theta\big)$$

### 3.3. Criterio de Decisión "Would It Dong?"
Un batazo se considera Home Run en el estadio $S$ si:
1. El ángulo $\theta \in [-45^\circ, +45^\circ]$ (dentro de zona fair).
2. La distancia $d \ge R_S(\theta)$.
3. La trayectoria no es un rolling de out (`trajectory !== 'ground_ball'`).

### 3.4. Métricas de Resumen
Para cada batazo calificado:
- **`parksCount`**: Número de estadios donde supera la barda (ej. 7 de 8, 3 de 9, 8 de 8 "No-Doubter", 1 de 8 "Unicornio").
- **Clasificación Sabermétrica del Batazo**:
  - **No-Doubter (Sin Duda)**: Jonrón en los 8 (o 9) estadios.
  - **Mostly Gone**: Jonrón en 5 a 7 estadios.
  - **Borderline / Wall Scraper**: Jonrón en 2 a 4 estadios.
  - **Unicornio**: Jonrón en solo 1 estadio (típicamente batazos cortos por el LF de Puerto La Cruz o Maracay).
  - **Robo / Flyout Profundo**: Batazo de out que habría sido jonrón en $\ge 1$ estadio.

---

## 4. Requisitos de Interfaz de Usuario (UI/UX)

1. **Selector de Estadio en el Diamante:**
   - Dropdown/Botones con los logos/nombres de los estadios para visualizar la barda de un estadio en particular o una comparación general ("Todos los Estadios").
   - Trazo de barda dinámico que actualiza el contorno del outfield en SVG.
2. **Tarjeta / Modal Interactivo de Batazo ("HR en X/8"):**
   - Al tocar o hacer hover en cualquier batazo $\ge 300$ ft, se despliega la tarjeta con:
     - Título: `¿Habría sido Jonrón?` con badge visual (ej. `8/8 No-Doubter` o `3/8 Parques`).
     - Cuadrícula con los 8 escudos de los equipos LVBP con check verde `✓` o cruz roja `✕`, distancia a la barda en ese ángulo y margen (ej. `+12 ft` o `-8 ft`).
     - Toggle para alternar entre "8 Franquicias Canónicas" y "9 Estadios Totales".
3. **Botón / Drawer "Lista de Batazos Profundos":**
   - Botón accesible en la cabecera del diamante: `💥 Simulador HR en X/8`.
   - Despliega una tabla ordenada con todos los batazos de $\ge 300$ pies del bateador seleccionado, mostrando:
     - Evento real (HR, Flyout, Doble, etc.)
     - Distancia real
     - Ángulo y dirección
     - Conteo de estadios (ej. `7/8`)
     - Clic para enfocar y resaltar el batazo en el diamante.

---

## 5. Criterios de Aceptación y Pruebas
1. Todos los 9 estadios tienen dimensiones exactas y polígonos generados sin artefactos visuales en el SVG.
2. Los batazos de $\ge 300$ pies calculan determinísticamente su superación de barda según $\theta$.
3. La interfaz permite seleccionar cualquier estadio y ver el cambio en tiempo real del contorno de barda.
4. Cero regresiones en la vista de Spray Charts actual, velocidad de carga y responsividad móvil/desktop.
