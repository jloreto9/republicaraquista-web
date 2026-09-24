# API Contract: Game Pitch Data

**Endpoint**: `GET /api/pitching/game-data`

## Parámetros de Consulta (Query Params)
- `game_pk` (number, requerido): ID oficial de MLB del juego.
- `pitcher_id` (number, requerido): ID oficial de MLB del lanzador.
- `is_lvbp` (boolean, opcional, default: `true`): Bandera para indicar si es juego de LVBP.

## Respuesta HTTP 200 OK
```json
{
  "gamePk": 775240,
  "pitcherId": 544150,
  "isStarter": true,
  "role": "Abridor",
  "decision": "W",
  "totalPitches": 78,
  "hasStatcast": false,
  "boxscore": {
    "ip": "5.0",
    "h": 3,
    "r": 1,
    "er": 1,
    "bb": 1,
    "so": 6,
    "pitches": 78,
    "strikes": 52,
    "cswPct": "30.8%",
    "whiffPct": "26.1%"
  },
  "statcastTable": [],
  "pbpTable": [
    { "destination": "Bolas", "count": 26, "pct": "33.3%", "color": "#3B82F6" },
    { "destination": "Strikes Cantados", "count": 14, "pct": "17.9%", "color": "#10B981" },
    { "destination": "Strikes Abanicados (Whiff)", "count": 10, "pct": "12.8%", "color": "#FDB827" },
    { "destination": "Fouls", "count": 16, "pct": "20.5%", "color": "#F59E0B" },
    { "destination": "En Juego (Out / Hit)", "count": 12, "pct": "15.4%", "color": "#8B5CF6" }
  ],
  "pbpKpis": {
    "totalPitches": 78,
    "strikes": 52,
    "balls": 26,
    "strikePct": "66.7%",
    "cswPct": "30.8%",
    "whiffPct": "26.1%",
    "fpsPct": "65.0%",
    "swings": 38,
    "calledStrikes": 14,
    "fouls": 16,
    "inPlay": 12
  },
  "inningsWorkload": [
    { "inning": 1, "pitches": 15, "strikes": 10, "balls": 5, "whiffs": 2, "avgLi": 0.85 },
    { "inning": 2, "pitches": 18, "strikes": 12, "balls": 6, "whiffs": 3, "avgLi": 1.15 }
  ],
  "splitsPlatoon": {
    "vsLhb": { "pitches": 32, "cswPct": "31.2%", "whiffPct": "25.0%", "strikePct": "65.6%" },
    "vsRhb": { "pitches": 46, "cswPct": "30.4%", "whiffPct": "26.9%", "strikePct": "67.4%" }
  },
  "pitches": []
}
```
