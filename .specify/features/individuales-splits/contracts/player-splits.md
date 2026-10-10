# Interface Contract: Player Splits Service & API

**Identificador**: `individuales-splits`  
**Módulos Afectados**: `src/lib/player-splits-service.ts`, `src/app/api/stats/player-splits/route.ts`  

---

## 1. Contratos de Funciones TypeScript

### 1.1 `getPlayerSplitsProfile(playerId: number, type: "batter" | "pitcher", season?: number): Promise<PlayerSplitsProfile | null>`
- **Entrada**: `playerId` (número MLB ID), `type` ("batter" o "pitcher"), `season` (por defecto 2025).
- **Salida**: Objeto `PlayerSplitsProfile` completo con todos los grupos de splits agregados.
- **Garantía**: Si no hay datos en Supabase para el jugador, retorna null de forma segura.

### 1.2 `getAllAvailablePlayersForSplits(season?: number): Promise<{ id: number; name: string; teamId: number; teamAbbr: string; avatarUrl: string; type: "batter" | "pitcher" }[]>`
- **Entrada**: `season`.
- **Salida**: Lista ordenada alfabéticamente de jugadores elegibles para el selector de splits.

---

## 2. Contrato de Endpoint API

### `GET /api/stats/player-splits`
- **Query Params**:
  - `player_id`: ID del jugador (ej: `625506`)
  - `type`: `batter` o `pitcher` (opcional, por defecto `batter`)
  - `season`: Año de temporada (opcional, por defecto `2025`)
- **Response**:
```json
{
  "success": true,
  "profile": {
    "playerId": 625506,
    "playerName": "Aldrem Corredor",
    "teamId": 695,
    "type": "batter",
    "contextSplits": [ ... ],
    "situationalSplits": [ ... ],
    "opponentSplits": [ ... ],
    "monthlySplits": [ ... ]
  }
}
```
