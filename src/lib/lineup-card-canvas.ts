/**
 * Motor Gráfico HTML5 Canvas para la Tarjeta Oficial de Lineup (9:16 • 1080×1920 px).
 * Diseñado para renderizado en vivo sin parpadeos y exportación PNG de alta definición.
 */

export interface LineupCardSlotRender {
  order: number;
  position: string;
  playerName: string;
}

export interface LineupCardRenderData {
  opponentShort: string;
  slots: LineupCardSlotRender[];
  pitcherName: string;
  transmissionLine1: string;
  transmissionLine2: string;
  dateShort: string;
  timeCompact: string;
  stadiumName: string;
}

export const LINEUP_CARD_WIDTH = 1080;
export const LINEUP_CARD_HEIGHT = 1920;
export const SCALE = 1080 / 576; // 1.875
export const ROW_CYS = [278, 334, 389, 444, 503, 558, 613.5, 668.5, 724] as const;

export const DEFAULT_LINEUP_BG_SRC = "/assets/lineup-template-bg.jpg";

const PILL_FILL_COLOR = "rgba(116, 101, 61, 0.84)";
const HEADER_GOLD_COLOR = "#C59D4D";
const TEXT_WHITE = "#FFFFFF";

const DISPLAY_FONT_FALLBACK = '"Righteous", "Arial Black", sans-serif';
const BODY_FONT_FALLBACK = '"Jura", "Montserrat", "Inter", sans-serif';

function resolveFontFamily(cssVarName: string, fallback: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(cssVarName)
    .trim();
  return value ? `${value}, ${fallback}` : fallback;
}

async function ensureLineupFontsLoaded(displayFont: string, bodyFont: string): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load(`400 ${42 * SCALE}px ${displayFont}`),
      document.fonts.load(`600 ${25 * SCALE}px ${bodyFont}`),
      document.fonts.load(`700 ${25 * SCALE}px ${bodyFont}`),
    ]);
    await document.fonts.ready;
  } catch {
    // Fallback silencioso si el entorno de navegador no soporta Font Loading API
  }
}

// Caché en memoria de imágenes ya cargadas para evitar parpadeos al editar en vivo
const imageCache = new Map<string, HTMLImageElement>();
const inFlightImageLoads = new Map<string, Promise<HTMLImageElement | null>>();

function isLocalOrDataUrl(src: string): boolean {
  return src.startsWith("/") || src.startsWith("blob:") || src.startsWith("data:");
}

async function loadCachedImage(src: string): Promise<HTMLImageElement | null> {
  if (!src || typeof window === "undefined") return null;

  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return cached;
  }

  const pending = inFlightImageLoads.get(src);
  if (pending) {
    return pending;
  }

  const loadPromise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    if (!isLocalOrDataUrl(src)) {
      img.crossOrigin = "anonymous";
    }

    const timer = window.setTimeout(() => {
      inFlightImageLoads.delete(src);
      resolve(null);
    }, 6000);

    img.onload = () => {
      window.clearTimeout(timer);
      inFlightImageLoads.delete(src);
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        // Evitar crecimiento ilimitado cuando se prueban múltiples fondos personalizados
        if (src !== DEFAULT_LINEUP_BG_SRC && imageCache.size >= 6) {
          for (const key of imageCache.keys()) {
            if (key !== DEFAULT_LINEUP_BG_SRC) {
              imageCache.delete(key);
              break;
            }
          }
        }
        imageCache.set(src, img);
        resolve(img);
      } else {
        resolve(null);
      }
    };

    img.onerror = () => {
      window.clearTimeout(timer);
      inFlightImageLoads.delete(src);
      resolve(null);
    };

    img.src = src;
  });

  inFlightImageLoads.set(src, loadPromise);
  return loadPromise;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetW: number,
  targetH: number
): void {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = targetW / targetH;

  if (Math.abs(imgRatio - targetRatio) < 0.01) {
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return;
  }

  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (imgRatio > targetRatio) {
    sw = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / targetRatio;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
}

function drawFallbackBackground(ctx: CanvasRenderingContext2D): void {
  const grad = ctx.createLinearGradient(0, 0, 0, LINEUP_CARD_HEIGHT);
  grad.addColorStop(0, "#041421");
  grad.addColorStop(1, "#071F32");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LINEUP_CARD_WIDTH, LINEUP_CARD_HEIGHT);
}

