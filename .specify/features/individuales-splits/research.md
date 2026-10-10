# Research: Splits Individuales Exhaustivos en Stats Individuales

**Identificador**: `individuales-splits`  
**Estado**: Resuelto  

---

## 1. Decisiones Técnicas y Arquitectura de Datos

### Decisión 1: Arquitectura Híbrida de Agregación
- **Contexto**: Un jugador en la LVBP disputa entre 30 y 60 partidos en una temporada. 
- **Estrategia**:
  - Para los **Splits de Calendario / Contexto (Home/Away, Día/Noche, W/L, Rival, Mes, Fase)**:
    - Se realiza una única consulta unificada a Supabase:
      `supabase.from('batting_stats').select('..., games(...)').eq('player_id', id)`
    - La agregación se ejecuta en memoria en TypeScript en < 5ms.
  - Para los **Splits Situacionales de Jugada (Bases, RISP, 2 Outs, Platoon RHP/LHP, Inning Buckets, LOB, BvP)**:
    - Para los jugadores con registro PBP (Leones y figuras seguidas), se combina con el motor situacional determinístico de `situational-engine.ts`.
    - Si el jugador no tiene data PBP detallada, el sistema exhibe los splits de contexto completos con un badge indicativo.

### Decisión 2: Experiencia de Usuario y Accesibilidad en UI
- **Pestaña Dedicada + Acceso Rápido**:
  1. En `/individuales`, se agrega la pestaña de primer nivel `[ ⚡ Splits Situacionales ]`.
  2. En las tablas existentes de `Bateo` y `Pitcheo`, se agrega en la columna de acciones un botón `⚡ Splits` que conmuta automáticamente a la pestaña de splits seleccionando a dicho jugador.
  3. En la pestaña de splits, se incorpora un selector con buscador rápido para cambiar de jugador sin tener que regresar a la tabla principal.

### Decisión 3: Formato Sabermétrico de Métricas
- Tasas porcentuales (`AVG`, `OBP`, `SLG`, `OPS`) con formato sin cero a la izquierda (`.315`, `.892`, `1.042`).
- Indicadores visuales de color:
  - `OPS >= .900`: Oro Caraquista `#FDB827` (Elite)
  - `.800 <= OPS < .900`: Esmeralda `#10B981` (Sólido)
  - `OPS < .700`: Atenuado `#94A3B8`
- Para lanzadores:
  - `ERA <= 3.50`: Esmeralda `#10B981`
  - `ERA >= 5.00`: Rosa/Rojo `#F43F5E`

---

## 2. Dependencias y Cero Bloat

- Cero librerías nuevas. Se reutilizan:
  - Lucide React (`Flame`, `Target`, `Shield`, `Calendar`, `Sun`, `Moon`, `MapPin`, `Users`, `CheckCircle2`)
  - Tailwind CSS v4 con la paleta Dark Navy del proyecto.
  - Supabase client existente.
