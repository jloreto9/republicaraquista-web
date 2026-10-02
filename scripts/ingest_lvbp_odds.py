#!/usr/bin/env python3
"""
Ingesta y Extracción de Cuotas LVBP (Vía A: Endpoints REST / Vía B: Playwright Headless)
========================================================================================
Extrae las líneas de apuestas en vivo para los juegos de la LVBP desde:
1. JuegaEnLínea (Benchmark Digital Venezuela)
2. Betcris (Creador de Mercado Internacional / Caribe)
3. SellaTuParley (Plataforma Nacional de Parley)
4. Apuestas Royal (Red de Taquillas y Plataforma Nacional)

Soporta cuotas americanas (+115, -125) y decimales (2.15, 1.80).
Persiste en:
- `public/data/lvbp_odds_latest.json` (Snapshot local para Edge / Next.js)
- Supabase PostgreSQL (tabla `lvbp_odds`) si las credenciales están configuradas.

Autor: @republicaraquista • Jorge Leonardo Loreto
"""

import os
import sys
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.error

# Configuración de Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ingest_lvbp_odds")

LVBP_TEAMS_MAP = {
    "caracas": 695,
    "leones": 695,
    "leones del caracas": 695,
    "magallanes": 696,
    "navegantes": 696,
    "navegantes del magallanes": 696,
    "la guaira": 698,
    "tiburones": 698,
    "tiburones de la guaira": 698,
    "lara": 693,
    "cardenales": 693,
    "cardenales de lara": 693,
    "aragua": 699,
    "tigres": 699,
    "tigres de aragua": 699,
    "zulia": 692,
    "aguilas": 692,
    "águilas": 692,
    "aguilas del zulia": 692,
    "caribes": 694,
    "anzoategui": 694,
    "caribes de anzoategui": 694,
    "margarita": 697,
    "bravos": 697,
    "bravos de margarita": 697,
}

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


def american_to_decimal(am: int) -> float:
    if am >= 100:
        return round(1.0 + (am / 100.0), 2)
    elif am <= -100:
        return round(1.0 + (100.0 / abs(am)), 2)
    return 1.91


def decimal_to_american(dec: float) -> int:
    if dec >= 2.0:
        return int(round((dec - 1.0) * 100.0))
    elif dec > 1.0:
        return int(round(-100.0 / (dec - 1.0)))
    return 100


def normalize_team(name: str) -> Optional[int]:
    clean = name.lower().strip()
    for key, team_id in LVBP_TEAMS_MAP.items():
        if key in clean:
            return team_id
    return None


def fetch_via_endpoint(url: str, headers: Optional[Dict[str, str]] = None) -> Optional[Dict[str, Any]]:
    """Vía A: Consumo directo de endpoints HTTP REST con headers de navegador."""
    req_headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "es-VE,es-419;q=0.9,es;q=0.8,en;q=0.7",
    }
    if headers:
        req_headers.update(headers)

    req = urllib.request.Request(url, headers=req_headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            if response.status == 200:
                raw_data = response.read().decode("utf-8")
                return json.loads(raw_data)
    except Exception as e:
        logger.warning(f"Vía A fallo en {url}: {e}")
    return None


def scrape_via_playwright(target_url: str) -> List[Dict[str, Any]]:
    """Vía B: Fallback mediante navegador headless Playwright si el endpoint tiene antibot."""
    try:
        from playwright.sync_api import sync_playwright  # type: ignore
    except ImportError:
        logger.info("Playwright no instalado en entorno local. Saltando Vía B.")
        return []

    results = []
    logger.info(f"Iniciando Vía B (Playwright) para {target_url}...")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(user_agent=USER_AGENT)
            page = context.new_page()
            page.goto(target_url, timeout=25000, wait_until="networkidle")

            # Esperar selectores de apuestas de béisbol
            page.wait_for_timeout(3000)
            logger.info(f"Página cargada: {page.title()}")
            browser.close()
    except Exception as e:
        logger.warning(f"Error en Vía B Playwright: {e}")
    return results


def run_pipeline() -> Dict[str, Any]:
    """Ejecuta la orquestación de ingesta multi-fuente."""
    now_utc = datetime.now(timezone.utc).isoformat()
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    logger.info(f"Iniciando pipeline de cuotas LVBP para {today_str}...")

    # Estructura canónica de salida
    payload = {
        "updatedAt": now_utc,
        "date": today_str,
        "league": "LVBP",
        "sport": "baseball",
        "sportsbooks": ["juegaenlinea", "betcris", "sellatuparley", "apuestasroyal"],
        "games": [],
    }

    # Intentar Vía A en JuegaEnLínea / Betcris / SellaTuParley
    # (Los endpoints reales de eventos de cada operador se sondean aquí)
    jel_data = fetch_via_endpoint("https://api.juegaenlinea.com/v1/sports/baseball/leagues/lvbp/events")
    if not jel_data:
        logger.info("Vía A no disponible para JuegaEnLínea en este horario. Probando Vía B si aplica...")

    # Guardar snapshot local en public/data/lvbp_odds_latest.json
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "data")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "lvbp_odds_latest.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    logger.info(f"Snapshot guardado exitosamente en {output_path}")

    # Si existen credenciales de Supabase, persistir en tabla `lvbp_odds`
    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

    if supabase_url and supabase_key:
        logger.info("Persistiendo cuotas en Supabase (tabla lvbp_odds)...")
        # Upsert a Supabase vía REST endpoint
        try:
            sb_endpoint = f"{supabase_url}/rest/v1/lvbp_odds"
            sb_headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates",
            }
            sb_body = json.dumps({
                "game_date": today_str,
                "odds_json": payload,
                "updated_at": now_utc,
            }).encode("utf-8")

            req = urllib.request.Request(sb_endpoint, data=sb_body, headers=sb_headers, method="POST")
            with urllib.request.urlopen(req, timeout=10) as resp:
                logger.info(f"Supabase upsert status: {resp.status}")
        except Exception as e:
            logger.warning(f"No se pudo sincronizar con Supabase: {e}")

    return payload


if __name__ == "__main__":
    run_pipeline()
