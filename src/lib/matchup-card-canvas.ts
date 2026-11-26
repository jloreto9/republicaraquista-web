import {
  MatchupCardData,
  MatchupCardPlayerMeta,
  MatchupCardRow,
} from "@/types/matchup";
import { getMlbFallbackHeadshotUrl } from "@/lib/constants";
import { hasLocalPlayerPhoto } from "@/lib/player-photos-data";

/**
 * Motor Gráfico Editorial para Tarjeta Comparativa H2H (Matchup 360 • LVBP).
 * Diseño claro de alta legibilidad con renderizado Retina 2x (ancho lógico 1080 px).
 */

export const MATCHUP_CARD_WIDTH = 1080;

const OUTER_PAD = 24;
const HEADER_HEIGHT = 396;
const SECTION_HEADER_HEIGHT = 50;
const ROW_HEIGHT = 52;
const FOOTER_HEIGHT = 72;

const PORTRAIT_W = 216;
const PORTRAIT_H = 268;
const TEAM_LOGO_SIZE = 22;
const BRAND_LOGO_MAX_SIZE = 116;

const FONT_STACK =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function isSameOriginUrl(url: string): boolean {
  return (
    url.startsWith("/") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  );
}

async function tryLoadImage(
  url: string,
  useCors: boolean
): Promise<HTMLImageElement | null> {
  if (!url || typeof window === "undefined") return null;
  return new Promise((resolve) => {
    const img = new window.Image();
    if (useCors) {
      img.crossOrigin = "anonymous";
    }
    const timer = window.setTimeout(() => resolve(null), 6500);
    img.onload = () => {
      window.clearTimeout(timer);
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve(img);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Cargador de retrato en 3 niveles CORS-safe para evitar SecurityError en canvas.toBlob():
 * 1) Asset local mismo origen (/assets/players/{id}.png)
 * 2) headshot primaria con crossOrigin="anonymous" si es externa
 * 3) Fallback oficial Cloudinary MLB con crossOrigin="anonymous"
 */
async function loadCorsSafePlayerHeadshot(
  player: MatchupCardPlayerMeta
): Promise<HTMLImageElement | null> {
  const candidates: Array<{ url: string; cors: boolean }> = [];

  if (hasLocalPlayerPhoto(player.playerId)) {
    candidates.push({
      url: `/assets/players/${player.playerId}.png`,
      cors: false,
    });
  }

  if (player.headshot) {
    const sameOrigin = isSameOriginUrl(player.headshot);
    if (!candidates.some((c) => c.url === player.headshot)) {
      candidates.push({ url: player.headshot, cors: !sameOrigin });
    }
  }

  const mlbUrl = getMlbFallbackHeadshotUrl(player.playerId);
  if (mlbUrl && !candidates.some((c) => c.url === mlbUrl)) {
    candidates.push({ url: mlbUrl, cors: true });
  }

  for (const cand of candidates) {
    const loaded = await tryLoadImage(cand.url, cand.cors);
    if (loaded) return loaded;
  }

  return null;
}

async function loadCorsSafeAsset(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return tryLoadImage(url, !isSameOriginUrl(url));
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawPlayerFallbackPortrait(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  player: MatchupCardPlayerMeta
): void {
  const initials = player.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const cx = x + w / 2;
  const cy = y + h / 2 - 10;

  ctx.fillStyle = "#CBD5E1";
  ctx.beginPath();
  ctx.arc(cx, cy, 46, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1E293B";
  ctx.font = `800 32px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials || "LV", cx, cy);

  ctx.fillStyle = "#64748B";
  ctx.font = `700 13px ${FONT_STACK}`;
  ctx.fillText(player.teamAbbr || "LVBP", cx, y + h - 34);
}

function drawTeamBadgeFallback(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  teamAbbr: string
): void {
  const r = size / 2;
  ctx.fillStyle = "#0F172A";
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 8px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((teamAbbr || "LV").slice(0, 3), x + r, y + r);
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  sizes: number[],
  weight: number
): number {
  for (const size of sizes) {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    if (ctx.measureText(text).width <= maxWidth) {
      return size;
    }
  }
  return sizes[sizes.length - 1];
}

function drawPlayerHeaderColumn(
  ctx: CanvasRenderingContext2D,
  colX: number,
  colW: number,
  headerY: number,
  player: MatchupCardPlayerMeta,
  portraitImg: HTMLImageElement | null,
  teamLogoImg: HTMLImageElement | null
): void {
  const centerX = colX + colW / 2;
  const portraitX = Math.round(centerX - PORTRAIT_W / 2);
  const portraitY = headerY + 22;

  // Fondo del retrato
  ctx.fillStyle = "#E2E8F0";
  ctx.fillRect(portraitX, portraitY, PORTRAIT_W, PORTRAIT_H);

  if (portraitImg) {
    const imgW = portraitImg.naturalWidth || portraitImg.width || 1;
    const imgH = portraitImg.naturalHeight || portraitImg.height || 1;
    // Recorte cover alineado arriba (top-center) para preservar cabeza y gorra
    const scale = Math.max(PORTRAIT_W / imgW, PORTRAIT_H / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = portraitX + (PORTRAIT_W - drawW) / 2;
    const drawY = portraitY;

    ctx.save();
    ctx.beginPath();
    ctx.rect(portraitX, portraitY, PORTRAIT_W, PORTRAIT_H);
    ctx.clip();
    ctx.drawImage(portraitImg, drawX, drawY, drawW, drawH);
    ctx.restore();
  } else {
    drawPlayerFallbackPortrait(
      ctx,
      portraitX,
      portraitY,
      PORTRAIT_W,
      PORTRAIT_H,
      player
    );
  }

  // Borde del marco del retrato
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(portraitX, portraitY, PORTRAIT_W, PORTRAIT_H);

  // Nombre del jugador en azul editorial con subrayado sutil
  const maxNameW = colW - 28;
  const nameSize = fitFontSize(ctx, player.name, maxNameW, [24, 22, 20, 18, 16], 700);
  const nameY = portraitY + PORTRAIT_H + 34;

  ctx.fillStyle = "#1D4ED8";
  ctx.font = `700 ${nameSize}px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(player.name, centerX, nameY, maxNameW);

  const measuredNameW = Math.min(ctx.measureText(player.name).width, maxNameW);
  const underlineY = nameY + Math.round(nameSize * 0.56);
  ctx.beginPath();
  ctx.moveTo(centerX - measuredNameW / 2, underlineY);
  ctx.lineTo(centerX + measuredNameW / 2, underlineY);
  ctx.strokeStyle = "rgba(29, 78, 216, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Línea secundaria: escudo + equipo · temporada · fase
  const metaText = `${player.teamAbbr} · ${player.seasonLabel} · ${player.phaseLabel}`;
  const gap = 7;
  const maxMetaTextW = colW - 28 - TEAM_LOGO_SIZE - gap;
  const metaSize = fitFontSize(ctx, metaText, maxMetaTextW, [14, 13, 12], 600);

  ctx.font = `600 ${metaSize}px ${FONT_STACK}`;
  const textW = Math.min(ctx.measureText(metaText).width, maxMetaTextW);
  const combinedW = TEAM_LOGO_SIZE + gap + textW;
  const startX = centerX - combinedW / 2;
  const metaCenterY = nameY + 38;

  if (teamLogoImg) {
    const lW = teamLogoImg.naturalWidth || teamLogoImg.width || 1;
    const lH = teamLogoImg.naturalHeight || teamLogoImg.height || 1;
    const lScale = Math.min(TEAM_LOGO_SIZE / lW, TEAM_LOGO_SIZE / lH);
    const dw = lW * lScale;
    const dh = lH * lScale;
    ctx.drawImage(
      teamLogoImg,
      startX + (TEAM_LOGO_SIZE - dw) / 2,
      metaCenterY - dh / 2,
      dw,
      dh
    );
  } else {
    drawTeamBadgeFallback(
      ctx,
      startX,
      metaCenterY - TEAM_LOGO_SIZE / 2,
      TEAM_LOGO_SIZE,
      player.teamAbbr
    );
  }

  ctx.fillStyle = "#475569";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(metaText, startX + TEAM_LOGO_SIZE + gap, metaCenterY, maxMetaTextW);
}

function drawCenterHeaderColumn(
  ctx: CanvasRenderingContext2D,
  colX: number,
  colW: number,
  headerY: number,
  compareType: MatchupCardData["compareType"],
  brandLogoImg: HTMLImageElement | null
): void {
  const centerX = colX + colW / 2;
  const logoTopY = headerY + 62;

  if (brandLogoImg) {
    const imgW = brandLogoImg.naturalWidth || brandLogoImg.width || 1;
    const imgH = brandLogoImg.naturalHeight || brandLogoImg.height || 1;
    const scale = Math.min(
      BRAND_LOGO_MAX_SIZE / imgW,
      BRAND_LOGO_MAX_SIZE / imgH
    );
    const dw = imgW * scale;
    const dh = imgH * scale;
    ctx.drawImage(
      brandLogoImg,
      centerX - dw / 2,
      logoTopY + (BRAND_LOGO_MAX_SIZE - dh) / 2,
      dw,
      dh
    );
  } else {
    ctx.fillStyle = "#0F172A";
    ctx.beginPath();
    ctx.arc(
      centerX,
      logoTopY + BRAND_LOGO_MAX_SIZE / 2,
      BRAND_LOGO_MAX_SIZE / 2 - 4,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 28px ${FONT_STACK}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("RC", centerX, logoTopY + BRAND_LOGO_MAX_SIZE / 2);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#0F172A";
  ctx.font = `800 20px ${FONT_STACK}`;
  ctx.fillText("REPÚBLICA CARAQUISTA", centerX, headerY + 214, colW - 20);

  ctx.fillStyle = "#64748B";
  ctx.font = `700 14px ${FONT_STACK}`;
  ctx.fillText("MATCHUP 360 • LVBP", centerX, headerY + 244, colW - 20);

  // Badge pill compacto con el tipo de comparación
  const badgeText = compareType === "Bateadores" ? "BATEADORES" : "LANZADORES";
  ctx.font = `800 13px ${FONT_STACK}`;
  const pillW = Math.max(138, ctx.measureText(badgeText).width + 36);
  const pillH = 34;
  const pillX = centerX - pillW / 2;
  const pillY = headerY + 274;

  ctx.fillStyle = "#0F172A";
  drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(badgeText, centerX, pillY + pillH / 2 + 0.5);
}

function drawSectionHeader(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  title: string
): void {
  ctx.fillStyle = "#F1F5F9";
  ctx.fillRect(x, y, w, SECTION_HEADER_HEIGHT);

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.moveTo(x, y + SECTION_HEADER_HEIGHT);
  ctx.lineTo(x + w, y + SECTION_HEADER_HEIGHT);
  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#991B1B";
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, x + w / 2, y + SECTION_HEADER_HEIGHT / 2, w - 32);
}

function drawMetricRow(
  ctx: CanvasRenderingContext2D,
  tableX: number,
  y: number,
  leftW: number,
  centerW: number,
  rightW: number,
  row: MatchupCardRow
): void {
  const col1End = tableX + leftW;
  const col2End = col1End + centerW;
  const tableW = leftW + centerW + rightW;
  const midY = y + ROW_HEIGHT / 2;

  // Celda izquierda (player1)
  ctx.fillStyle = row.winner === "p1" ? "#E6F4EA" : "#FFFFFF";
  ctx.fillRect(tableX, y, leftW, ROW_HEIGHT);

  // Celda central (etiqueta)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(col1End, y, centerW, ROW_HEIGHT);

  // Celda derecha (player2)
  ctx.fillStyle = row.winner === "p2" ? "#E6F4EA" : "#FFFFFF";
  ctx.fillRect(col2End, y, rightW, ROW_HEIGHT);

  // Divisores de celda
  ctx.beginPath();
  ctx.moveTo(tableX, y + ROW_HEIGHT);
  ctx.lineTo(tableX + tableW, y + ROW_HEIGHT);
  ctx.moveTo(col1End, y);
  ctx.lineTo(col1End, y + ROW_HEIGHT);
  ctx.moveTo(col2End, y);
  ctx.lineTo(col2End, y + ROW_HEIGHT);
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Valor 1
  const p1Won = row.winner === "p1";
  ctx.fillStyle = p1Won ? "#0F172A" : "#334155";
  ctx.font = `${p1Won ? 700 : 400} 22px ${FONT_STACK}`;
  ctx.fillText(row.val1, tableX + leftW / 2, midY, leftW - 24);

  // Etiqueta central
  ctx.fillStyle = "#0F172A";
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillText(row.label, col1End + centerW / 2, midY, centerW - 20);

  // Valor 2
  const p2Won = row.winner === "p2";
  ctx.fillStyle = p2Won ? "#0F172A" : "#334155";
  ctx.font = `${p2Won ? 700 : 400} 22px ${FONT_STACK}`;
  ctx.fillText(row.val2, col2End + rightW / 2, midY, rightW - 24);
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  tableX: number,
  y: number,
  tableW: number,
  data: MatchupCardData
): void {
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(tableX, y, tableW, FOOTER_HEIGHT);

  ctx.beginPath();
  ctx.moveTo(tableX, y);
  ctx.lineTo(tableX + tableW, y);
  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const midY = y + FOOTER_HEIGHT / 2;
  ctx.textBaseline = "middle";

  const tiesSuffix = data.ties > 0 ? ` (${data.ties} emp.)` : "";
  const balanceText = `Balance: ${data.p1Wins} – ${data.p2Wins}${tiesSuffix}`;

  ctx.fillStyle = "#0F172A";
  ctx.font = `700 16px ${FONT_STACK}`;
  ctx.textAlign = "left";
  ctx.fillText(balanceText, tableX + 22, midY, tableW * 0.34);

  ctx.fillStyle = "#475569";
  ctx.font = `600 15px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.fillText(
    data.footerNote || "100 = Promedio LVBP",
    tableX + tableW / 2,
    midY,
    tableW * 0.32
  );

  ctx.fillStyle = "#64748B";
  ctx.font = `700 15px ${FONT_STACK}`;
  ctx.textAlign = "right";
  ctx.fillText("@RepubCaraquista · LVBP", tableX + tableW - 22, midY, tableW * 0.3);
}

export function computeMatchupCardHeight(data: MatchupCardData): number {
  const sectionsHeight = data.sections.reduce(
    (sum, section) =>
      sum + SECTION_HEADER_HEIGHT + section.rows.length * ROW_HEIGHT,
    0
  );
  return OUTER_PAD * 2 + HEADER_HEIGHT + sectionsHeight + FOOTER_HEIGHT;
}

export async function renderMatchupCardToCanvas(
  canvas: HTMLCanvasElement,
  data: MatchupCardData
): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const totalHeight = computeMatchupCardHeight(data);
  canvas.width = MATCHUP_CARD_WIDTH * 2;
  canvas.height = totalHeight * 2;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(2, 0, 0, 2, 0, 0);

  // Asegurar fuentes web cargadas si el navegador soporta Font Loading API
  try {
    if ("fonts" in document) {
      await document.fonts.ready;
    }
  } catch {
    // Continuar con fuentes de respaldo del sistema
  }

  // Cargar imágenes en paralelo con patrón CORS-safe de 3 niveles
  const [p1Portrait, p2Portrait, p1Logo, p2Logo, brandLogo] =
    await Promise.all([
      loadCorsSafePlayerHeadshot(data.player1),
      loadCorsSafePlayerHeadshot(data.player2),
      loadCorsSafeAsset(data.player1.teamLogo),
      loadCorsSafeAsset(data.player2.teamLogo),
      loadCorsSafeAsset("/assets/logo.png"),
    ]);

  // 1. Fondo blanco puro
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, MATCHUP_CARD_WIDTH, totalHeight);

  const tableX = OUTER_PAD;
  const tableY = OUTER_PAD;
  const tableW = MATCHUP_CARD_WIDTH - OUTER_PAD * 2;
  const tableH = totalHeight - OUTER_PAD * 2;

  const leftW = Math.round(tableW * 0.35);
  const centerW = Math.round(tableW * 0.3);
  const rightW = tableW - leftW - centerW;
  const col1End = tableX + leftW;
  const col2End = col1End + centerW;

  // 2. Cabecera de 3 columnas (35% | 30% | 35%)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(tableX, tableY, tableW, HEADER_HEIGHT);

  drawPlayerHeaderColumn(
    ctx,
    tableX,
    leftW,
    tableY,
    data.player1,
    p1Portrait,
    p1Logo
  );

  drawCenterHeaderColumn(
    ctx,
    col1End,
    centerW,
    tableY,
    data.compareType,
    brandLogo
  );

  drawPlayerHeaderColumn(
    ctx,
    col2End,
    rightW,
    tableY,
    data.player2,
    p2Portrait,
    p2Logo
  );

  // Separadores verticales de la cabecera
  ctx.beginPath();
  ctx.moveTo(col1End, tableY);
  ctx.lineTo(col1End, tableY + HEADER_HEIGHT);
  ctx.moveTo(col2End, tableY);
  ctx.lineTo(col2End, tableY + HEADER_HEIGHT);
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 3. Bloques y filas de estadísticas
  let cursorY = tableY + HEADER_HEIGHT;

  for (const section of data.sections) {
    drawSectionHeader(ctx, tableX, cursorY, tableW, section.title);
    cursorY += SECTION_HEADER_HEIGHT;

    for (const row of section.rows) {
      drawMetricRow(ctx, tableX, cursorY, leftW, centerW, rightW, row);
      cursorY += ROW_HEIGHT;
    }
  }

  // 4. Pie editorial
  drawFooter(ctx, tableX, cursorY, tableW, data);

  // 5. Marco exterior rectangular de toda la tabla
  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 2;
  ctx.strokeRect(tableX, tableY, tableW, tableH);
}

export async function generateMatchupCardBlob(
  data: MatchupCardData
): Promise<Blob | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  await renderMatchupCardToCanvas(canvas, data);

  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch (err) {
      console.error("Error exportando tarjeta Matchup PNG:", err);
      resolve(null);
    }
  });
}
