# API Contract: Pitcher Game Logs

**Endpoint**: `GET /api/pitching/game-logs`

## Parámetros de Consulta (Query Params)
- `pitcher_id` (number, requerido): ID oficial de MLB del lanzador.
- `season` (number, opcional, default: `2025`): Año de la temporada.
- `branch` (string, opcional, enum: `lvbp` | `mlb` | `mexico`, default: `lvbp`): Rama de la liga.
- `phase` (string, opcional, enum: `all` | `R` | `L` | `F`, default: `all`): Fase del campeonato.

## Respuesta HTTP 200 OK
```json
{
  "pitcherId": 544150,
  "season": 2025,
  "branch": "lvbp",
  "phase": "all",
  "count": 4,
  "logs": [
    {
      "gamePk": 775240,
      "date": "2025-11-20",
      "opponent": "Navegantes del Magallanes",
      "isStarter": true,
      "role": "Abridor",
      "gameType": "R",
      "phase": "R",
      "ip": "5.0",
      "h": 3,
      "r": 1,
      "er": 1,
      "bb": 1,
      "so": 6,
      "hr": 0,
      "pitches": 78,
      "strikes": 52,
      "era": "1.80",
      "decision": "W",
      "league": "LVBP"
    }
  ]
}
```
