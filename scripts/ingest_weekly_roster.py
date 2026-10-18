#!/usr/bin/env python3
"""
Ingesta y Sincronización Automática del Roster Semanal de Leones del Caracas
=============================================================================
Consulta stats.lvbp.com para detectar publicaciones de nuevos boletines semanales
de 34 jugadores de Leones del Caracas (LVBP 2026-2027).

Operaciones:
1. Consulta POST a https://stats.lvbp.com/resources/views/roster.php con team_id=695.
2. Extrae la URL del PDF oficial (ej: https://sapven.com/download/Leones_YYYYMMDD.pdf) y fecha.
3. Si detecta una nueva fecha o boletín:
   - Descarga el nuevo archivo a `public/documents/Leones_YYYYMMDD.pdf`.
   - Parsea los jugadores activos de la tabla HTML con BeautifulSoup.
   - Compara contra la semana previa y calcula altas (ENTRAN) y bajas (SALEN).
   - Actualiza `public/data/roster_latest.json`.

Autor: @republicaraquista • Jorge Leonardo Loreto
"""

import os
import sys
import re
import json
import logging
from datetime import datetime, timezone
import urllib.request
import urllib.error
from bs4 import BeautifulSoup

# Configuración de Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ingest_weekly_roster")

LVBP_ROSTER_VIEW_URL = "https://stats.lvbp.com/resources/views/roster.php"
LEONES_TEAM_ID = 695

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "public", "data")
DOCUMENTS_DIR = os.path.join(BASE_DIR, "public", "documents")
SNAPSHOT_FILE = os.path.join(DATA_DIR, "roster_latest.json")


