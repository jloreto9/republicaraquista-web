import {
  PitchGameDataResponse,
  PitcherProfile,
  PitcherGameLog,
  StatcastPitchRow,
  PBPDestinationRow,
  InningWorkloadItem,
  PlatoonSplits,
  PitchDetail,
} from "@/types/pitching";
import { CANONICAL_PITCH_COLORS, getPitchColor } from "@/lib/pitching-constants";

/**
 * Generador canónico de Pitching Summary en Canvas HTML5 para República Caraquista.
 * Replica de manera milimétrica y al píxel la salida de Matplotlib (GridSpec 20x20)
 * diseñada por Thomas Nestico (@TJStats) y adaptada a la LVBP.
 *
 * Dimensiones: 2400x2400 px (300 DPI) sobre fondo blanco pulcro (#FFFFFF).
 *
 * Estructura:
 * 1. Cabecera:
 *    - Izquierda: Headshot oficial rectangular de MLB con marco sutil.
 *    - Centro: Biografía jerárquica 100% centrada (Nombre, Bio física, Subtítulo 1 en dorado, Subtítulo 2 en cursiva gris).
 *    - Derecha: Logo oficial circular de República Caraquista con texto dorado "REPUBLICA CARAQUISTA" debajo.
 * 2. Tabla Superior de Métricas (Boxscore):
 *    - Salida Individual (8 cols): IP | H | R | ER | BB | SO | PITCHES | CSW%
 *    - Temporada Completa (9 cols): IP | JUEGOS | WHIP | ERA | SO (K) | BB | PITCHES | CSW% | Whiff%
 *    - Encabezados en #0F172A con texto #FDB827, valores en fondo blanco con texto #070B19.
 * 3. Panel Tríptico Gráfico (3 Subplots estilo Matplotlib clásico):
 *    - Subplot 1: Carga por Entrada (Strikes abajo #0C162D, Bolas arriba #F5A623) con leyenda superior derecha.
 *    - Subplot 2: Apalancamiento Tango RE24 con cota punteada 1.0 LI y curva continua naranja #D97706.
 *    - Subplot 3: Platoon Splits (LHB vs RHB) en tasas 0-100% (Strike%, Whiff%, CSW%).
 * 4. Tabla Inferior:
 *    - LVBP: Tabla de Destino del Pitcheo centrada al 76% del ancho (Bolas, Strikes Cantados, Whiffs, Fouls, En Juego).
 *    - MLB: Tabla completa de repertorio Hawk-Eye con fila All.
 * 5. Pie de Página (Footer):
 *    - Izquierda: República Caraquista • @republicaraquista • Jorge Leonardo Loreto
 *    - Centro: Play-by-Play Sabermétrico • Tango RE24 Leverage Index (cursiva gris)
 *    - Derecha: Diseño inspirado en Thomas Nestico (@TJStats) • Data: MLB Stats API / Gameday PBP
 */

