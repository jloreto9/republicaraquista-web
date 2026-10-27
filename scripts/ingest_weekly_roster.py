#!/usr/bin/env python3
"""
Ingesta y Sincronización Automática del Roster Semanal de Leones del Caracas
=============================================================================
Consulta stats.lvbp.com para detectar publicaciones de nuevos boletines semanales
de 34 jugadores de Leones del Caracas (LVBP 2026-2027).

Operaciones:
1. Consulta POST a https://stats.lvbp.com/resources/views/roster.php con team_id=695.
2. Extrae todos los boletines de week-tab-pane y selecciona el más reciente por fecha.
3. Si detecta un nuevo boletín oficial o variación en la plantilla:
   - Descarga el nuevo archivo PDF a `public/documents/Leones_YYYYMMDD.pdf`.
   - Extrae con alta precisión la nómina oficial (34 peloteros) directamente del PDF firmado.
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
    """Extrae todos los boletines de week-tab-pane y devuelve el más reciente ordenado por fecha."""
    bulletins = []
    week_pane = soup.find("div", {"id": "week-tab-pane"})
    if week_pane:
        for link in week_pane.find_all("a", href=re.compile(r"Leones_.*\.pdf")):
            href = link.get("href")
            parent = link.find_parent("div")
            date_str = ""
            if parent:
                date_tag = parent.find("strong")
                if date_tag:
                    date_str = date_tag.get_text(strip=True)
            m = re.search(r"Leones_(\d{8})\.pdf", href)
            date_key = m.group(1) if m else ""
            bulletins.append({"url": href, "date": date_str, "date_key": date_key})

    bulletins.sort(key=lambda b: b["date_key"])
    if not bulletins:
        return None, None
    latest = bulletins[-1]
    return latest["url"], latest["date"]


def parse_players_from_pdf(pdf_path: str, prev_players_dict: dict) -> list:
    """Extrae con alta fidelidad la nómina oficial de 34 peloteros desde el PDF firmado."""
    try:
        import pypdf
    except ImportError:
        logger.warning("pypdf no instalado. No se puede parsear directamente el PDF.")
        return []

    try:
        reader = pypdf.PdfReader(pdf_path)
    except Exception as e:
        logger.error(f"Error al abrir PDF con pypdf: {e}")
        return []

    full_text = ""
    for page in reader.pages:
        full_text += page.extract_text() + "\n"

    category_headers = {
        "lanzadores": ("P", "pitcher"),
        "catchers": ("C", "catcher"),
        "receptores": ("C", "catcher"),
        "infielders": ("IF", "infielder"),
        "outfielders": ("OF", "outfielder"),
        "jardineros": ("OF", "outfielder"),
    }

    current_pos = "P"
    current_cat = "pitcher"

    cleaned_lines = []
    for raw_l in full_text.split("\n"):
        l = raw_l.strip()
        if not l:
            continue
        if re.match(r"^\d{1,2}\s+[A-Za-z\uFFFD]", l) or any(l.lower().startswith(k) for k in category_headers):
            cleaned_lines.append(l)
        elif cleaned_lines and not any(l.lower().startswith(x) for x in ["liga", "temporada", "roster", "leones", "# pelotero", "peso", "nacimiento", "powered", "peso en"]):
            cleaned_lines[-1] += " " + l

    known_mlb_ids = {
        "eduardo figueroa": 543163,
        "wikelman gonzalez": 678824,
        "wikelman gonzález": 678824,
        "leandro cedeno": 660681,
        "leandro cedeño": 660681,
        "victor bericoto": 682674,
        "víctor bericoto": 682674,
        "aldrem corredor": 625506,
        "marvin alcantara": 703417,
        "marvin alcántara": 703417,
    }

    players = []
    for line in cleaned_lines:
        lower_line = line.lower()
        for cat_key, (pos_code, pos_cat) in category_headers.items():
            if lower_line.startswith(cat_key):
                current_pos = pos_code
                current_cat = pos_cat
                break

        fixed_line = line.replace("\ufffd", "a")
        m = re.match(
            r"^(\d{1,2})\s+(.+?)(?:\s+\([A-Z0-9]+\))?\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+([A-Z]/[A-Z])\s+(\d+)\s+([\d\-]+)\s+(.*?)\s+(OTRO|MLB|AAA|AA|A\+|A|ROK|NINGUNO|IND\.\s*LEAGUE)\s+(CRIOLLO|IMPORTADO)",
            fixed_line,
            re.IGNORECASE,
        )
        if m:
            num = int(m.group(1))
            raw_name = m.group(2).strip()
            val1 = float(m.group(3))
            val2 = float(m.group(4))
            if val1 < 2.5:
                height_m, weight_kg = val1, val2
            elif val2 < 2.5:
                height_m, weight_kg = val2, val1
            elif val1 > val2:
                height_m, weight_kg = val1 / 100.0, val2
            else:
                height_m, weight_kg = val2 / 100.0, val1

            bats_throws = m.group(5).upper()
            age = int(m.group(6))
            birth_date = m.group(7)
            birth_place = m.group(8).strip()
            level = m.group(9).strip()
            origin = m.group(10).lower()

            clean_name = " ".join(word.capitalize() for word in raw_name.split())

            matched_prev = None
            for p_name, p_data in prev_players_dict.items():
                if p_name.lower() in clean_name.lower() or clean_name.lower() in p_name.lower() or (p_data.get("number") == num and num not in [0, None]):
                    matched_prev = p_data
                    clean_name = p_data["name"]
                    break

            mlb_id = matched_prev.get("mlbId", 0) if matched_prev else known_mlb_ids.get(clean_name.lower(), 0)
            photo_url = matched_prev.get("photoUrl", "") if matched_prev else (f"https://cdn.tujonron.net/public_photos/custom/{mlb_id}.png" if mlb_id else "")

            players.append({
                "number": num,
                "name": clean_name,
                "position": current_pos,
                "positionCategory": current_cat,
                "batsThrows": bats_throws,
                "height": f"{height_m:.2f} m",
                "weight": f"{int(weight_kg)} kg",
                "age": age,
                "birthDate": birth_date,
                "birthPlace": birth_place,
                "level": level,
                "origin": origin,
                "mlbId": mlb_id,
                "isWeeklyActive": True,
                "photoUrl": photo_url,
            })

    logger.info(f"Jugadores extraídos directamente del PDF: {len(players)}")
    return players


def parse_players(soup: BeautifulSoup):
    """Fallback: Parsea los peloteros de la sección roster-tab-pane usando BeautifulSoup."""
    players = []
    roster_pane = soup.find("div", {"id": "roster-tab-pane"})
    if not roster_pane:
        logger.warning("No se localizó 'roster-tab-pane'")
        return players

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
        text = child.get_text(strip=True).lower() if hasattr(child, "get_text") else ""
        for cat_key, (pos_code, pos_cat) in category_map.items():
            if cat_key in text:
                current_pos_code = pos_code
                current_category = pos_cat

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

    prev_meta = previous_snapshot.get("meta", {})
    prev_date = prev_meta.get("officialDate", "")
    prev_pdf = prev_meta.get("remotePdfUrl", "")
    prev_movements = prev_meta.get("movements", {"entran": [], "salen": []})
    prev_players = {p["name"]: p for p in previous_snapshot.get("players", [])}

    try:
        html = fetch_leones_roster_html()
    except Exception as e:
        logger.error(f"Error al consultar stats.lvbp.com: {e}")
        sys.exit(1)

    soup = BeautifulSoup(html, "html.parser")
    pdf_url, official_date = parse_pdf_and_date(soup)
    logger.info(f"Último boletín detectado en LVBP: {official_date} | PDF URL: {pdf_url}")

    if not official_date or not pdf_url:
        logger.warning("No se localizó enlace de PDF o fecha en la respuesta.")
        sys.exit(0)

    # Limpiar query string de URLs firmadas (ej: Leones_20261027.pdf?expires=... -> Leones_20261027.pdf)
    clean_url = pdf_url.split("?")[0]
    pdf_filename = os.path.basename(clean_url)

    # Descargar PDF siempre para garantizar su disponibilidad local si no existe
    target_pdf_path = os.path.join(DOCUMENTS_DIR, pdf_filename)
    if not os.path.exists(target_pdf_path):
        try:
            download_pdf(pdf_url, pdf_filename)
        except Exception as e:
            logger.error(f"Error al descargar el PDF: {e}")

    # Prioridad 1: Extraer la nómina oficial directamente del PDF firmado
    new_players = parse_players_from_pdf(target_pdf_path, prev_players)
    if len(new_players) < 25:
        logger.info("Fallback a tabla HTML de roster-tab-pane...")
        html_players = parse_players(soup)
        if len(html_players) > len(new_players):
            new_players = html_players

    logger.info(f"Total jugadores extraídos: {len(new_players)}")

    if not new_players:
        logger.warning("No se pudieron extraer jugadores del roster.")
        sys.exit(0)

    current_names = {p["name"] for p in new_players}
    prev_names = set(prev_players.keys())

    is_new_bulletin = bool((official_date and official_date != prev_date) or (pdf_url and pdf_url != prev_pdf))
    players_changed = bool(current_names != prev_names)

    # Si no hay nuevo boletín ni cambios en la nómina, mantener snapshot intacto
    if not is_new_bulletin and not players_changed and prev_players:
        logger.info("El boletín oficial y la plantilla no presentan cambios. Conservando snapshot y movimientos vigentes.")
        return

    # Si es nuevo boletín o cambiaron jugadores, calcular altas y bajas
    if is_new_bulletin or players_changed:
        entran = sorted(list(current_names - prev_names)) if prev_names else []
        salen = sorted(list(prev_names - current_names)) if prev_names else []
    else:
        entran = prev_movements.get("entran", [])
        salen = prev_movements.get("salen", [])

    # Calcular weekNumber y dateRange según fecha oficial
    week_number = 1
    date_range = "13 Oct - 19 Oct 2026"
    if "20/10" in official_date or "20261020" in pdf_filename:
        week_number = 2
        date_range = "20 Oct - 26 Oct 2026"
    elif "27/10" in official_date or "20261027" in pdf_filename:
        week_number = 3
        date_range = "27 Oct - 02 Nov 2026"

    # Actualizar snapshot
    new_snapshot = {
        "meta": {
            "officialDate": official_date,
            "pdfUrl": f"/documents/{pdf_filename}",
            "remotePdfUrl": pdf_url,
            "maxLimit": 34,
            "totalActive": len(new_players),
            "weekNumber": week_number,
            "dateRange": date_range,
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

    logger.info(f"Snapshot semanal guardado exitosamente en {SNAPSHOT_FILE} con {len(new_players)} peloteros. (+{len(entran)} altas / -{len(salen)} bajas)")


if __name__ == "__main__":
    main()
