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
 * Generador de resúmenes gráficos de pitcheo (Pitching Summary) para República Caraquista
 * siguiendo la metodología, proporciones y diseño original de Thomas Nestico (@TJStats).
 *
 * Características:
 * 1. Cuadrícula cuadrada 2400x2400 px (300 DPI) sobre fondo blanco pulcro (#FFFFFF).
 * 2. Cabecera: Headshot oficial circular, biografía jerárquica y logo oficial de República Caraquista.
 * 3. Tabla Resumen: Barra de métricas con encabezados #0F172A y texto #FDB827 (salida o temporada).
 * 4. Panel Gráfico Tríptico (3 subplots con separación horizontal del 36%):
 *    - LVBP: Carga por Entrada (Strikes/Bolas apiladas), Apalancamiento Tango RE24 con cota 1.0, Platoon Splits (LHB vs RHB).
 *    - MLB: Distribución de velocidades, Strike Zone 3x3 con home plate, Short-Form Breaks (iVB vs HB).
 * 5. Tabla Inferior: Repertorio Hawk-Eye coloreado por tipo de pitcheo (MLB) o destinos PBP (LVBP).
 * 6. Pie de Página: Doble bloque oficial de atribución a @republicaraquista • Jorge Leonardo Loreto
 *    y "Diseño inspirado en Thomas Nestico (@TJStats)".
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

  // 1. Fondo Blanco Pulcro (Estilo canónico Thomas Nestico / Matplotlib)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);

  // 2. Cabecera (y: 60 a 240)
  const headerY = 70;

  // Avatar Circular oficial (ax_headshot)
  try {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = pitcher.photoUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    ctx.save();
    ctx.beginPath();
    ctx.arc(175, headerY + 85, 85, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#F1F5F9";
    ctx.fillRect(90, headerY, 170, 170);
    ctx.drawImage(img, 90, headerY, 170, 170);
    ctx.restore();

    // Borde circular sutil
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(175, headerY + 85, 85, 0, Math.PI * 2);
    ctx.stroke();
  } catch {
    ctx.fillStyle = "#F1F5F9";
    ctx.beginPath();
    ctx.arc(175, headerY + 85, 85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Biografía (ax_bio)
  ctx.fillStyle = "#070B19";
  ctx.font = "900 52px Inter, system-ui, sans-serif";
  ctx.fillText(pitcher.name, 290, headerY + 52);

  ctx.fillStyle = "#475569";
  ctx.font = "bold 26px Inter, system-ui, sans-serif";
  const teamName = pitcher.lvbpTeamName || pitcher.team;
  const bio = `${teamName.toUpperCase()} • ${pitcher.position} (${pitcher.throws}HP) • #${pitcher.id}`;
  ctx.fillText(bio, 290, headerY + 92);

  // Subtítulo 1 y 2
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 26px Inter, sans-serif";
  let sub1 = "";
  let sub2 = "";

  const isSeason = data.timeMode === "season";
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
      sub1 = `LVBP • ${phaseTxt}`;
      sub2 = `${teamName} | Temporada ${gameLog.date.replace("Temporada ", "") || "2025"}`;
    } else {
      sub1 = `LVBP • ${teamName} vs ${gameLog.opponent}`;
      sub2 = `Fecha: ${gameLog.date} (${gameLog.role}${gameLog.decision ? ` • Decisión: ${gameLog.decision}` : ""})`;
    }
  } else {
    if (isSeason) {
      sub1 = "MLB • Resumen de Temporada Completa";
      sub2 = `${pitcher.team} | Temporada ${gameLog.date.replace("Temporada ", "") || "2024"}`;
    } else {
      sub1 = `MLB • Salida Individual vs ${gameLog.opponent}`;
      sub2 = `Fecha: ${gameLog.date} (${gameLog.role}${gameLog.decision ? ` • Decisión: ${gameLog.decision}` : ""})`;
    }
  }

  ctx.fillText(sub1, 290, headerY + 130);
  ctx.fillStyle = "#64748B";
  ctx.font = "500 22px Inter, monospace";
  ctx.fillText(sub2, 290, headerY + 165);

  // Logo Oficial República Caraquista (ax_logo)
  try {
    const logoImg = new window.Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.src = "/assets/logo.png";
    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = resolve;
    });

    const logoSize = 160;
    const logoX = size - 90 - logoSize;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(logoX, headerY + 5, logoSize, logoSize, 20);
    ctx.clip();
    ctx.fillStyle = "#0D152B";
    ctx.fillRect(logoX, headerY + 5, logoSize, logoSize);
    ctx.drawImage(logoImg, logoX + 10, headerY + 15, logoSize - 20, logoSize - 20);
    ctx.restore();

    ctx.strokeStyle = "#FDB827";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(logoX, headerY + 5, logoSize, logoSize, 20);
    ctx.stroke();
  } catch {
    const logoSize = 160;
    const logoX = size - 90 - logoSize;
    ctx.fillStyle = "#0D152B";
    ctx.beginPath();
    ctx.roundRect(logoX, headerY + 5, logoSize, logoSize, 20);
    ctx.fill();
    ctx.fillStyle = "#FDB827";
    ctx.font = "900 24px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("REPÚBLICA", logoX + logoSize / 2, headerY + 75);
    ctx.fillText("CARAQUISTA", logoX + logoSize / 2, headerY + 105);
    ctx.textAlign = "left";
  }

  // 3. Barra Resumen de Métricas (ax_season_table / ax_summary_table) (y: 270 a 380)
  const tblX = 90;
  const tblY = 270;
  const tblW = size - 180;
  const tblHeaderH = 46;
  const tblValH = 64;

  const cols = isSeason
    ? ["IP", "JUEGOS", "WHIP", "ERA", "SO (K)", "BB", "PITCHES", "CSW%", "WHIFF%"]
    : ["IP", "H", "R", "ER", "BB", "SO (K)", "PITCHES", "CSW%", "WHIFF%"];

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
        data.boxscore.whiffPct,
      ];

  const colW = tblW / cols.length;

  // Fondo y Borde de la Tabla
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(tblX, tblY, tblW, tblHeaderH + tblValH);

  for (let i = 0; i < cols.length; i++) {
    const cx = tblX + i * colW;

    // Celda Cabecera
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(cx, tblY, colW, tblHeaderH);

    ctx.fillStyle = "#FDB827";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(cols[i], cx + colW / 2, tblY + 30);

    // Celda Valor
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(cx, tblY + tblHeaderH, colW, tblValH);

    ctx.fillStyle = "#070B19";
    ctx.font = "900 28px Inter, monospace";
    ctx.fillText(vals[i], cx + colW / 2, tblY + tblHeaderH + 42);

    // Líneas divisorias verticales
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, tblY);
      ctx.lineTo(cx, tblY + tblHeaderH + tblValH);
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  ctx.textAlign = "left";

  // 4. Panel Gráfico Tríptico (y: 410 a 1250, alto: 840 px)
  const panelY = 410;
  const panelH = 840;
  const panelW = (tblW - 80) / 3; // 3 paneles con 40px de espacio entre ellos
  const gap = 40;

  const p1X = tblX;
  const p2X = tblX + panelW + gap;
  const p3X = tblX + (panelW + gap) * 2;

  // Renderizar los 3 paneles según rama
  if (branch === "lvbp") {
    // ── Panel LVBP 1: Carga por Entrada (Strikes vs Bolas) ──
    drawPanelBox(ctx, p1X, panelY, panelW, panelH, "Carga por Entrada");
    drawLvbpWorkloadPlot(ctx, p1X, panelY, panelW, panelH, data.inningsWorkload);

    // ── Panel LVBP 2: Leverage Index (Tango RE24) ──
    drawPanelBox(ctx, p2X, panelY, panelW, panelH, "Apalancamiento (Tango RE24)");
    drawLvbpLeveragePlot(ctx, p2X, panelY, panelW, panelH, data.inningsWorkload);

    // ── Panel LVBP 3: Platoon Splits (LHB vs RHB) ──
    drawPanelBox(ctx, p3X, panelY, panelW, panelH, "Platoon Splits (LHB vs RHB)");
    drawLvbpPlatoonPlot(ctx, p3X, panelY, panelW, panelH, data.splitsPlatoon);
  } else {
    // ── Panel MLB 1: Distribución de Velocidad (mph) ──
    drawPanelBox(ctx, p1X, panelY, panelW, panelH, "Distribución de Velocidad (mph)");
    drawMlbVelocityPlot(ctx, p1X, panelY, panelW, panelH, data.statcastTable);

    // ── Panel MLB 2: Strike Zone & Pitch Locations ──
    drawPanelBox(ctx, p2X, panelY, panelW, panelH, "Pitch Locations & Strike Zone");
    drawMlbStrikeZonePlot(ctx, p2X, panelY, panelW, panelH, data.pitches);

    // ── Panel MLB 3: Short-Form Pitch Breaks (iVB vs HB) ──
    drawPanelBox(ctx, p3X, panelY, panelW, panelH, "Short-Form Pitch Breaks (in)");
    drawMlbBreaksPlot(ctx, p3X, panelY, panelW, panelH, data.pitches, pitcher.throws);
  }

  // 5. Tabla Inferior (y: 1290 a 2240, alto: 950 px)
  const bottomTblY = 1290;
  const bottomTblH = 950;

  if (branch === "lvbp") {
    // Tabla PBP de Destinos de Pitcheos (Estilo canónico de caraquista-reflex)
    drawLvbpBottomTable(ctx, tblX, bottomTblY, tblW, bottomTblH, data.pbpTable);
  } else {
    // Tabla Sabermétrica de Repertorio Thomas Nestico
    drawMlbRepTable(ctx, tblX, bottomTblY, tblW, bottomTblH, data.statcastTable);
  }

  // 6. Pie de Página Oficial (y: 2280 a 2370, alto: 90 px)
  const footerY = 2300;
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tblX, footerY);
  ctx.lineTo(tblX + tblW, footerY);
  ctx.stroke();

  // Bloque Izquierdo: Branding República Caraquista
  ctx.fillStyle = "#070B19";
  ctx.font = "900 32px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("República Caraquista", tblX, footerY + 40);

  ctx.fillStyle = "#64748B";
  ctx.font = "bold 22px Inter, sans-serif";
  ctx.fillText("@republicaraquista • Jorge Leonardo Loreto", tblX, footerY + 74);

  // Bloque Derecho: Créditos canónicos a Thomas Nestico (@TJStats)
  ctx.textAlign = "right";
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 26px Inter, sans-serif";
  ctx.fillText("Diseño inspirado en Thomas Nestico (@TJStats)", tblX + tblW, footerY + 40);

  ctx.fillStyle = "#64748B";
  ctx.font = "500 22px Inter, sans-serif";
  const srcData =
    branch === "lvbp"
      ? "Data: MLB Stats API / Gameday PBP"
      : "Data: MLB Statcast / Baseball Savant";
  ctx.fillText(srcData, tblX + tblW, footerY + 74);
  ctx.textAlign = "left";

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Subrutinas de Dibujo Gráfico de Paneles (Estilo Matplotlib Thomas Nestico)
// ─────────────────────────────────────────────────────────────────────────────

function drawPanelBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string
) {
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();

  // Título del Subplot
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 24px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, x + w / 2, y + 42);
  ctx.textAlign = "left";
}

// LVBP: Workload por Entrada (Strikes abajo, Bolas arriba)
function drawLvbpWorkloadPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  workload: Array<{ inning: number; pitches: number; strikes: number; balls: number }>
) {
  if (!workload || workload.length === 0) {
    drawEmptyState(ctx, x, y, w, h, "Sin registros de carga por entrada");
    return;
  }

  const plotX = x + 70;
  const plotY = y + 70;
  const plotW = w - 100;
  const plotH = h - 160;

  const maxP = Math.max(...workload.map((wk) => wk.pitches), 25);
  const barW = Math.min(plotW / (workload.length * 1.6), 65);
  const step = plotW / workload.length;

  workload.forEach((wk, i) => {
    const bx = plotX + i * step + (step - barW) / 2;
    const strikeH = (wk.strikes / maxP) * plotH;
    const ballH = (wk.balls / maxP) * plotH;

    const baseBY = plotY + plotH;

    // Barra Strikes (Azul Marino #0F172A)
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(bx, baseBY - strikeH, barW, strikeH);

    // Barra Bolas (Dorado #FDB827)
    ctx.fillStyle = "#FDB827";
    ctx.fillRect(bx, baseBY - strikeH - ballH, barW, ballH);

    // Total Pitcheos arriba
    ctx.fillStyle = "#070B19";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(wk.pitches), bx + barW / 2, baseBY - strikeH - ballH - 8);

    // Etiqueta Entrada
    ctx.fillStyle = "#475569";
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.fillText(`Inn ${wk.inning}`, bx + barW / 2, baseBY + 28);
  });

  // Leyenda en la parte inferior
  const legY = y + h - 35;
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(x + w / 2 - 120, legY - 14, 16, 16);
  ctx.fillStyle = "#475569";
  ctx.font = "bold 18px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Strikes", x + w / 2 - 95, legY);

  ctx.fillStyle = "#FDB827";
  ctx.fillRect(x + w / 2 + 20, legY - 14, 16, 16);
  ctx.fillStyle = "#475569";
  ctx.fillText("Bolas", x + w / 2 + 45, legY);
}

