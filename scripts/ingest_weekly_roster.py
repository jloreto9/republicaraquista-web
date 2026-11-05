#!/usr/bin/env python3
"""
Ingesta y Sincronización Automática del Roster Semanal de Leones del Caracas
=============================================================================
Consulta stats.lvbp.com para detectar publicaciones de nuevos boletines semanales
de 34 jugadores de Leones del Caracas (LVBP 2026-2027).

Operaciones:
1. Consulta POST a https://stats.lvbp.com/resources/views/roster.php con team_id=695.
2. Extrae todos los boletines de week-tab-pane y los procesa en orden cronológico.
3. Para cada boletín:
   - Descarga el nuevo archivo PDF a `public/documents/Leones_YYYYMMDD.pdf` si no existe.
   - Extrae con alta precisión la nómina oficial (34 peloteros) directamente del PDF firmado.
   - Compara contra la semana previa y calcula altas (ENTRAN) y bajas (SALEN).
4. Genera `public/data/roster_latest.json` con la semana actual activa y el historial completo.

Autor: @republicaraquista • Jorge Leonardo Loreto
"""

import os
import sys
import re
import json
import glob
import logging
from datetime import datetime, timedelta, timezone
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

# Diccionario maestro de mapeo de IDs de MLB para headshots de Leones
KNOWN_MLB_IDS = {
    "adbert alzolay": 640470,
    "wilmer font": 521655,
    "jesús vargas": 672842,
    "jesus vargas": 672842,
    "simón leandro": 814129,
    "simon leandro": 814129,
    "joan gonzalez": 802993,
    "joan gonzález": 802993,
    "eduardo figueroa": 543163,
    "wikelman gonzalez": 678824,
    "wikelman gonzález": 678824,
    "leandro cedeno": 660681,
    "leandro cedeño": 660681,
    "victor bericoto": 682674,
    "víctor bericoto": 682674,
    "aldrem corredor": 625506,
    "marvin alcantara": 800421,
    "marvin alcántara": 800421,
    "yoimer camacho": 542467,
    "melvin pineda": 687849,
    "luarbert arias": 678215,
    "wilkel hernandez": 678869,
    "wilkel hernández": 678869,
    "ricardo rodriguez": 600965,
    "ricardo rodríguez": 600965,
    "steven perez": 800408,
    "steven pérez": 800408,
    "jhonny pereda": 640902,
    "carlos romero": 673395,
    "mikell manzano": 692350,
    "gabriel lino": 593449,
    "touki toussaint": 657053,
    "connor van scoyoc": 681854,
    "dale stanavich": 689359,
    "erick leal": 612797,
    "juan sánchez": 678738,
    "juan sanchez": 678738,
    "julio rodríguez": 680588,
    "julio rodriguez": 680588,
    "luis curvelo": 681168,
    "luis palacios": 672712,
    "nic swanson": 702462,
    "norwith gudiño": 660508,
    "norwith gudino": 660508,
    "livan soto": 670869,
    "wilfredo tovar": 541600,
    "lenyn sosa": 672820,
    "josé rondón": 602922,
    "jose rondon": 602922,
    "brainer bonaci": 682900,
    "wuilfredo antunez": 686404,
    "ricardo cova": 699698,
    "gabriel noriega": 571997,
    "kenedy corona": 685744,
}

CANONICAL_NAMES = {
    "simon leandro": "Simón Leandro",
    "jesus vargas": "Jesús Vargas",
    "joan gonzalez": "Joan González",
    "wikelman gonzalez": "Wikelman González",
    "leandro cedeno": "Leandro Cedeño",
    "victor bericoto": "Víctor Bericoto",
    "marvin alcantara": "Marvin Alcántara",
    "wilkel hernandez": "Wilkel Hernández",
    "ricardo rodriguez": "Ricardo Rodríguez",
    "steven perez": "Steven Pérez",
    "julio rodriguez": "Julio Rodríguez",
    "norwith gudino": "Norwith Gudiño",
    "jose rondon": "José Rondón",
    "wuilfredo antunez": "Wuilfredo Antúnez",
}