export async function generatePitchingCardBlob(
  data: PitchGameDataResponse,
  pitcher: PitcherProfile,
  gameLog: PitcherGameLog,
  branch: "lvbp" | "mlb"
): Promise<Blob | null> {
  const size = 2400;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 1. Fondo Blanco Pulcro (Estilo canónico Matplotlib)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);

  // Márgenes y ancho útil principal
  const tblX = 80;
  const tblW = size - 160; // 2240 px
  const centerX = size / 2; // 1200 px

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Cabecera (y: 45 a 380 px)
  // ───────────────────────────────────────────────────────────────────────────
  const headshotX = 80;
  const headshotY = 48;
  const headshotW = 310;
  const headshotH = 340;

  // Foto oficial MLB rectangular (ax_headshot)
  try {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = pitcher.photoUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(headshotX, headshotY, headshotW, headshotH);

    // Ajustar imagen centrada manteniendo relación de aspecto
    const imgAspect = (img.naturalWidth || img.width || 1) / (img.naturalHeight || img.height || 1);
    let drawW = headshotW;
    let drawH = headshotH;
    let drawX = headshotX;
    let drawY = headshotY;

    if (imgAspect > headshotW / headshotH) {
      drawH = headshotW / imgAspect;
      drawY = headshotY + (headshotH - drawH) / 2;
    } else {
      drawW = headshotH * imgAspect;
      drawX = headshotX + (headshotW - drawW) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(headshotX, headshotY, headshotW, headshotH);
  } catch {
    ctx.fillStyle = "#F1F5F9";
    ctx.fillRect(headshotX, headshotY, headshotW, headshotH);
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(headshotX, headshotY, headshotW, headshotH);
  }

  // Textos Biográficos Centrados Horizontalmente (ax_bio)
  const isSeason = data.timeMode === "season";
  const teamLabel = pitcher.lvbpTeamName || pitcher.team || "Leones del Caracas";
  const oppClean = gameLog.opponent || "Rival";
  const seasonNum = gameLog.date.replace("Temporada ", "").split("-")[0] || "2025";

  let sub1 = "";
  let sub2 = "";

  if (branch === "lvbp") {
    if (isSeason) {
      const phaseTxt =
        gameLog.phase === "R"
          ? "Temporada Regular"
          : gameLog.phase === "L"
          ? "Round Robin"
          : gameLog.phase === "F"
          ? "Serie Final"
          : "Temporada Completa";
      sub1 = `LVBP • ${teamLabel} (${phaseTxt})`;
      sub2 = `Temporada ${seasonNum}`;
    } else {
      sub1 = `LVBP • ${teamLabel} vs ${oppClean}`;
      sub2 = `Fecha: ${gameLog.date} | Temporada ${seasonNum}`;
    }
  } else {
    if (isSeason) {
      sub1 = "MLB • Resumen de Temporada Completa";
      sub2 = `${pitcher.team} | Temporada ${seasonNum}`;
    } else {
      sub1 = `MLB • Salida Individual vs ${oppClean}`;
      sub2 = `Fecha: ${gameLog.date} | Temporada ${seasonNum}`;
    }
  }

  // Nombre (centrado)
  ctx.textAlign = "center";
  ctx.fillStyle = "#070B19";
  ctx.font = "900 68px Inter, system-ui, sans-serif";
  ctx.fillText(pitcher.name, centerX, 115);

  // Bio física (centrada)
  const age = pitcher.age || 31;
  const height = pitcher.height || "6' 3\"";
  const weight = pitcher.weight || 180;
  const throws = pitcher.throws || "R";
  ctx.fillStyle = "#475569";
  ctx.font = "500 25px Inter, system-ui, sans-serif";
  ctx.fillText(`${throws}HP • Edad: ${age} • ${height} / ${weight} lbs`, centerX, 175);

  // Subtítulo 1 (dorado caraquista bold, centrado)
  ctx.fillStyle = "#D97706";
  ctx.font = "bold 29px Inter, sans-serif";
  ctx.fillText(sub1, centerX, 248);

  // Subtítulo 2 (gris cursiva italic, centrado)
  ctx.fillStyle = "#64748B";
  ctx.font = "italic 23px Inter, sans-serif";
  ctx.fillText(sub2, centerX, 312);

  // Logo Oficial República Caraquista (ax_logo)
  const logoCenterX = size - 80 - 150; // ~2170
  const logoCenterY = 160;
  try {
    const logoImg = new window.Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.src = "/assets/logo.png";
    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = resolve;
    });

    const logoRadius = 72;
    ctx.drawImage(
      logoImg,
      logoCenterX - logoRadius,
      logoCenterY - logoRadius,
      logoRadius * 2,
      logoRadius * 2
    );
  } catch {
    ctx.fillStyle = "#0D152B";
    ctx.beginPath();
    ctx.arc(logoCenterX, logoCenterY, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FDB827";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Texto dorado debajo del logo
  ctx.fillStyle = "#C27803";
  ctx.font = "bold 16px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("REPUBLICA CARAQUISTA", logoCenterX, 268);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Tabla Superior de Métricas (ax_season_table) (y: 415 a 565 px)
  // ───────────────────────────────────────────────────────────────────────────
  const tblY = 415;
  const tblHeaderH = 65;
  const tblValH = 78;
  const tblTotalH = tblHeaderH + tblValH;

  const cols = isSeason
    ? ["IP", "JUEGOS", "WHIP", "ERA", "SO (K)", "BB", "PITCHES", "CSW%", "Whiff%"]
    : ["IP", "H", "R", "ER", "BB", "SO", "PITCHES", "CSW%"];

  const vals = isSeason
    ? [
        data.boxscore.ip,
        String(data.gamesCount || "—"),
        data.boxscore.whip || "0.00",
        data.boxscore.era || "0.00",
        String(data.boxscore.so),
        String(data.boxscore.bb),
        String(data.boxscore.pitches),
        data.boxscore.cswPct,
        data.boxscore.whiffPct,
      ]
    : [
        data.boxscore.ip,
        String(data.boxscore.h),
        String(data.boxscore.r),
        String(data.boxscore.er),
        String(data.boxscore.bb),
        String(data.boxscore.so),
        String(data.boxscore.pitches),
        data.boxscore.cswPct,
      ];

  const colW = tblW / cols.length;

  // Marco exterior
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.strokeRect(tblX, tblY, tblW, tblTotalH);

  for (let i = 0; i < cols.length; i++) {
    const cx = tblX + i * colW;

    // Encabezado
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(cx, tblY, colW, tblHeaderH);

    ctx.fillStyle = "#FDB827";
    ctx.font = "bold 23px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(cols[i], cx + colW / 2, tblY + 41);

    // Valor
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(cx, tblY + tblHeaderH, colW, tblValH);

    ctx.fillStyle = "#070B19";
    ctx.font = "bold 33px Inter, sans-serif";
    ctx.fillText(vals[i], cx + colW / 2, tblY + tblHeaderH + 50);

    // Líneas divisorias verticales
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, tblY);
      ctx.lineTo(cx, tblY + tblTotalH);
      ctx.strokeStyle = "#CCCCCC";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Divisor horizontal entre encabezado y valor
  ctx.beginPath();
  ctx.moveTo(tblX, tblY + tblHeaderH);
  ctx.lineTo(tblX + tblW, tblY + tblHeaderH);
  ctx.strokeStyle = "#CCCCCC";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Panel Gráfico Tríptico (3 Subplots estilo Matplotlib) (y: 660 a 1350 px)
  // ───────────────────────────────────────────────────────────────────────────
  const panelY = 660;
  const panelH = 680;
  const panelW = 680;
  const gap = 100;

  const p1X = tblX;
  const p2X = tblX + panelW + gap;
  const p3X = tblX + (panelW + gap) * 2;

  if (branch === "lvbp") {
    // ── Panel 1: Carga por Entrada ──
    drawLvbpWorkloadPlot(ctx, p1X, panelY, panelW, panelH, data.inningsWorkload);

    // ── Panel 2: Apalancamiento (Tango RE24) ──
    drawLvbpLeveragePlot(ctx, p2X, panelY, panelW, panelH, data.inningsWorkload);

    // ── Panel 3: Platoon Splits (LHB vs RHB) ──
    drawLvbpPlatoonPlot(ctx, p3X, panelY, panelW, panelH, data.splitsPlatoon);
  } else {
    // Rama MLB
    drawMlbVelocityPlot(ctx, p1X, panelY, panelW, panelH, data.statcastTable);
    drawMlbStrikeZonePlot(ctx, p2X, panelY, panelW, panelH, data.pitches);
    drawMlbBreaksPlot(ctx, p3X, panelY, panelW, panelH, data.pitches, pitcher.throws);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Tabla Inferior (y: 1440 a 2060 px)
  // ───────────────────────────────────────────────────────────────────────────
  const bottomTblY = 1440;
  const bottomTblH = 620;

  if (branch === "lvbp") {
    // Tabla PBP centrada al 76% (Bolas, Strikes Cantados, Whiffs, Fouls, En Juego)
    drawLvbpBottomTable(ctx, tblX, bottomTblY, tblW, bottomTblH, data.pbpTable);
  } else {
    // Tabla de repertorio Hawk-Eye MLB
    drawMlbRepTable(ctx, tblX, bottomTblY, tblW, bottomTblH, data.statcastTable);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Pie de Página Oficial (Footer Matplotlib sin línea gruesa) (y: 2240 a 2320 px)
  // ───────────────────────────────────────────────────────────────────────────
  // Izquierda: Branding República Caraquista
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 28px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("República Caraquista", tblX, 2248);

  ctx.fillStyle = "#64748B";
  ctx.font = "500 19px Inter, sans-serif";
  ctx.fillText("@republicaraquista • Jorge Leonardo Loreto", tblX, 2284);

  // Centro: Metodología Sabermétrica
  ctx.fillStyle = "#64748B";
  ctx.font = "italic 20px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Play-by-Play Sabermétrico • Tango RE24 Leverage Index", centerX, 2266);

  // Derecha: Atribución canónica
  ctx.textAlign = "right";
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 21px Inter, sans-serif";
  ctx.fillText("Diseño inspirado en Thomas Nestico (@TJStats)", tblX + tblW, 2248);

  ctx.fillStyle = "#64748B";
  ctx.font = "500 17px Inter, sans-serif";
  const srcData =
    branch === "lvbp"
      ? "Data: MLB Stats API / Gameday PBP"
      : "Data: MLB Statcast / Baseball Savant";
  ctx.fillText(srcData, tblX + tblW, 2284);
  ctx.textAlign = "left";

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Subrutinas de Subplots Gráficos Estilo Matplotlib Thomas Nestico
// ─────────────────────────────────────────────────────────────────────────────

// Marco recto y título superior del subplot
function drawSubplotFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string
) {
  // Fondo blanco
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, w, h);

  // Borde rectangular clásico Matplotlib
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // Título centrado arriba del marco
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 23px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, x + w / 2, y - 18);
  ctx.textAlign = "left";
}

