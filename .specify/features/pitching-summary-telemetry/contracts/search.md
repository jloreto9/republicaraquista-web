# API Contract: Search Pitchers

**Endpoint**: `GET /api/pitching/search`

## Parámetros de Consulta (Query Params)
- `q` (string, requerido): Texto de búsqueda (mínimo 2 caracteres) o ID numérico de jugador.

## Respuesta HTTP 200 OK
```json
{
  "query": "Albert",
  "count": 1,
  "results": [
    {
      "id": 544150,
      "name": "Albert Suárez",
      "position": "P",
      "team": "Baltimore Orioles",
      "throws": "R",
      "hasLvbpHistory": true,
      "hasCaracasHistory": true,
      "lvbpTeamId": 695,
      "lvbpTeamName": "Leones del Caracas",
      "lvbpTeamAbbr": "CAR",
      "photoUrl": "https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current/w_213,q_auto:best/v1/people/544150/headshot/67/current"
    }
  ]
}
```

## Manejo de Errores
- Si `q` tiene menos de 2 caracteres: Retorna `{ "query": "", "count": 0, "results": [] }` con status 200.