def calculate_week_and_range(date_str: str, filename: str):
    """Calcula dinámicamente el número de semana LVBP y su rango de fechas."""
    m = re.search(r"(\d{4})(\d{2})(\d{2})", filename)
    if m:
        dt = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    else:
        try:
            dt = datetime.strptime(date_str, "%d/%m/%Y")
        except Exception:
            dt = datetime.now()

    start_season = datetime(2026, 10, 13)
    days = (dt - start_season).days
    week_num = max(1, (days // 7) + 1)
    end_dt = dt + timedelta(days=6)
    months = {
        1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
        7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic"
    }
    range_str = f"{dt.day:02d} {months[dt.month]} - {end_dt.day:02d} {months[end_dt.month]} {end_dt.year}"
    return week_num, range_str


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


def parse_all_bulletins(soup: BeautifulSoup):
    """Extrae todos los boletines de week-tab-pane ordenados cronológicamente."""
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
    return bulletins


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
            norm_key = clean_name.lower()
            if norm_key in CANONICAL_NAMES:
                clean_name = CANONICAL_NAMES[norm_key]

            # Buscar en jugadores previos
            matched_prev = None
            for p_name, p_data in prev_players_dict.items():
                if p_name.lower() in clean_name.lower() or clean_name.lower() in p_name.lower():
                    matched_prev = p_data
                    break

            mlb_id = KNOWN_MLB_IDS.get(clean_name.lower(), 0)
            if not mlb_id and matched_prev:
                mlb_id = matched_prev.get("mlbId", 0)

            photo_url = f"/assets/players/{mlb_id}.png" if mlb_id else (matched_prev.get("photoUrl", "") if matched_prev else "")

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

    logger.info(f"Jugadores extraídos directamente del PDF ({os.path.basename(pdf_path)}): {len(players)}")
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
    os.makedirs(DOCUMENTS_DIR, exist_ok=True)

    bulletins = []
    try:
        html = fetch_leones_roster_html()
        soup = BeautifulSoup(html, "html.parser")
        bulletins = parse_all_bulletins(soup)
        logger.info(f"Boletines remotos detectados en LVBP: {len(bulletins)}")
    except Exception as e:
        logger.warning(f"No se pudo consultar stats.lvbp.com: {e}. Usando PDFs locales...")

    # Si la red falló o hay PDFs locales, asegurar que todos los archivos locales estén incluidos
    local_pdfs = sorted(glob.glob(os.path.join(DOCUMENTS_DIR, "Leones_*.pdf")))
    known_keys = {b["date_key"] for b in bulletins}
    for lp in local_pdfs:
        bn = os.path.basename(lp)
        m = re.search(r"Leones_(\d{8})\.pdf", bn)
        if m and m.group(1) not in known_keys:
            dk = m.group(1)
            # Reconstruir fecha formato DD/MM/YYYY
            ds = f"{dk[6:8]}/{dk[4:6]}/{dk[0:4]}"
            bulletins.append({
                "url": f"/documents/{bn}",
                "date": ds,
                "date_key": dk
            })
            known_keys.add(dk)

    bulletins.sort(key=lambda b: b["date_key"])

    if not bulletins:
        logger.error("No se encontraron boletines ni locales ni remotos.")
        sys.exit(1)

    # Procesar secuencialmente cada boletín para construir el historial completo y movimientos
    weeks_history = []
    prev_players_dict = {}

    for idx, b in enumerate(bulletins):
        clean_url = b["url"].split("?")[0]
        pdf_filename = os.path.basename(clean_url)
        target_pdf_path = os.path.join(DOCUMENTS_DIR, pdf_filename)

        if not os.path.exists(target_pdf_path) and b["url"].startswith("http"):
            try:
                download_pdf(b["url"], pdf_filename)
            except Exception as dl_err:
                logger.error(f"Error descargando {b['url']}: {dl_err}")
                continue

        if not os.path.exists(target_pdf_path):
            continue

        players = parse_players_from_pdf(target_pdf_path, prev_players_dict)
        if len(players) < 25:
            logger.warning(f"No se pudieron extraer jugadores completos de {pdf_filename}")
            continue

        week_num, date_range = calculate_week_and_range(b["date"], pdf_filename)
        official_date = b["date"] or f"{pdf_filename[12:14]}/{pdf_filename[10:12]}/{pdf_filename[6:10]}"

        # Calcular altas y bajas respecto a la semana anterior
        curr_names = {p["name"] for p in players}
        if prev_players_dict:
            prev_names = set(prev_players_dict.keys())
            entran = sorted(list(curr_names - prev_names))
            salen = sorted(list(prev_names - curr_names))
        else:
            entran = []
            salen = []

        week_obj = {
            "weekNumber": week_num,
            "season": "2026-2027",
            "dateRange": date_range,
            "officialDate": official_date,
            "pdfUrl": f"/documents/{pdf_filename}",
            "remotePdfUrl": b["url"],
            "maxLimit": 34,
            "totalActive": len(players),
            "movements": {
                "entran": entran,
                "salen": salen,
            },
            "players": players,
        }

        weeks_history.append(week_obj)
        prev_players_dict = {p["name"]: p for p in players}

    if not weeks_history:
        logger.error("No se pudo procesar ninguna semana válida.")
        sys.exit(1)

    # La semana más reciente es la última procesada
    latest_week = weeks_history[-1]

    # Ordenar historial de más reciente a más antiguo para el selector de UI
    weeks_reversed = list(reversed(weeks_history))

    snapshot = {
        "meta": {
            "officialDate": latest_week["officialDate"],
            "pdfUrl": latest_week["pdfUrl"],
            "remotePdfUrl": latest_week["remotePdfUrl"],
            "maxLimit": latest_week["maxLimit"],
            "totalActive": latest_week["totalActive"],
            "weekNumber": latest_week["weekNumber"],
            "dateRange": latest_week["dateRange"],
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "source": "Liga Venezolana de Béisbol Profesional (LVBP) · TuJonron.com",
            "movements": latest_week["movements"],
        },
        "players": latest_week["players"],
        "weeks": weeks_reversed,
    }

    with open(SNAPSHOT_FILE, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

    logger.info(
        f"✅ Snapshot actualizado exitosamente en {SNAPSHOT_FILE} con {len(weeks_history)} semanas registradas. "
        f"Semana activa: Semana {latest_week['weekNumber']} ({latest_week['dateRange']}) con {len(latest_week['players'])} jugadores."
    )


if __name__ == "__main__":
    main()