// Subplot 1: Carga por Entrada (Strikes abajo #0C162D, Bolas arriba #F5A623)
function drawLvbpWorkloadPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  workload: InningWorkloadItem[]
) {
  drawSubplotFrame(ctx, x, y, w, h, "Carga por Entrada");

  if (!workload || workload.length === 0) {
    drawEmptyState(ctx, x, y, w, h, "Sin registros de carga por entrada");
    return;
  }

  // Eje de datos interno
  const plotLeft = x;
  const plotBottom = y + h;
  const pCounts = workload.map((w) => w.pitches);
  const maxP = Math.max(...pCounts, 25);
  // Redondear maxP a múltiplo de 5 superior
  const yUpper = Math.ceil(maxP / 5) * 5;

  // Grid interior punteado horizontal
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let tick = 0; tick <= yUpper; tick += 5) {
    const ty = plotBottom - (tick / yUpper) * h;
    if (tick > 0 && tick < yUpper) {
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x + w, ty);
      ctx.stroke();
    }

    // Ticks y números en eje Y (a la izquierda)
    ctx.fillStyle = "#475569";
    ctx.font = "bold 15px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(tick), x - 10, ty + 5);
  }
  ctx.setLineDash([]);

  // Título del Eje Y (rotado 90°)
  ctx.save();
  ctx.translate(x - 45, y + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Pitcheos Totales", 0, 0);
  ctx.restore();

  // Título del Eje X
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Entrada (Inning)", x + w / 2, y + h + 55);

  // Barras Apiladas
  const n = workload.length;
  const slotW = w / n;
  const barW = Math.min(slotW * 0.58, 62);

  workload.forEach((wk, i) => {
    const cx = x + i * slotW + slotW / 2;
    const bx = cx - barW / 2;
    const strikeH = (wk.strikes / yUpper) * h;
    const ballH = (Math.max(0, wk.pitches - wk.strikes) / yUpper) * h;

    // Strikes (Azul Marino Oscuro #0C162D)
    ctx.fillStyle = "#0C162D";
    ctx.fillRect(bx, plotBottom - strikeH, barW, strikeH);
    ctx.strokeStyle = "#0F172A";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, plotBottom - strikeH, barW, strikeH);

    // Bolas (Amarillo Dorado #F5A623)
    ctx.fillStyle = "#F5A623";
    ctx.fillRect(bx, plotBottom - strikeH - ballH, barW, ballH);
    ctx.strokeRect(bx, plotBottom - strikeH - ballH, barW, ballH);

    // Total Pitcheos encima
    ctx.fillStyle = "#070B19";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(wk.pitches), cx, plotBottom - strikeH - ballH - 8);

    // Etiqueta Entrada en el Eje X
    ctx.fillStyle = "#070B19";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillText(`Inn ${wk.inning}`, cx, plotBottom + 26);
  });

  // Leyenda en esquina superior derecha interna
  const legX = x + w - 135;
  const legY = y + 14;
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  ctx.fillRect(legX, legY, 122, 54);
  ctx.strokeRect(legX, legY, 122, 54);

  // Strikes
  ctx.fillStyle = "#0C162D";
  ctx.fillRect(legX + 10, legY + 11, 14, 14);
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 14px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Strikes", legX + 32, legY + 23);

  // Bolas
  ctx.fillStyle = "#F5A623";
  ctx.fillRect(legX + 10, legY + 31, 14, 14);
  ctx.fillStyle = "#070B19";
  ctx.fillText("Bolas", legX + 32, legY + 43);
}

