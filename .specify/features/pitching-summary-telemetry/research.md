# Technical Research: Pitching Summary & Telemetría

## Decisiones Técnicas y Arquitectura

### 1. Extracción e Ingesta de Datos: MLB Stats API vs Baseball Savant vs Supabase
- **Decisión**: Arquitectura híbrida en Next.js Route Handlers (`src/app/api/pitching/...`):
  - **Buscador de Lanzadores**: Endpoint `https://statsapi.mlb.com/api/v1/people/search` enriquecido con los IDs de lanzadores de Leones del Caracas conocidos y caché local en memoria.
  - **Salidas (Game Logs)**: Para LVBP, consulta al endpoint oficial `https://statsapi.mlb.com/api/v1/people/{id}/stats?stats=gameLog&group=pitching&season={season}&sportId=17` con fallback a datos locales. Para MLB/MiLB, consulta con `sportIds=1,11,12`.
  - **Detalle de Pitcheo a Pitcheo**:
    - Para juegos con Statcast (MLB): Consumo de Live Feed Gameday (`https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live`).
    - Para juegos LVBP: Mismo endpoint de Gameday Live Feed (que contiene todos los eventos `playEvents` con `pitchData` y `details`), parseando de forma nativa los destinos de lanzamientos, bolas, strikes cantados, whiffs y fouls.
- **Razón**: Permite respuesta instantánea en Vercel Edge/Serverless sin necesidad de bibliotecas Python pesadas como `pybaseball` en tiempo de ejecución, eliminando tiempos de espera largos y fallos de timeout.
- **Alternativas descartadas**:
  - Scraping directo de Baseball Savant en runtime: Inestable ante cambios de formato HTML y susceptible a bloqueos de Cloudflare.

### 2. Generador de Tarjeta HD (Thomas Nestico Style) en Cliente
- **Decisión**: Implementación de un canvas HTML5 a escala ultra-alta (2400x1350 px a escala de resolución 2x/300 DPI) ejecutado en el navegador con soporte de exportación a archivo PNG (`pitching_summary_{name}_{date}.png`).
- **Razón**:
  - Evita dependencias de servidor (como Matplotlib, Cairo o Puppeteer en Vercel, que superan el límite de 50MB de funciones serverless).
  - Cero latencia de red en la descarga: la tarjeta se renderiza en milisegundos en el hilo del cliente.
  - Renderizado pixel-perfect de texto, avatares circulares de MLB, logos vectoriales de Leones del Caracas y paleta oficial `#070B19`, `#0D152B`, `#FDB827`.
- **Alternativas descartadas**:
  - Endpoint de Python con Matplotlib en contenedor externo: Introduce latencia de red adicional, costo de infraestructura y posibles fallos si el contenedor duerme.

### 3. Paleta Cromática y Visualización de Tipos de Pitcheo
- **Decisión**: Reutilizar la paleta canónica de Thomas Nestico (@TJStats) y Baseball Savant:
  - 4-Seam Fastball: `#FF007D` (Magenta vivo)
  - Sinker: `#98165D` (Borgoña oscuro)
  - Cutter: `#BE5FA0` (Lavanda medio)
  - Slider: `#67E18D` (Verde esmeralda claro)
  - Sweeper: `#1BB999` (Turquesa / Teal)
  - Changeup: `#F79E70` (Melocotón / Naranja claro)
  - Splitter: `#FE6100` (Naranja intenso)
  - Curveball: `#3025CE` (Azul eléctrico)
  - Knuckle Curve: `#311D8B` (Índigo oscuro)
- **Razón**: Máxima coherencia visual y reconocimiento instantáneo por parte de la comunidad sabermétrica global.

### 4. Modelo Tango RE24 y Apalancamiento (Leverage Index)
- **Decisión**: Implementar en TypeScript la matriz clásica de Tom Tango de 24 estados (3 outs x 8 configuraciones de bases) para calcular el Leverage Index promedio de cada entrada y de la salida general.
- **Razón**: Paridad matemática exacta contra `wpa_engine.py` de los repositorios de referencia.