def fetch_leones_roster_html() -> str:
    """Envía la petición POST para obtener la vista de Leones del Caracas."""
    data = f"team_id={LEONES_TEAM_ID}".encode("utf-8")
    req = urllib.request.Request(
        LVBP_ROSTER_VIEW_URL,
        data=data,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Accept": "text/html, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", "ignore")


def parse_pdf_and_date(soup: BeautifulSoup):
    """Extrae el enlace del PDF y la fecha oficial del boletín."""
    pdf_url = None
    official_date = None

    week_pane = soup.find("div", {"id": "week-tab-pane"})
    if week_pane:
        pdf_link = week_pane.find("a", href=re.compile(r"Leones_.*\.pdf"))
        if pdf_link:
            pdf_url = pdf_link["href"]

        date_tag = week_pane.find("strong")
        if date_tag:
            official_date = date_tag.get_text(strip=True)

    return pdf_url, official_date


def parse_players(soup: BeautifulSoup):
    """Parsea los peloteros de la sección roster-tab-pane usando BeautifulSoup."""
    players = []
    roster_pane = soup.find("div", {"id": "roster-tab-pane"})
    if not roster_pane:
        logger.warning("No se localizó 'roster-tab-pane'")
        return players

    # Mapeo de categorías posicionales
    category_map = {
        "pitchers": ("P", "pitcher"),
        "catchers": ("C", "catcher"),
        "infield": ("IF", "infielder"),
        "infielders": ("IF", "infielder"),
        "outfield": ("OF", "outfielder"),
        "outfielders": ("OF", "outfielder"),
    }

    current_pos_code = "P"
    current_category = "pitcher"

    for child in roster_pane.children:
        # Detectar encabezados de categoría
        text = child.get_text(strip=True).lower() if hasattr(child, "get_text") else ""
        for cat_key, (pos_code, pos_cat) in category_map.items():
            if cat_key in text:
                current_pos_code = pos_code
                current_category = pos_cat

        # Procesar tablas
        if child.name == "table":
            tbody = child.find("tbody")
            if not tbody:
                continue

            for row in tbody.find_all("tr"):
                cols = row.find_all("td")
                if len(cols) < 8:
                    continue

                try:
                    num_text = cols[0].get_text(strip=True)
                    num = int(num_text) if num_text.isdigit() else 0

                    img_tag = cols[1].find("img")
                    photo_url = img_tag["src"] if img_tag and "src" in img_tag.attrs else ""

                    link_tag = cols[2].find("a")
                    name = link_tag.get_text(strip=True) if link_tag else cols[2].get_text(strip=True)
                    player_id = 0
                    if link_tag and "href" in link_tag.attrs:
                        id_match = re.search(r"player_id=(\d+)", link_tag["href"])
                        if id_match:
                            player_id = int(id_match.group(1))

                    bats_throws = cols[3].get_text(strip=True)
                    height = cols[4].get_text(strip=True)
                    weight = cols[5].get_text(strip=True)
                    age_text = cols[6].get_text(strip=True)
                    age = int(age_text) if age_text.isdigit() else 0
                    birth_place = cols[7].get_text(strip=True)

                    is_venezuelan = any(
                        v in birth_place.lower()
                        for v in [
                            "venezuela", "ven", "caracas", "maracay", "valencia",
                            "zulia", "monagas", "aragua", "miranda", "anzoategui",
                            "bolivar", "falcon", "lara", "tachira", "merida", "sucre"
                        ]
                    )
                    origin = "criollo" if is_venezuelan else "importado"

                    players.append({
                        "number": num,
                        "name": name,
                        "position": current_pos_code,
                        "positionCategory": current_category,
                        "batsThrows": bats_throws,
                        "height": f"{height} m" if not height.endswith("m") else height,
                        "weight": f"{weight} kg" if not weight.endswith("kg") else weight,
                        "age": age,
                        "birthDate": "",
                        "birthPlace": birth_place,
                        "level": "LVBP",
                        "origin": origin,
                        "mlbId": player_id,
                        "isWeeklyActive": True,
                        "photoUrl": photo_url,
                    })
                except Exception as row_err:
                    logger.debug(f"Error procesando fila: {row_err}")

    return players


def download_pdf(pdf_url: str, target_filename: str):
    """Descarga el nuevo archivo PDF oficial en public/documents."""
    os.makedirs(DOCUMENTS_DIR, exist_ok=True)
    target_path = os.path.join(DOCUMENTS_DIR, target_filename)
    
    logger.info(f"Descargando nuevo PDF oficial desde {pdf_url} hacia {target_path}...")
    req = urllib.request.Request(
        pdf_url,
        headers={"User-Agent": "Mozilla/5.0"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp, open(target_path, "wb") as f:
        f.write(resp.read())
    logger.info(f"Descarga completada: {target_filename} ({os.path.getsize(target_path)} bytes)")


def main():
    logger.info("=== Iniciando Verificación Semanal de Roster de Leones del Caracas ===")
    os.makedirs(DATA_DIR, exist_ok=True)

    previous_snapshot = {}
    if os.path.exists(SNAPSHOT_FILE):
        try:
            with open(SNAPSHOT_FILE, "r", encoding="utf-8") as f:
                previous_snapshot = json.load(f)
        except Exception as e:
            logger.warning(f"No se pudo leer snapshot anterior: {e}")

    prev_date = previous_snapshot.get("meta", {}).get("officialDate", "")
    prev_players = {p["name"]: p for p in previous_snapshot.get("players", [])}

    try:
        html = fetch_leones_roster_html()
    except Exception as e:
        logger.error(f"Error al consultar stats.lvbp.com: {e}")
        sys.exit(1)

    soup = BeautifulSoup(html, "html.parser")
    pdf_url, official_date = parse_pdf_and_date(soup)
    logger.info(f"Fecha detectada en LVBP: {official_date} | PDF URL: {pdf_url}")

    if not official_date or not pdf_url:
        logger.warning("No se localizó enlace de PDF o fecha en la respuesta.")
        sys.exit(0)

    pdf_filename = os.path.basename(pdf_url)

    # Descargar PDF siempre para garantizar su disponibilidad local
    target_pdf_path = os.path.join(DOCUMENTS_DIR, pdf_filename)
    if not os.path.exists(target_pdf_path):
        try:
            download_pdf(pdf_url, pdf_filename)
        except Exception as e:
            logger.error(f"Error al descargar el PDF: {e}")

    # Parsear jugadores
    new_players = parse_players(soup)
    logger.info(f"Total jugadores extraídos: {len(new_players)}")

    # Calcular Altas (ENTRAN) y Bajas (SALEN)
    current_names = {p["name"] for p in new_players}
    prev_names = set(prev_players.keys())

    entran = sorted(list(current_names - prev_names)) if prev_names else []
    salen = sorted(list(prev_names - current_names)) if prev_names else []

    # Actualizar snapshot
    new_snapshot = {
        "meta": {
            "officialDate": official_date,
            "pdfUrl": f"/documents/{pdf_filename}",
            "remotePdfUrl": pdf_url,
            "maxLimit": 34,
            "totalActive": len(new_players),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "source": "Liga Venezolana de Béisbol Profesional (LVBP) · TuJonron.com",
            "movements": {
                "entran": entran,
                "salen": salen,
            },
        },
        "players": new_players,
    }

    with open(SNAPSHOT_FILE, "w", encoding="utf-8") as f:
        json.dump(new_snapshot, f, ensure_ascii=False, indent=2)

    logger.info(f"Snapshot semanal guardado exitosamente en {SNAPSHOT_FILE} con {len(new_players)} peloteros.")


if __name__ == "__main__":
    main()