// LVBP: Leverage Index Tango RE24
function drawLvbpLeveragePlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  workload: Array<{ inning: number; avgLi: number }>
) {
  if (!workload || workload.length === 0) {
    drawEmptyState(ctx, x, y, w, h, "Sin datos de Leverage Index");
    return;
  }

  const plotX = x + 80;
  const plotY = y + 80;
  const plotW = w - 120;
  const plotH = h - 170;

  const maxLi = Math.max(...workload.map((w) => w.avgLi), 2.2);
  const step = plotW / Math.max(workload.length - 1, 1);

  // Línea base de 1.0 LI (Presión Base)
  const base1Y = plotY + plotH - (1.0 / maxLi) * plotH;
  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(plotX, base1Y);
  ctx.lineTo(plotX + plotW, base1Y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#64748B";
  ctx.font = "bold 16px Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Presión Base (1.0 LI)", plotX + plotW, base1Y - 8);

  // Trazo de Curva de Apalancamiento
  ctx.strokeStyle = "#D97706";
  ctx.lineWidth = 4;
  ctx.beginPath();
  workload.forEach((w, i) => {
    const px = plotX + i * step;
    const py = plotY + plotH - (w.avgLi / maxLi) * plotH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Puntos circulares y valores numéricos
  workload.forEach((w, i) => {
    const px = plotX + i * step;
    const py = plotY + plotH - (w.avgLi / maxLi) * plotH;

    ctx.fillStyle = "#D97706";
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = "#B45309";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${w.avgLi.toFixed(2)}`, px, py - 14);

    ctx.fillStyle = "#475569";
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.fillText(`Inn ${w.inning}`, px, plotY + plotH + 28);
  });
  ctx.textAlign = "left";
}

// LVBP: Platoon Splits (LHB vs RHB)
function drawLvbpPlatoonPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  splits: PitchGameDataResponse["splitsPlatoon"]
) {
  if (!splits || (!splits.vsLhb?.pitches && !splits.vsRhb?.pitches)) {
    drawEmptyState(ctx, x, y, w, h, "Sin datos de Platoon disponibles");
    return;
  }

  const plotX = x + 70;
  const plotY = y + 90;
  const plotW = w - 100;
  const plotH = h - 180;

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

  const catW = plotW / 3;
  const barW = catW * 0.32;

  cats.forEach((cat, i) => {
    const cx = plotX + i * catW + catW / 2;
    const baseBY = plotY + plotH;

    // Barra Zurdos (#3B82F6)
    const hL = (valsL[i] / 100) * plotH;
    ctx.fillStyle = "#3B82F6";
    ctx.fillRect(cx - barW - 4, baseBY - hL, barW, hL);

    ctx.fillStyle = "#1E40AF";
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(valsL[i])}%`, cx - barW / 2 - 4, baseBY - hL - 8);

    // Barra Derechos (#F59E0B)
    const hR = (valsR[i] / 100) * plotH;
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(cx + 4, baseBY - hR, barW, hR);

    ctx.fillStyle = "#B45309";
    ctx.fillText(`${Math.round(valsR[i])}%`, cx + barW / 2 + 4, baseBY - hR - 8);

    // Etiqueta Categoría
    ctx.fillStyle = "#070B19";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.fillText(cat, cx, baseBY + 32);
  });

  // Leyenda en la parte inferior
  const legY = y + h - 35;
  const pL = splits.vsLhb.pitches || 0;
  const pR = splits.vsRhb.pitches || 0;

  ctx.fillStyle = "#3B82F6";
  ctx.fillRect(x + w / 2 - 160, legY - 14, 16, 16);
  ctx.fillStyle = "#475569";
  ctx.font = "bold 17px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`vs Zurdos (${pL} P)`, x + w / 2 - 135, legY);

  ctx.fillStyle = "#F59E0B";
  ctx.fillRect(x + w / 2 + 30, legY - 14, 16, 16);
  ctx.fillStyle = "#475569";
  ctx.fillText(`vs Derechos (${pR} P)`, x + w / 2 + 55, legY);
}

// MLB: Distribución de Velocidades
function drawMlbVelocityPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  summary: StatcastPitchRow[]
) {
  if (!summary || summary.length === 0) {
    drawEmptyState(ctx, x, y, w, h, "Sin datos de velocidad");
    return;
  }

  const plotX = x + 60;
  const plotY = y + 90;
  const plotW = w - 100;
  const plotH = h - 170;

  const valid = summary.filter((s: StatcastPitchRow) => {
    const v = typeof s.veloAvg === "number" ? s.veloAvg : parseFloat(String(s.veloAvg)) || 0;
    return v > 0;
  });
  const rowH = Math.min(plotH / Math.max(valid.length, 1), 75);

  valid.forEach((pt: StatcastPitchRow, i: number) => {
    const ry = plotY + i * rowH;
    const pColor = pt.color || getPitchColor(pt.pitchName, pt.pitchType);
    const veloNum = typeof pt.veloAvg === "number" ? pt.veloAvg : parseFloat(String(pt.veloAvg)) || 0;

    // Nombre de Pitcheo
    ctx.fillStyle = pColor;
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(pt.pitchName, plotX, ry + 24);

    // Barra de Velocidad (rango 70 a 102 mph)
    const barStartX = plotX + 220;
    const barMaxW = plotW - 220 - 90;
    const norm = Math.max(0, Math.min(1, (veloNum - 70) / 32));
    const curW = norm * barMaxW;

    ctx.fillStyle = "#F1F5F9";
    ctx.fillRect(barStartX, ry + 6, barMaxW, 24);

    ctx.fillStyle = pColor;
    ctx.fillRect(barStartX, ry + 6, curW, 24);

    // Velocidad en texto
    ctx.fillStyle = "#070B19";
    ctx.font = "900 20px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${veloNum.toFixed(1)} mph`, plotX + plotW, ry + 24);
  });
  ctx.textAlign = "left";
}