// Subplot 2: Apalancamiento Tango RE24
function drawLvbpLeveragePlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  workload: InningWorkloadItem[]
) {
  drawSubplotFrame(ctx, x, y, w, h, "Apalancamiento (Tango RE24)");

  if (!workload || workload.length === 0) {
    drawEmptyState(ctx, x, y, w, h, "Sin datos de Leverage Index");
    return;
  }

  const plotBottom = y + h;
  const lis = workload.map((wk) => wk.avgLi || 1.0);
  const maxLi = Math.max(...lis, 1.8);
  const yUpper = Math.max(Math.ceil(maxLi * 1.25 * 2) / 2, 2.0); // 2.0, 2.5...

  // Grid horizontal y ticks en Y (0.0, 0.5, 1.0, 1.5, 2.0...)
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let tick = 0; tick <= yUpper; tick += 0.5) {
    const ty = plotBottom - (tick / yUpper) * h;
    if (tick > 0 && tick < yUpper) {
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x + w, ty);
      ctx.stroke();
    }

    ctx.fillStyle = "#475569";
    ctx.font = "bold 15px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(tick.toFixed(1), x - 10, ty + 5);
  }
  ctx.setLineDash([]);

  // Título del Eje Y
  ctx.save();
  ctx.translate(x - 48, y + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Leverage Index (LI)", 0, 0);
  ctx.restore();

  // Título del Eje X
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Entrada (Inning)", x + w / 2, y + h + 55);

  // Línea horizontal de base (1.0 LI)
  const base1Y = plotBottom - (1.0 / yUpper) * h;
  ctx.strokeStyle = "#5B7083";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x, base1Y);
  ctx.lineTo(x + w, base1Y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Puntos y trazo de curva naranja #D97706
  const n = workload.length;
  const paddingX = 45;
  const step = n > 1 ? (w - paddingX * 2) / (n - 1) : 0;

  const points: { px: number; py: number; li: number; inn: number }[] = [];
  workload.forEach((wk, i) => {
    const px = n > 1 ? x + paddingX + i * step : x + w / 2;
    const py = plotBottom - ((wk.avgLi || 1.0) / yUpper) * h;
    points.push({ px, py, li: wk.avgLi || 1.0, inn: wk.inning });
  });

  // Línea continua naranja
  ctx.strokeStyle = "#D97706";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  points.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.px, pt.py);
    else ctx.lineTo(pt.px, pt.py);
  });
  ctx.stroke();

  // Marcadores circulares y etiquetas numéricas
  points.forEach((pt) => {
    // Círculo
    ctx.fillStyle = "#D97706";
    ctx.beginPath();
    ctx.arc(pt.px, pt.py, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Etiqueta numérica
    ctx.fillStyle = "#D97706";
    ctx.font = "bold 15px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pt.li.toFixed(2), pt.px, pt.py - 12);

    // Etiqueta Inning
    ctx.fillStyle = "#070B19";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillText(`Inn ${pt.inn}`, pt.px, plotBottom + 26);
  });

  // Leyenda en esquina superior derecha interna
  const legX = x + w - 195;
  const legY = y + 14;
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  ctx.fillRect(legX, legY, 182, 54);
  ctx.strokeRect(legX, legY, 182, 54);

  // Línea naranja con punto
  ctx.strokeStyle = "#D97706";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(legX + 8, legY + 18);
  ctx.lineTo(legX + 26, legY + 18);
  ctx.stroke();
  ctx.fillStyle = "#D97706";
  ctx.beginPath();
  ctx.arc(legX + 17, legY + 18, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#070B19";
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("LI Promedio", legX + 34, legY + 22);

  // Línea gris discontinua
  ctx.strokeStyle = "#5B7083";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(legX + 8, legY + 38);
  ctx.lineTo(legX + 26, legY + 38);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#070B19";
  ctx.fillText("Presión Base (1.0 LI)", legX + 34, legY + 42);
}

// Subplot 3: Platoon Splits (LHB vs RHB)
function drawLvbpPlatoonPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  splits: PitchGameDataResponse["splitsPlatoon"]
) {
  drawSubplotFrame(ctx, x, y, w, h, "Platoon Splits (LHB vs RHB)");

  if (!splits || (!splits.vsLhb?.pitches && !splits.vsRhb?.pitches)) {
    drawEmptyState(ctx, x, y, w, h, "Sin datos de Platoon disponibles");
    return;
  }

  const plotBottom = y + h;

  // Grid horizontal y ticks en Y (0%, 20%, 40%, 60%, 80%, 100%)
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let tick = 0; tick <= 100; tick += 20) {
    const ty = plotBottom - (tick / 100) * h;
    if (tick > 0 && tick < 100) {
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x + w, ty);
      ctx.stroke();
    }

    ctx.fillStyle = "#475569";
    ctx.font = "bold 15px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${tick}%`, x - 10, ty + 5);
  }
  ctx.setLineDash([]);

  // Título del Eje Y
  ctx.save();
  ctx.translate(x - 52, y + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Porcentaje (%)", 0, 0);
  ctx.restore();

  // Categorías
  const cats = ["Strike%", "Whiff%", "CSW%"];
  const parseRate = (v: string | number) =>
    typeof v === "number" ? v : parseFloat(String(v || "0").replace("%", ""));

  const valsL = [
    parseRate(splits.vsLhb.strikePct),
    parseRate(splits.vsLhb.whiffPct),
    parseRate(splits.vsLhb.cswPct),
  ];
  const valsR = [
    parseRate(splits.vsRhb.strikePct),
    parseRate(splits.vsRhb.whiffPct),
    parseRate(splits.vsRhb.cswPct),
  ];

  const catW = w / 3;
  const barW = catW * 0.32;

  cats.forEach((cat, i) => {
    const cx = x + i * catW + catW / 2;

    // Barra Zurdos (Azul #3B82F6)
    const hL = (valsL[i] / 100) * h;
    const bLx = cx - barW - 3;
    ctx.fillStyle = "#3B82F6";
    ctx.fillRect(bLx, plotBottom - hL, barW, hL);
    ctx.strokeStyle = "#0F172A";
    ctx.lineWidth = 1;
    ctx.strokeRect(bLx, plotBottom - hL, barW, hL);

    // Texto % zurdos
    ctx.fillStyle = "#1E40AF";
    ctx.font = "bold 15px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(valsL[i])}%`, bLx + barW / 2, plotBottom - hL - 7);

    // Barra Derechos (Naranja #F59E0B)
    const hR = (valsR[i] / 100) * h;
    const bRx = cx + 3;
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(bRx, plotBottom - hR, barW, hR);
    ctx.strokeRect(bRx, plotBottom - hR, barW, hR);

    // Texto % derechos
    ctx.fillStyle = "#B45309";
    ctx.fillText(`${Math.round(valsR[i])}%`, bRx + barW / 2, plotBottom - hR - 7);

    // Etiqueta Categoría en Eje X
    ctx.fillStyle = "#070B19";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillText(cat, cx, plotBottom + 26);
  });

  // Leyenda en esquina superior derecha interna
  const legX = x + w - 176;
  const legY = y + 14;
  const pL = splits.vsLhb.pitches || 0;
  const pR = splits.vsRhb.pitches || 0;

  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  ctx.fillRect(legX, legY, 164, 54);
  ctx.strokeRect(legX, legY, 164, 54);

  // vs Zurdos
  ctx.fillStyle = "#3B82F6";
  ctx.fillRect(legX + 10, legY + 11, 14, 14);
  ctx.strokeStyle = "#0F172A";
  ctx.strokeRect(legX + 10, legY + 11, 14, 14);
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`vs Zurdos (${pL} P)`, legX + 32, legY + 23);

  // vs Derechos
  ctx.fillStyle = "#F59E0B";
  ctx.fillRect(legX + 10, legY + 31, 14, 14);
  ctx.strokeRect(legX + 10, legY + 31, 14, 14);
  ctx.fillStyle = "#070B19";
  ctx.fillText(`vs Derechos (${pR} P)`, legX + 32, legY + 43);
}

