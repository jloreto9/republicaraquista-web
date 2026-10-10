# Interface Contract: Centro de Mando Services & Data Providers

**Identificador**: `centro-mando-leones-stats`  
**Módulos Afectados**: `src/lib/leones-stats-service.ts`, `src/lib/supabase.ts`, `src/app/api/leones-stats/route.ts`  

---

## 1. Contratos de Funciones TypeScript

### 1.1 `getLeonesAdvancedStats(season?: number): Promise<LeonesAdvancedStats>`
- **Entrada**: `season` (opcional, por defecto `ACTIVE_SEASON` = 2025).
- **Salida**: Objeto `LeonesAdvancedStats` con todos los splits situacionales calculados o consolidados.
- **Garantía**: Nunca arroja excepción (`throws`); retorna estructura con valores neutros ("0-0", 0) en caso de fallo.

### 1.2 `getWeeklyRecords(season?: number): Promise<WeeklyRecord[]>`
- **Entrada**: `season` (opcional, por defecto `ACTIVE_SEASON`).
- **Salida**: Lista de semanas ISO ordenadas cronológicamente con récord, CF, CP, DIF y PCT.

### 1.3 `getLastGameDetail(season?: number): Promise<LastGameDetail | null>`
- **Entrada**: `season` (opcional).
- **Salida**: Detalles del último encuentro jugado por Leones junto a la evaluación del MVP por WPA.

### 1.4 `getRecentTrends(limit?: number, season?: number): Promise<TrendGameItem[]>`
- **Entrada**: `limit` (por defecto 10), `season`.
- **Salida**: Lista de los últimos N juegos con resultado binario W/L, rival y marcador.

### 1.5 `getCaracasTeamLeaders(season?: number): Promise<{ batters: BatterLeaderItem[]; pitchers: PitcherLeaderItem[] }>`
- **Entrada**: `season`.
- **Salida**: Top 5 bateadores clasificados por OPS (mín. 10 AB) y Top 5 lanzadores clasificados por ERA (mín. 5 IP).

### 1.6 `getBroadcastChannelRecords(season?: number): Promise<BroadcastChannelRecord[]>`
- **Entrada**: `season` (por defecto `ACTIVE_SEASON` o temporada entrante 2026).
- **Salida**: Lista de canales lineales ordenada por partidos asignados (ByM Sport, 1Baseball, IVC, Televen, Venevisión, Meridiano TV, LVBP YouTube, etc.) con récord de victorias/derrotas de Leones y partidos jugados.
- **Regla**: Excluye explícitamente BeisbolPlay de la comparativa competitiva.

---

## 2. Contrato de Endpoint API (Opcional para cliente)

### `GET /api/leones-stats`
- **Query Params**: `?season=2025`
- **Response**:
```json
{
  "success": true,
  "season": 2025,
  "stats": { ... },
  "weeklyRecords": [ ... ],
  "lastGame": { ... },
  "trends": [ ... ],
  "leaders": { ... }
}
```
