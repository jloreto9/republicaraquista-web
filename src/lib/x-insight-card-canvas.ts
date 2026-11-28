import type { XInsightCardVisualData } from "@/types/x-insights";

/**
 * Motor Gráfico Editorial HTML5 Canvas para Tarjeta Dato 𝕏 (República Caraquista).
 * Formatos soportados:
 * - "landscape": 1200 × 675 px (16:9 optimizado para el feed de 𝕏)
 * - "square":    1080 × 1080 px (1:1 optimizado para vista cuadrada en 𝕏)
 */

export type XInsightCardFormat = "landscape" | "square";

export const X_INSIGHT_CARD_DIMENSIONS: Record<
  XInsightCardFormat,
  { width: number; height: number }
> = {
  landscape: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
};

const BRAND_LOGO_SRC = "/assets/logo.png";

const PALETTE = {
  outerBg: "#070B19",
  cardBg: "#0D152B",
  panelBg: "#070B19",
  accentPanelBg: "#002D62",
  border: "#1E2B4D",
  gold: "#FDB827",
  white: "#F8FAFC",
  slateLight: "#E2E8F0",
  slateMuted: "#94A3B8",
} as const;

const SANS_FALLBACK =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const MONO_FALLBACK =
  '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

let cachedBrandLogo: HTMLImageElement | null = null;
let brandLogoPromise: Promise<HTMLImageElement | null> | null = null;

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

function isSameOriginUrl(url: string): boolean {
  return url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:");
}

async function loadBrandLogo(): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined") return null;
  if (cachedBrandLogo && cachedBrandLogo.complete && cachedBrandLogo.naturalWidth > 0) {
    return cachedBrandLogo;
  }
  if (brandLogoPromise) {
    return brandLogoPromise;
  }

  brandLogoPromise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new window.Image();
    if (!isSameOriginUrl(BRAND_LOGO_SRC)) {
      img.crossOrigin = "anonymous";
    }
    const timer = window.setTimeout(() => {
      brandLogoPromise = null;
      resolve(null);
    }, 5000);

    img.onload = () => {
      window.clearTimeout(timer);
      brandLogoPromise = null;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        cachedBrandLogo = img;
        resolve(img);
      } else {
        resolve(null);
      }
    };

    img.onerror = () => {
      window.clearTimeout(timer);
      brandLogoPromise = null;
      resolve(null);
    };

    img.src = BRAND_LOGO_SRC;
  });

  return brandLogoPromise;
}

function drawRoundedRectPath(
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

function setTabularNums(ctx: CanvasRenderingContext2D, enabled: boolean): void {
  const canvasCtx = ctx as CanvasRenderingContext2D & {
    fontVariantNumeric?: string;
  };
  if ("fontVariantNumeric" in canvasCtx) {
    canvasCtx.fontVariantNumeric = enabled ? "tabular-nums" : "normal";
  }
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const cleaned = rawText.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const words = cleaned.split(" ");
  const lines: string[] = [];
  let current = "";

  const pushTruncatedWord = (word: string) => {
    let slice = word;
    while (slice.length > 1 && ctx.measureText(`${slice}…`).width > maxWidth) {
      slice = slice.slice(0, -1);
    }
    return `${slice}…`;
  };

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;

    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      if (lines.length >= maxLines) {
        const lastIdx = lines.length - 1;
        let lastLine = lines[lastIdx];
        while (lastLine.length > 1 && ctx.measureText(`${lastLine}…`).width > maxWidth) {
          lastLine = lastLine.slice(0, -1).trimEnd();
        }
        lines[lastIdx] = lastLine.endsWith("…") ? lastLine : `${lastLine}…`;
        return lines;
      }
      current = ctx.measureText(word).width <= maxWidth ? word : pushTruncatedWord(word);
    } else {
      lines.push(pushTruncatedWord(word));
      if (lines.length >= maxLines) {
        return lines;
      }
      current = "";
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  return lines;
}

function fitTextSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  sizes: number[],
  weight: number,
  fontFamily: string
): number {
  for (const size of sizes) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) {
      return size;
    }
  }
  return sizes[sizes.length - 1];
}