// ─────────────────────────────────────────────────────────────────────────────
// Subrutinas de Tablas Inferiores (Estilo Matplotlib Thomas Nestico)
// ─────────────────────────────────────────────────────────────────────────────

// Tabla PBP de Destino del Pitcheo centrada al 76%
function drawLvbpBottomTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pbpTable: PitchGameDataResponse["pbpTable"]
) {
  if (!pbpTable || pbpTable.length === 0) {
    drawEmptyState(ctx, x, y, w, h, "Sin registros de destinos de pitcheos");
    return;
  }

  // Centrar al 76% del ancho útil (Matplotlib bbox=[0.12, 0.05, 0.76, 0.90])
  const tableW = w * 0.76;
  const tableX = x + (w - tableW) / 2;
  const headerH = 64;
  const rowH = 64;

  const tCols = ["Destino del Pitcheo", "Total Conteo", "Distribución %"];
  const colWidths = [tableW * 0.44, tableW * 0.28, tableW * 0.28];

  // Filas canónicas (hasta 5 filas principales como en la imagen)
  const rows = pbpTable.slice(0, 5);
  const totalTableH = headerH + rows.length * rowH;

  // Marco exterior
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.strokeRect(tableX, y, tableW, totalTableH);

  // Cabecera
  let curX = tableX;
  for (let c = 0; c < tCols.length; c++) {
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(curX, y, colWidths[c], headerH);

    ctx.fillStyle = "#FDB827";
    ctx.font = "bold 23px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(tCols[c], curX + colWidths[c] / 2, y + 41);

    // Divisor vertical
    if (c > 0) {
      ctx.strokeStyle = "#CCCCCC";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(curX, y);
      ctx.lineTo(curX, y + totalTableH);
      ctx.stroke();
    }
    curX += colWidths[c];
  }

  // Divisor horizontal cabecera
  ctx.beginPath();
  ctx.moveTo(tableX, y + headerH);
  ctx.lineTo(tableX + tableW, y + headerH);
  ctx.strokeStyle = "#CCCCCC";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Filas de datos
  rows.forEach((r, idx) => {
    const ry = y + headerH + idx * rowH;
    const bg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";

    // Fondo fila
    ctx.fillStyle = bg;
    ctx.fillRect(tableX, ry, tableW, rowH);

    ctx.fillStyle = "#070B19";
    ctx.font = "bold 22px Inter, sans-serif";

    // Destino (100% CENTRADO horizontalmente en su celda como en la imagen de referencia)
    ctx.textAlign = "center";
    ctx.fillText(r.destination, tableX + colWidths[0] / 2, ry + 41);

    // Conteo (centrado)
    ctx.fillText(String(r.count), tableX + colWidths[0] + colWidths[1] / 2, ry + 41);

    // Porcentaje (centrado)
    ctx.fillText(r.pct, tableX + colWidths[0] + colWidths[1] + colWidths[2] / 2, ry + 41);

    // Línea horizontal divisoria
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX, ry + rowH);
    ctx.lineTo(tableX + tableW, ry + rowH);
    ctx.stroke();
  });
  ctx.textAlign = "left";
}