/**
 * Renderiza la tarjeta de lineup oficial (1080×1920) sobre un <canvas> existente.
 */
export async function renderLineupCardOnCanvas(
  canvas: HTMLCanvasElement,
  data: LineupCardRenderData,
  customBgSrc?: string | null
): Promise<void> {
  const targetSrc = customBgSrc?.trim() || DEFAULT_LINEUP_BG_SRC;
  let bgImg = await loadCachedImage(targetSrc);
  if (!bgImg && targetSrc !== DEFAULT_LINEUP_BG_SRC) {
    bgImg = await loadCachedImage(DEFAULT_LINEUP_BG_SRC);
  }

  // Solo asignar dimensiones cuando difieren para evitar borrar el lienzo antes de tiempo
  if (canvas.width !== LINEUP_CARD_WIDTH) {
    canvas.width = LINEUP_CARD_WIDTH;
  }
  if (canvas.height !== LINEUP_CARD_HEIGHT) {
    canvas.height = LINEUP_CARD_HEIGHT;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const displayFont = resolveFontFamily("--font-righteous", DISPLAY_FONT_FALLBACK);
  const bodyFont = resolveFontFamily("--font-jura", BODY_FONT_FALLBACK);
  await ensureLineupFontsLoaded(displayFont, bodyFont);

  // ── 0. Fondo de Plantilla o Gradiente Fallback ──
  ctx.save();
  if (bgImg) {
    if (customBgSrc?.trim()) {
      drawCoverImage(ctx, bgImg, LINEUP_CARD_WIDTH, LINEUP_CARD_HEIGHT);
    } else {
      ctx.drawImage(bgImg, 0, 0, LINEUP_CARD_WIDTH, LINEUP_CARD_HEIGHT);
    }
  } else {
    drawFallbackBackground(ctx);
  }
  ctx.restore();

  // ── 1. Cabecera: "LINE UP VS" + Nombre Corto del Rival (Righteous) ──
  const headerCx = 413 * SCALE;

  ctx.save();
  ctx.font = `400 ${42 * SCALE}px ${displayFont}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const lineUpLabel = "LINE UP ";
  const vsLabel = "VS";
  const lineUpWidth = ctx.measureText(lineUpLabel).width;
  const vsWidth = ctx.measureText(vsLabel).width;
  const headerStartX = headerCx - (lineUpWidth + vsWidth) / 2;

  ctx.fillStyle = HEADER_GOLD_COLOR;
  ctx.fillText(lineUpLabel, headerStartX, 119 * SCALE);
  ctx.fillStyle = TEXT_WHITE;
  ctx.fillText(vsLabel, headerStartX + lineUpWidth, 119 * SCALE);
  ctx.restore();

  ctx.save();
  const opponentText = (data.opponentShort || "").trim().toUpperCase();
  const maxOpponentWidth = 255 * SCALE;
  let opponentFontSize = 44 * SCALE;
  const minOpponentFontSize = 22 * SCALE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = TEXT_WHITE;

  while (opponentFontSize > minOpponentFontSize) {
    ctx.font = `400 ${opponentFontSize}px ${displayFont}`;
    if (ctx.measureText(opponentText).width <= maxOpponentWidth) {
      break;
    }
    opponentFontSize -= 1 * SCALE;
  }
  ctx.font = `400 ${opponentFontSize}px ${displayFont}`;
  ctx.fillText(opponentText, headerCx, 189 * SCALE, maxOpponentWidth);
  ctx.restore();

  // ── 2. Filas de los 9 Bateadores (Cápsulas Righteous + Nombres Jura) ──
  for (let i = 0; i < ROW_CYS.length; i++) {
    const cy = ROW_CYS[i] * SCALE;
    const slot = data.slots[i];
    const posText = (slot?.position || "").trim().toUpperCase();
    const playerText = (slot?.playerName || "").trim().toUpperCase();

    // Píldora de posición
    ctx.save();
    ctx.fillStyle = PILL_FILL_COLOR;
    drawRoundedRect(ctx, 50 * SCALE, (ROW_CYS[i] - 22.5) * SCALE, 64 * SCALE, 45 * SCALE, 22.5 * SCALE);
    ctx.fill();
    ctx.restore();

    // Texto de posición centrado en la píldora (Righteous)
    ctx.save();
    ctx.fillStyle = TEXT_WHITE;
    ctx.font = `400 ${25 * SCALE}px ${displayFont}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(posText, 82 * SCALE, cy, 56 * SCALE);
    ctx.restore();

    // Nombre del bateador (Jura)
    if (playerText) {
      ctx.save();
      ctx.fillStyle = TEXT_WHITE;
      ctx.font = `700 ${25 * SCALE}px ${bodyFont}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 4 * SCALE;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2 * SCALE;
      ctx.fillText(playerText, 132 * SCALE, cy, 420 * SCALE);
      ctx.restore();
    }
  }

  // ── 3. Píldora del Pitcher Abridor (Righteous) ──
  const pitcherText = `PITCHER: ${(data.pitcherName?.trim() || "POR ANUNCIAR").toUpperCase()}`;
  const pitcherFont = `400 ${24 * SCALE}px ${displayFont}`;

  ctx.save();
  ctx.font = pitcherFont;
  const measuredPitcherWidth = ctx.measureText(pitcherText).width;
  const pitcherPillX = 59 * SCALE;
  const pitcherPillY = 773 * SCALE;
  const pitcherPillH = 44 * SCALE;
  const pitcherPillW = Math.min(498 * SCALE, Math.max(345 * SCALE, measuredPitcherWidth + 44 * SCALE));

  ctx.fillStyle = PILL_FILL_COLOR;
  drawRoundedRect(ctx, pitcherPillX, pitcherPillY, pitcherPillW, pitcherPillH, 22 * SCALE);
  ctx.fill();

  ctx.fillStyle = TEXT_WHITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    pitcherText,
    pitcherPillX + pitcherPillW / 2,
    795 * SCALE,
    pitcherPillW - 28 * SCALE
  );
  ctx.restore();

  // ── 4. Pie de Página: Transmisión (Jura) y Fecha/Hora (Righteous) ──
  ctx.save();
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `600 ${25 * SCALE}px ${bodyFont}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 5 * SCALE;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2 * SCALE;
  ctx.fillText((data.transmissionLine1 || "").trim(), 58 * SCALE, 865 * SCALE, 340 * SCALE);
  ctx.fillText((data.transmissionLine2 || "").trim(), 58 * SCALE, 908 * SCALE, 340 * SCALE);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `400 ${30 * SCALE}px ${displayFont}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 5 * SCALE;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2 * SCALE;
  ctx.fillText((data.dateShort || "").trim().toUpperCase(), 485 * SCALE, 868 * SCALE, 170 * SCALE);
  ctx.fillText((data.timeCompact || "").trim().toUpperCase(), 485 * SCALE, 914 * SCALE, 170 * SCALE);
  ctx.restore();

  // ── 5. Banner del Estadio (Righteous) ──
  ctx.save();
  ctx.fillStyle = PILL_FILL_COLOR;
  drawRoundedRect(ctx, 39 * SCALE, 954 * SCALE, 498 * SCALE, 38 * SCALE, 14 * SCALE);
  ctx.fill();

  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `400 ${21 * SCALE}px ${displayFont}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((data.stadiumName || "").trim().toUpperCase(), 288 * SCALE, 973 * SCALE, 476 * SCALE);
  ctx.restore();
}

/**
 * Genera un archivo PNG en formato Blob (1080×1920 px) en un canvas fuera de pantalla.
 */
export async function generateLineupCardBlob(
  data: LineupCardRenderData,
  customBgSrc?: string | null
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;

  const offscreen = document.createElement("canvas");
  offscreen.width = LINEUP_CARD_WIDTH;
  offscreen.height = LINEUP_CARD_HEIGHT;

  await renderLineupCardOnCanvas(offscreen, data, customBgSrc);

  return new Promise<Blob | null>((resolve) => {
    try {
      offscreen.toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null);
    }
  });
}
