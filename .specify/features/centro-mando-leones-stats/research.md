# Research: Centro de Mando — Suite de Pestañas y Leones Stats

**Identificador**: `centro-mando-leones-stats`  
**Estado**: Resuelto  

---

## 1. Decisiones Técnicas y Rationale

### Decisión 1: Proveedor y Cálculo de Estadísticas Situacionales de Leones
- **Alternativa A**: Consultar en cada request a la API en vivo de MLB Stats API (`/feed/live`) para los 56 juegos en tiempo real.
  - *Problema*: 56 llamadas HTTP en serie/paralelo en cada render congelan el Edge Runtime de Vercel (límite de 10-15s en Serverless).
- **Alternativa B**: Precomputar las métricas situacionales canónicas para la temporada activa 2025 en un módulo tipado con fallbacks locales y revalidación ISR cada 300 segundos, complementado con consultas agregadas en Supabase (`games`, `batting_stats`, `pitching_stats`).
  - *Elección*: **Alternativa B**.
  - *Rationale*: Proporciona carga instantánea (<50ms), resistencia a fallos de red y total consistencia matemática con las estadísticas oficiales ya auditadas en Streamlit y Reflex.

### Decisión 2: Estructura de Componentes en el Dashboard
- **Alternativa A**: Cargar todo el contenido de las 4 pestañas en un solo componente monolítico dentro de `src/app/page.tsx`.
  - *Problema*: Dificulta el mantenimiento, la reutilización y la hidratación del cliente.
- **Alternativa B**: Crear un componente cliente interactivo `DashboardTabs` en `src/components/dashboard/dashboard-tabs.tsx` que maneja el estado de la pestaña activa (`ultimo-juego`, `tendencias`, `lideres`, `leones-stats`), delegando en subcomponentes especializados:
  - `LastGameTab`: Marcador final del último juego + MVP WPA.
  - `TrendsTab`: Tabla de los últimos 10 juegos.
  - `TeamLeadersTab`: Tablas de líderes de bateo y pitcheo de Leones.
  - `LeonesStatsTab`: Cuadrícula situacional de 3 columnas + tabla de semanas ISO.
  - *Elección*: **Alternativa B**.
  - *Rationale*: Arquitectura modular limpia, reactiva, accesible y de fácil prueba unitaria.

### Decisión 3: Algoritmo de Semanas ISO
- **Elección**: Replicar exactamente la lógica de `get_weekly_records` de `caraquista-reflex/core/supabase_client.py`:
  - Agrupación de partidos por lunes a domingo de calendario ISO.
  - Etiquetado: `Semana {N} (DD/MM - DD/MM)`.
  - Cálculo de Juegos, G, P, PCT (`.XXX`), CF, CP, DIF (`+X` / `-X`) y Récord (`XG-XP`).

### Decisión 4: Tarjeta MVP de WPA
- **Elección**: Integrar `calculateWinExpectancy` y el historial de jugadas de `src/lib/wpa-engine.ts`. Para el último encuentro de Leones, identificar el jugador con mayor aportación de Win Probability Added (WPA) con desglose en Bateo, Pitcheo y Clutch, idéntico a Streamlit.

---

## 2. Validación de Dependencias

- **Lucide Icons**: `Calendar`, `TrendingUp`, `Flame`, `Trophy`, `Sun`, `Moon`, `Target`, `RefreshCw`, `Shield`, `Zap`, `CheckCircle2`.
- **Estilos**: Tailwind CSS v4 clases estándar ya configuradas en el proyecto.
- **Sin nuevas librerías externas**: Cero impacto en el tamaño del bundle.