// ─────────────────────────────────────────────────────────────────────────────
// Subrutinas de Rama MLB (Hawk-Eye / Statcast)
// ─────────────────────────────────────────────────────────────────────────────

function drawMlbVelocityPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  summary: StatcastPitchRow[]
) {
  drawSubplotFrame(ctx, x, y, w, h, "Distribución de Velocidad (mph)");

  if (!summary || summary.length === 0) {
    drawEmptyState(ctx, x, y, w, h, "Sin datos de velocidad");
    return;
  }

  const valid = summary.filter((s) => {
    const v = typeof s.veloAvg === "number" ? s.veloAvg : parseFloat(String(s.veloAvg)) || 0;
    return v > 0;
  });

  const plotBottom = y + h;
  const rowH = Math.min((h - 80) / Math.max(valid.length, 1), 75);

  valid.forEach((pt, i) => {
    const ry = y + 40 + i * rowH;
    const pColor = pt.color || getPitchColor(pt.pitchName, pt.pitchType);
    const veloNum =
      typeof pt.veloAvg === "number" ? pt.veloAvg : parseFloat(String(pt.veloAvg)) || 0;

    // Nombre de Pitcheo
    ctx.fillStyle = pColor;
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(pt.pitchName, x + 30, ry + 24);

    // Barra
    const barStartX = x + 210;
    const barMaxW = w - 210 - 110;
    const norm = Math.max(0, Math.min(1, (veloNum - 70) / 32));
    const curW = norm * barMaxW;

    ctx.fillStyle = "#F1F5F9";
    ctx.fillRect(barStartX, ry + 6, barMaxW, 24);

    ctx.fillStyle = pColor;
    ctx.fillRect(barStartX, ry + 6, curW, 24);

    ctx.fillStyle = "#070B19";
    ctx.font = "bold 20px Inter, monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${veloNum.toFixed(1)} mph`, x + w - 20, ry + 24);
  });
  ctx.textAlign = "left";
}

function drawMlbStrikeZonePlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pitches: PitchGameDataResponse["pitches"]
) {
  drawSubplotFrame(ctx, x, y, w, h, "Pitch Locations & Strike Zone");

  const cx = x + w / 2;
  const cy = y + h / 2 - 10;
  const pxScale = 110;

  const szW = 1.416 * pxScale;
  const szH = 2.0 * pxScale;
  const szX = cx - szW / 2;
  const szY = cy - szH / 2;

  // Home plate
  const plateW = szW;
  const plateY = szY + szH + 45;
  ctx.fillStyle = "#CBD5E1";
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - plateW / 2, plateY);
  ctx.lineTo(cx + plateW / 2, plateY);
  ctx.lineTo(cx + plateW / 2, plateY + 12);
  ctx.lineTo(cx, plateY + 28);
  ctx.lineTo(cx - plateW / 2, plateY + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Marco de la zona
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 3;
  ctx.strokeRect(szX, szY, szW, szH);

  // Cuadrícula 3x3 interior
  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  for (let c = 1; c < 3; c++) {
    ctx.beginPath();
    ctx.moveTo(szX + (c * szW) / 3, szY);
    ctx.lineTo(szX + (c * szW) / 3, szY + szH);
    ctx.stroke();
  }
  for (let r = 1; r < 3; r++) {
    ctx.beginPath();
    ctx.moveTo(szX, szY + (r * szH) / 3);
    ctx.lineTo(szX + szW, szY + (r * szH) / 3);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Scatter de lanzamientos
  if (pitches && pitches.length > 0) {
    pitches.forEach((p) => {
      if (p.plateX == null || p.plateZ == null) return;
      const ptX = cx + p.plateX * pxScale;
      const ptY = cy - (p.plateZ - 2.5) * pxScale;

      const col = getPitchColor(p.pitchName || p.pitchType, p.pitchType);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(ptX, ptY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }
}

function drawMlbBreaksPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pitches: PitchGameDataResponse["pitches"],
  throws: string
) {
  drawSubplotFrame(ctx, x, y, w, h, "Short-Form Pitch Breaks (in)");

  const cx = x + w / 2;
  const cy = y + h / 2 - 10;
  const radius = Math.min(w, h) * 0.36;

  // Ejes cruzados
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.stroke();

  // Etiquetas
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 15px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("+20\"", cx, cy - radius - 10);
  ctx.fillText("-20\"", cx, cy + radius + 22);

  ctx.fillText(throws === "L" ? "Arm Side" : "Glove Side", cx - radius + 45, cy - 10);
  ctx.fillText(throws === "L" ? "Glove Side" : "Arm Side", cx + radius - 45, cy - 10);

  if (pitches && pitches.length > 0) {
    pitches.forEach((p) => {
      if (p.hb == null || p.ivb == null) return;
      const pxX = cx + (p.hb / 25) * radius;
      const pxY = cy - (p.ivb / 25) * radius;

      const col = getPitchColor(p.pitchName || p.pitchType, p.pitchType);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(pxX, pxY, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }
  ctx.textAlign = "left";
}

function drawMlbRepTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  summary: StatcastPitchRow[]
) {
  if (!summary || summary.length === 0) {
    drawEmptyState(ctx, x, y, w, h, "Sin datos de repertorio Hawk-Eye");
    return;
  }

  const headerH = 55;
  const rowH = 48;

  const tCols = [
    "Pitch Name",
    "Count",
    "Pitch%",
    "Velocity",
    "iVB",
    "HB",
    "Spin",
    "Whiff%",
    "CSW%",
    "Zone%",
  ];
  const colW = w / tCols.length;

  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, headerH + (summary.length + 1) * rowH);

  // Cabecera
  for (let c = 0; c < tCols.length; c++) {
    const cx = x + c * colW;
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(cx, y, colW, headerH);

    ctx.fillStyle = "#FDB827";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(tCols[c], cx + colW / 2, y + 36);

    if (c > 0) {
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx, y + headerH + (summary.length + 1) * rowH);
      ctx.stroke();
    }
  }

  summary.forEach((pt, idx) => {
    const ry = y + headerH + idx * rowH;
    const pColor = pt.color || getPitchColor(pt.pitchName, pt.pitchType);

    ctx.fillStyle = pColor;
    ctx.fillRect(x, ry, colW, rowH);

    ctx.fillStyle = ["#67E18D", "#F79E70", "#FE6100", "#FFB000"].includes(pColor)
      ? "#070B19"
      : "#FFFFFF";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pt.pitchName, x + colW / 2, ry + 32);

    const rowVals = [
      String(pt.count),
      pt.usagePct,
      `${pt.veloAvg}`,
      `${pt.ivb}`,
      `${pt.hb}`,
      String(pt.spinAvg),
      pt.whiffPct,
      pt.cswPct,
      pt.zonePct || "—",
    ];

    const bg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
    for (let c = 1; c < tCols.length; c++) {
      const cx = x + c * colW;
      ctx.fillStyle = bg;
      ctx.fillRect(cx, ry, colW, rowH);

      ctx.fillStyle = "#070B19";
      ctx.font = "900 20px Inter, monospace";
      ctx.fillText(rowVals[c - 1], cx + colW / 2, ry + 32);
    }

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, ry + rowH);
    ctx.lineTo(x + w, ry + rowH);
    ctx.stroke();
  });

  // Fila All
  const allY = y + headerH + summary.length * rowH;
  const totPitches = summary.reduce((acc, s) => acc + s.count, 0);
  const avgVelo =
    summary.reduce((acc, s) => {
      const v = typeof s.veloAvg === "number" ? s.veloAvg : parseFloat(String(s.veloAvg)) || 0;
      return acc + v * s.count;
    }, 0) / Math.max(totPitches, 1);
  const avgSpin = Math.round(
    summary.reduce((acc, s) => {
      const sp = typeof s.spinAvg === "number" ? s.spinAvg : parseFloat(String(s.spinAvg)) || 0;
      return acc + sp * s.count;
    }, 0) / Math.max(totPitches, 1)
  );

  ctx.fillStyle = "#0F172A";
  ctx.fillRect(x, allY, colW, rowH);
  ctx.fillStyle = "#FDB827";
  ctx.font = "bold 22px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("All", x + colW / 2, allY + 32);

  const allVals = [
    String(totPitches),
    "100.0%",
    avgVelo > 0 ? avgVelo.toFixed(1) : "—",
    "—",
    "—",
    avgSpin > 0 ? String(avgSpin) : "—",
    "—",
    "—",
    "—",
  ];

  for (let c = 1; c < tCols.length; c++) {
    const cx = x + c * colW;
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(cx, allY, colW, rowH);

    ctx.fillStyle = "#FDB827";
    ctx.font = "900 20px Inter, monospace";
    ctx.fillText(allVals[c - 1], cx + colW / 2, allY + 32);
  }
  ctx.textAlign = "left";
}

function drawEmptyState(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  msg: string
) {
  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(msg, x + w / 2, y + h / 2);
  ctx.textAlign = "left";
}

export async function downloadPitchingCard(
  data: PitchGameDataResponse,
  pitcher: PitcherProfile,
  gameLog: PitcherGameLog,
  branch: "lvbp" | "mlb"
) {
  const blob = await generatePitchingCardBlob(data, pitcher, gameLog, branch);
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cleanName = pitcher.name.toLowerCase().replace(/\s+/g, "_");
  const modePrefix = data.timeMode === "season" ? "season" : "game";
  a.download = `pitching_summary_${cleanName}_${modePrefix}_${gameLog.date}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