function drawWrappedBlock(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
  align: CanvasTextAlign = "left"
): void {
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  lines.forEach((line, index) => {
    ctx.fillText(line, x, startY + index * lineHeight);
  });
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  cardX: number,
  cardW: number,
  footerY: number,
  footerH: number,
  padX: number,
  sourceFooter: string,
  brandLogo: HTMLImageElement | null,
  sansFont: string,
  monoFont: string
): void {
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX, footerY);
  ctx.lineTo(cardX + cardW, footerY);
  ctx.stroke();

  const centerY = footerY + footerH / 2;
  const leftX = cardX + padX;

  const logoBox = 40;
  if (brandLogo) {
    const ratio = (brandLogo.naturalWidth || 1) / (brandLogo.naturalHeight || 1);
    const drawH = logoBox;
    const drawW = Math.min(logoBox * 1.4, drawH * ratio);
    ctx.drawImage(brandLogo, leftX, centerY - drawH / 2, drawW, drawH);
  } else {
    ctx.fillStyle = PALETTE.accentPanelBg;
    drawRoundedRectPath(ctx, leftX, centerY - logoBox / 2, logoBox, logoBox, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = PALETTE.gold;
    ctx.font = `800 15px ${sansFont}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("LC", leftX + logoBox / 2, centerY);
  }

  const brandTextX = leftX + logoBox + 14;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = PALETTE.white;
  ctx.font = `700 16px ${sansFont}`;
  ctx.fillText("REPÚBLICA CARAQUISTA", brandTextX, centerY - 2);

  ctx.fillStyle = PALETTE.gold;
  ctx.font = `600 14px ${monoFont}`;
  ctx.fillText("@RepubCaraquista", brandTextX, centerY + 17);

  const footerNote = sourceFooter.trim() || "Datos verificados LVBP • MLB Stats API";
  ctx.fillStyle = PALETTE.slateMuted;
  ctx.font = `500 14px ${monoFont}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const maxSourceW = cardW - padX * 2 - 280;
  ctx.fillText(footerNote, cardX + cardW - padX, centerY, Math.max(160, maxSourceW));
}

function renderLandscapeLayout(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: XInsightCardVisualData,
  brandLogo: HTMLImageElement | null,
  sansFont: string,
  monoFont: string
): void {
  const outerPad = 32;
  const cardX = outerPad;
  const cardY = outerPad;
  const cardW = width - outerPad * 2;
  const cardH = height - outerPad * 2;
  const padX = 40;
  const headerH = 74;
  const footerH = 80;

  // Contenedor editorial plano
  ctx.fillStyle = PALETTE.cardBg;
  drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Franja superior dorada Caraquista
  ctx.save();
  drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.clip();
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(cardX, cardY, cardW, 5);
  ctx.restore();

  // Cabecera: Kicker y etiqueta de liga
  const headerMidY = cardY + 5 + (headerH - 5) / 2;
  const kickerText = (data.kicker || "DATO DEL DÍA").trim().toUpperCase();

  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(cardX + padX, headerMidY - 10, 4, 20);

  ctx.fillStyle = PALETTE.gold;
  ctx.font = `800 16px ${monoFont}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(kickerText, cardX + padX + 14, headerMidY, cardW * 0.55);

  ctx.fillStyle = PALETTE.slateMuted;
  ctx.font = `700 14px ${monoFont}`;
  ctx.textAlign = "right";
  ctx.fillText("LVBP • LEONES DEL CARACAS", cardX + cardW - padX, headerMidY);

  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX, cardY + headerH);
  ctx.lineTo(cardX + cardW, cardY + headerH);
  ctx.stroke();

  // Cuerpo en 2 columnas
  const bodyY = cardY + headerH + 34;
  const bodyH = cardH - headerH - footerH - 68;
  const contentW = cardW - padX * 2;
  const colGap = 34;
  const leftW = Math.round(contentW * 0.59);
  const rightW = contentW - leftW - colGap;
  const leftX = cardX + padX;
  const rightX = leftX + leftW + colGap;

  // Columna Izquierda: Titular + Bloque de comparación
  const headlineText = (data.headline || "Actualidad de Leones del Caracas").trim();
  let headlineSize = 40;
  ctx.font = `800 ${headlineSize}px ${sansFont}`;
  let headlineLines = wrapTextLines(ctx, headlineText, leftW, 4);
  if (headlineLines.length >= 4 && headlineText.length > 90) {
    headlineSize = 34;
    ctx.font = `800 ${headlineSize}px ${sansFont}`;
    headlineLines = wrapTextLines(ctx, headlineText, leftW, 4);
  }
  const headlineLineH = Math.round(headlineSize * 1.18);
  ctx.fillStyle = PALETTE.white;
  drawWrappedBlock(ctx, headlineLines, leftX, bodyY, headlineLineH, "left");

  const headlineBottomY = bodyY + headlineLines.length * headlineLineH;
  const compBoxY = Math.max(headlineBottomY + 26, bodyY + bodyH - 134);
  const compBoxH = bodyY + bodyH - compBoxY;

  ctx.fillStyle = PALETTE.accentPanelBg;
  drawRoundedRectPath(ctx, leftX, compBoxY, leftW, compBoxH, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Acento lateral izquierdo dorado
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(leftX + 1, compBoxY + 14, 4, Math.max(24, compBoxH - 28));

  const compText = (data.comparisonText || "Seguimiento estadístico oficial LVBP.").trim();
  ctx.font = `500 20px ${sansFont}`;
  const compLines = wrapTextLines(ctx, compText, leftW - 44, 3);
  const compBlockH = compLines.length * 28;
  const compTextY = compBoxY + Math.max(18, (compBoxH - compBlockH) / 2);
  ctx.fillStyle = PALETTE.slateLight;
  drawWrappedBlock(ctx, compLines, leftX + 24, compTextY, 28, "left");

  // Columna Derecha: Bloque Métrica Principal
  ctx.fillStyle = PALETTE.panelBg;
  drawRoundedRectPath(ctx, rightX, bodyY, rightW, bodyH, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Barra superior dorada del bloque métrico
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(rightX + 24, bodyY + 22, 56, 4);

  const statValue = (data.primaryStatValue || "—").trim();
  const statMaxW = rightW - 48;
  setTabularNums(ctx, true);
  const statSize = fitTextSize(
    ctx,
    statValue,
    statMaxW,
    [104, 88, 76, 64, 52, 42],
    900,
    monoFont
  );
  ctx.font = `900 ${statSize}px ${monoFont}`;
  ctx.fillStyle = PALETTE.gold;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const statCenterY = bodyY + bodyH * 0.45;
  ctx.fillText(statValue, rightX + 24, statCenterY, statMaxW);
  setTabularNums(ctx, false);

  const statLabel = (data.primaryStatLabel || "MÉTRICA CLAVE").trim().toUpperCase();
  ctx.font = `700 18px ${sansFont}`;
  const labelLines = wrapTextLines(ctx, statLabel, statMaxW, 3);
  const labelStartY = Math.min(
    bodyY + bodyH - 26 - labelLines.length * 25,
    statCenterY + statSize * 0.55
  );
  ctx.fillStyle = PALETTE.slateLight;
  drawWrappedBlock(ctx, labelLines, rightX + 24, labelStartY, 25, "left");

  // Pie de tarjeta
  drawFooter(
    ctx,
    cardX,
    cardW,
    cardY + cardH - footerH,
    footerH,
    padX,
    data.sourceFooter || "",
    brandLogo,
    sansFont,
    monoFont
  );
}

function renderSquareLayout(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: XInsightCardVisualData,
  brandLogo: HTMLImageElement | null,
  sansFont: string,
  monoFont: string
): void {
  const outerPad = 40;
  const cardX = outerPad;
  const cardY = outerPad;
  const cardW = width - outerPad * 2;
  const cardH = height - outerPad * 2;
  const padX = 48;
  const headerH = 82;
  const footerH = 92;

  ctx.fillStyle = PALETTE.cardBg;
  drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fill();
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.clip();
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(cardX, cardY, cardW, 6);
  ctx.restore();

  const headerMidY = cardY + 6 + (headerH - 6) / 2;
  const kickerText = (data.kicker || "DATO DEL DÍA").trim().toUpperCase();

  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(cardX + padX, headerMidY - 12, 4, 24);

  ctx.fillStyle = PALETTE.gold;
  ctx.font = `800 18px ${monoFont}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(kickerText, cardX + padX + 16, headerMidY, cardW * 0.55);

  ctx.fillStyle = PALETTE.slateMuted;
  ctx.font = `700 16px ${monoFont}`;
  ctx.textAlign = "right";
  ctx.fillText("LVBP • LEONES", cardX + cardW - padX, headerMidY);

  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX, cardY + headerH);
  ctx.lineTo(cardX + cardW, cardY + headerH);
  ctx.stroke();

  const innerX = cardX + padX;
  const innerW = cardW - padX * 2;
  let cursorY = cardY + headerH + 40;

  // Titular Principal
  const headlineText = (data.headline || "Actualidad de Leones del Caracas").trim();
  const headlineSize = headlineText.length > 85 ? 42 : 48;
  const headlineLineH = Math.round(headlineSize * 1.18);
  ctx.font = `800 ${headlineSize}px ${sansFont}`;
  const headlineLines = wrapTextLines(ctx, headlineText, innerW, 3);
  ctx.fillStyle = PALETTE.white;
  drawWrappedBlock(ctx, headlineLines, innerX, cursorY, headlineLineH, "left");
  cursorY += headlineLines.length * headlineLineH + 36;

  // Panel Hero de Métrica Principal
  const statPanelH = 290;
  ctx.fillStyle = PALETTE.panelBg;
  drawRoundedRectPath(ctx, innerX, cursorY, innerW, statPanelH, 16);
  ctx.fill();
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(innerX + 32, cursorY + 28, 72, 5);

  const statValue = (data.primaryStatValue || "—").trim();
  setTabularNums(ctx, true);
  const statSize = fitTextSize(
    ctx,
    statValue,
    innerW - 64,
    [136, 114, 96, 80, 64, 52],
    900,
    monoFont
  );
  ctx.font = `900 ${statSize}px ${monoFont}`;
  ctx.fillStyle = PALETTE.gold;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(statValue, innerX + 32, cursorY + 126, innerW - 64);
  setTabularNums(ctx, false);

  const statLabel = (data.primaryStatLabel || "MÉTRICA CLAVE").trim().toUpperCase();
  ctx.font = `700 22px ${sansFont}`;
  const labelLines = wrapTextLines(ctx, statLabel, innerW - 64, 2);
  ctx.fillStyle = PALETTE.slateLight;
  drawWrappedBlock(ctx, labelLines, innerX + 32, cursorY + 204, 30, "left");

  cursorY += statPanelH + 28;

  // Bloque de Comparación / Contexto
  const footerTop = cardY + cardH - footerH;
  const compBoxH = Math.max(120, footerTop - 32 - cursorY);

  ctx.fillStyle = PALETTE.accentPanelBg;
  drawRoundedRectPath(ctx, innerX, cursorY, innerW, compBoxH, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(innerX + 1, cursorY + 18, 5, Math.max(28, compBoxH - 36));

  const compText = (data.comparisonText || "Seguimiento estadístico oficial LVBP.").trim();
  ctx.font = `500 24px ${sansFont}`;
  const compLines = wrapTextLines(ctx, compText, innerW - 56, 3);
  const compBlockH = compLines.length * 34;
  const compStartY = cursorY + Math.max(20, (compBoxH - compBlockH) / 2);
  ctx.fillStyle = PALETTE.slateLight;
  drawWrappedBlock(ctx, compLines, innerX + 28, compStartY, 34, "left");

  drawFooter(
    ctx,
    cardX,
    cardW,
    footerTop,
    footerH,
    padX,
    data.sourceFooter || "",
    brandLogo,
    sansFont,
    monoFont
  );
}

/**
 * Renderiza la Tarjeta Dato 𝕏 sobre un elemento <canvas>.
 */
export async function renderXInsightCardOnCanvas(
  canvas: HTMLCanvasElement,
  cardData: XInsightCardVisualData,
  format: XInsightCardFormat = "landscape"
): Promise<void> {
  const { width, height } = X_INSIGHT_CARD_DIMENSIONS[format];

  if (canvas.width !== width) {
    canvas.width = width;
  }
  if (canvas.height !== height) {
    canvas.height = height;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const sansFont = resolveFontFamily("--font-geist-sans", SANS_FALLBACK);
  const monoFont = resolveFontFamily("--font-geist-mono", MONO_FALLBACK);

  const brandLogo = await loadBrandLogo();

  // Limpiar y pintar fondo base plano
  ctx.fillStyle = PALETTE.outerBg;
  ctx.fillRect(0, 0, width, height);

  if (format === "square") {
    renderSquareLayout(ctx, width, height, cardData, brandLogo, sansFont, monoFont);
  } else {
    renderLandscapeLayout(ctx, width, height, cardData, brandLogo, sansFont, monoFont);
  }
}

/**
 * Exporta la Tarjeta Dato 𝕏 como PNG en Blob usando un canvas fuera de pantalla.
 */
export async function generateXInsightCardBlob(
  cardData: XInsightCardVisualData,
  format: XInsightCardFormat = "landscape"
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;

  const { width, height } = X_INSIGHT_CARD_DIMENSIONS[format];
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;

  await renderXInsightCardOnCanvas(offscreen, cardData, format);

  return new Promise<Blob | null>((resolve) => {
    try {
      offscreen.toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null);
    }
  });
}