// MLB: Strike Zone & Pitch Locations (3x3 con home plate)
function drawMlbStrikeZonePlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pitches: PitchGameDataResponse["pitches"]
) {
  const cx = x + w / 2;
  const cy = y + h / 2 - 20;

  // Escala para convertir ft a píxeles
  const pxScale = 110;

  // Marco de la Zona de Strike (17 in = 1.416 ft de ancho, alto ~2.0 ft de 1.5 a 3.5 ft)
  const szW = 1.416 * pxScale;
  const szH = 2.0 * pxScale;
  const szX = cx - szW / 2;
  const szY = cy - szH / 2;

  // Home plate (polígono pentagonal abajo de la zona)
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

  // Marco Exterior Strike Zone
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 3.5;
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

  // Dibujar pitcheos scatter
  if (pitches && pitches.length > 0) {
    pitches.forEach((p) => {
      if (p.plateX == null || p.plateZ == null) return;
      const ptX = cx + p.plateX * pxScale;
      // Convertir z (altura en pies de 1.5 a 3.5 centrado en 2.5 ft)
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

// MLB: Short-Form Pitch Breaks (iVB vs HB en ±25 in)
function drawMlbBreaksPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pitches: PitchGameDataResponse["pitches"],
  throws: string
) {
  const cx = x + w / 2;
  const cy = y + h / 2 - 20;
  const radius = Math.min(w, h) * 0.38;

  // Ejes cruzados cartesianos
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.stroke();

  // Etiquetas de los ejes
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 16px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("+20\"", cx, cy - radius - 10);
  ctx.fillText("-20\"", cx, cy + radius + 22);

  // Arm Side / Glove Side
  ctx.fillText(throws === "L" ? "Arm Side" : "Glove Side", cx - radius + 40, cy - 10);
  ctx.fillText(throws === "L" ? "Glove Side" : "Arm Side", cx + radius - 40, cy - 10);

  // Dibujar puntos scatter
  if (pitches && pitches.length > 0) {
    pitches.forEach((p) => {
      if (p.hb == null || p.ivb == null) return;
      // Normalizar pulgadas a píxeles (±25 in -> radio)
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

// ─────────────────────────────────────────────────────────────────────────────
// Subrutinas de Tablas Inferiores (Estilo Matplotlib Thomas Nestico)
// ─────────────────────────────────────────────────────────────────────────────

// LVBP: Tabla de Destinos de Pitcheos
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

  const tableW = w * 0.85;
  const tableX = x + (w - tableW) / 2;
  const headerH = 55;
  const rowH = 48;

  const tCols = ["Destino del Pitcheo", "Total Conteo", "Distribución %"];
  const colWidths = [tableW * 0.48, tableW * 0.26, tableW * 0.26];

  // Marco exterior
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(tableX, y, tableW, headerH + Math.min(pbpTable.length, 14) * rowH);

  // Cabecera
  let curX = tableX;
  for (let c = 0; c < tCols.length; c++) {
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(curX, y, colWidths[c], headerH);

    ctx.fillStyle = "#FDB827";
    ctx.font = "bold 22px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(tCols[c], curX + colWidths[c] / 2, y + 36);

    if (c > 0) {
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(curX, y);
      ctx.lineTo(curX, y + headerH + Math.min(pbpTable.length, 14) * rowH);
      ctx.stroke();
    }
    curX += colWidths[c];
  }

  // Filas
  const rows = pbpTable.slice(0, 14);
  rows.forEach((r, idx) => {
    const ry = y + headerH + idx * rowH;
    const bg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";

    ctx.fillStyle = bg;
    ctx.fillRect(tableX, ry, tableW, rowH);

    ctx.fillStyle = "#070B19";
    ctx.font = "bold 20px Inter, sans-serif";

    // Destino (alineado izq con sangría)
    ctx.textAlign = "left";
    ctx.fillText(r.destination, tableX + 30, ry + 32);

    // Conteo (centrado)
    ctx.textAlign = "center";
    ctx.fillText(String(r.count), tableX + colWidths[0] + colWidths[1] / 2, ry + 32);

    // Porcentaje (centrado)
    ctx.fillText(r.pct, tableX + colWidths[0] + colWidths[1] + colWidths[2] / 2, ry + 32);

    // Línea horizontal divisoria
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX, ry + rowH);
    ctx.lineTo(tableX + tableW, ry + rowH);
    ctx.stroke();
  });
  ctx.textAlign = "left";
}

// MLB: Tabla Sabermétrica de Repertorio Thomas Nestico
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

  // Marco exterior
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2.5;
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

  // Filas individuales por lanzamiento
  summary.forEach((pt: StatcastPitchRow, idx: number) => {
    const ry = y + headerH + idx * rowH;
    const pColor = pt.color || getPitchColor(pt.pitchName, pt.pitchType);

    // Celda 1 coloreada con el color canónico del pitcheo
    ctx.fillStyle = pColor;
    ctx.fillRect(x, ry, colW, rowH);

    ctx.fillStyle = ["#67E18D", "#F79E70", "#FE6100", "#FFB000"].includes(pColor)
      ? "#070B19"
      : "#FFFFFF";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pt.pitchName, x + colW / 2, ry + 32);

    // Celdas de valores
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

  // Fila Resumen "All"
  const allY = y + headerH + summary.length * rowH;
  const totPitches = summary.reduce((acc: number, s: StatcastPitchRow) => acc + s.count, 0);
  const avgVelo =
    summary.reduce((acc: number, s: StatcastPitchRow) => {
      const v = typeof s.veloAvg === "number" ? s.veloAvg : parseFloat(String(s.veloAvg)) || 0;
      return acc + v * s.count;
    }, 0) / Math.max(totPitches, 1);
  const avgSpin = Math.round(
    summary.reduce((acc: number, s: StatcastPitchRow) => {
      const sp = typeof s.spinAvg === "number" ? s.spinAvg : parseFloat(String(s.spinAvg)) || 0;
      return acc + sp * s.count;
    }, 0) / Math.max(totPitches, 1)
  );

  // Primera celda #0F172A
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
  ctx.font = "bold 20px Inter, sans-serif";
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
