import {
  PitchGameDataResponse,
  PitcherProfile,
  PitcherGameLog,
  StatcastPitchRow,
  PBPDestinationRow,
  InningWorkloadItem,
  PlatoonSplits,
  PitchingSplitRow,
  ContactProfileSummary,
} from "@/types/pitching";
import {
  getPitchColor,
  getMetricCellShade,
} from "@/lib/pitching-constants";
import { LVBP_TEAMS, getMlbFallbackHeadshotUrl } from "@/lib/constants";
import { hasLocalPlayerPhoto } from "@/lib/player-photos-data";

/**
 * Motor Gráfico Editorial de Pitching Summary en HTML5 Canvas para República Caraquista.
 * Lienzo vertical de alta definición: 2400 x 3200 px (proporción 3:4 a 300 DPI) sobre blanco #FFFFFF.
 * Soporta Salida Individual ('game') y Temporada Completa ('season') para LVBP y MLB.
 */

export const CANVAS_W = 2400;
export const CANVAS_H = 3200;

async function tryLoadImage(url: string, useCors: boolean): Promise<HTMLImageElement | null> {
  if (!url) return null;
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
 * 1) Asset local RGBA mismo origen (/assets/players/{id}.png)
 * 2) photoUrl primaria con crossOrigin="anonymous"
 * 3) Fallback oficial Cloudinary MLB con crossOrigin="anonymous"
 */
async function loadCorsSafePitcherHeadshot(
  pitcher: PitcherProfile,
  mlbFallbackFromData?: string
): Promise<HTMLImageElement | null> {
  const candidates: Array<{ url: string; cors: boolean }> = [];
  if (hasLocalPlayerPhoto(pitcher.id)) {
    candidates.push({ url: `/assets/players/${pitcher.id}.png`, cors: false });
  }
  if (pitcher.photoUrl) {
    const isSameOrigin = pitcher.photoUrl.startsWith("/");
    candidates.push({ url: pitcher.photoUrl, cors: !isSameOrigin });
  }
  const mlbUrl =
    mlbFallbackFromData ||
    pitcher.mlbPhotoUrl ||
    getMlbFallbackHeadshotUrl(pitcher.id);
  if (mlbUrl && !candidates.some((c) => c.url === mlbUrl)) {
    candidates.push({ url: mlbUrl, cors: true });
  }

  for (const cand of candidates) {
    const loaded = await tryLoadImage(cand.url, cand.cors);
    if (loaded) return loaded;
  }
  return null;
}

function parseNum(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = String(raw).replace(/[%+,★A-Za-z\s()]/g, "").trim();
  if (!cleaned || cleaned === "—" || cleaned === "-") return null;
  const normalized = cleaned.startsWith(".") ? `0${cleaned}` : cleaned.startsWith("-.") ? `-0${cleaned.slice(1)}` : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatSigned(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return "—";
  const prefix = val > 0 ? "+" : "";
  return `${prefix}${val.toFixed(decimals)}`;
}

interface KpiCellDef {
  label: string;
  value: string;
  metricKey?: string;
  numericValue?: number | null;
}

function drawKpiRowTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  headerH: number,
  valH: number,
  cells: KpiCellDef[]
) {
  const totalH = headerH + valH;
  const colW = w / cells.length;

  for (let i = 0; i < cells.length; i++) {
    const cx = x + i * colW;
    const cell = cells[i];

    // Header
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(cx, y, colW, headerH);

    ctx.fillStyle = "#FDB827";
    ctx.font = cells.length >= 10 ? "bold 19px Inter, sans-serif" : "bold 21px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(cell.label, cx + colW / 2, y + Math.round(headerH * 0.66));

    // Semantic cell body
    const shade = cell.metricKey
      ? getMetricCellShade(cell.metricKey, cell.numericValue ?? parseNum(cell.value))
      : { bg: "#FFFFFF", fg: "#0F172A", border: "#CBD5E1", tier: "neutral" as const };

    ctx.fillStyle = shade.bg;
    ctx.fillRect(cx, y + headerH, colW, valH);

    ctx.fillStyle = shade.fg;
    const valLen = cell.value.length;
    const fontSize =
      valLen > 11 ? 21 : valLen >= 9 ? 23 : cells.length >= 10 ? 27 : 29;
    ctx.font = `900 ${fontSize}px Inter, sans-serif`;
    ctx.fillText(cell.value, cx + colW / 2, y + headerH + Math.round(valH * 0.63), colW - 14);

    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx, y + totalH);
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.beginPath();
  ctx.moveTo(x, y + headerH);
  ctx.lineTo(x + w, y + headerH);
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, totalH);
  ctx.textAlign = "left";
}

export async function renderPitchingCardToCanvas(
  canvas: HTMLCanvasElement,
  data: PitchGameDataResponse,
  pitcher: PitcherProfile,
  gameLog: PitcherGameLog,
  branch: "lvbp" | "mlb",
  gameLogs: PitcherGameLog[] = []
): Promise<boolean> {
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  // 1. Fondo Blanco Editorial (#FFFFFF)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Franja institucional superior sutil (Navy + Oro Caraquista)
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, CANVAS_W, 12);
  ctx.fillStyle = "#FDB827";
  ctx.fillRect(0, 12, CANVAS_W, 5);

  const tblX = 80;
  const tblW = CANVAS_W - 160; // 2240 px
  const centerX = CANVAS_W / 2; // 1200 px

  const isSeason = data.timeMode === "season";
  const bx = data.boxscore;
  const ctxMet = data.contextMetrics;

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Cabecera Institucional (y: 44 a 364 px)
  // ───────────────────────────────────────────────────────────────────────────
  const headshotX = 80;
  const headshotY = 44;
  const headshotW = 290;
  const headshotH = 320;

  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(headshotX, headshotY, headshotW, headshotH);

  const portraitImg = await loadCorsSafePitcherHeadshot(pitcher, data.mlbPhotoUrl);
  if (portraitImg) {
    const imgAspect =
      (portraitImg.naturalWidth || portraitImg.width || 1) /
      (portraitImg.naturalHeight || portraitImg.height || 1);
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

    ctx.save();
    ctx.beginPath();
    ctx.rect(headshotX, headshotY, headshotW, headshotH);
    ctx.clip();
    ctx.drawImage(portraitImg, drawX, drawY, drawW, drawH);
    ctx.restore();
  } else {
    // Silueta / iniciales vectoriales sin contaminar CORS
    ctx.fillStyle = "#0F172A";
    ctx.beginPath();
    ctx.arc(headshotX + headshotW / 2, headshotY + 135, 58, 0, Math.PI * 2);
    ctx.fill();
    const initials = pitcher.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || "")
      .join("");
    ctx.fillStyle = "#FDB827";
    ctx.font = "900 44px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(initials || "P", headshotX + headshotW / 2, headshotY + 150);
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.fillText(`${pitcher.throws || "R"}HP`, headshotX + headshotW / 2, headshotY + 250);
  }

  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.strokeRect(headshotX, headshotY, headshotW, headshotH);

  // Textos centrales
  const teamLabel = pitcher.lvbpTeamName || pitcher.team || "LVBP";
  const oppClean = gameLog.opponent || "Rival";
  const seasonNum =
    String(data.effectiveSeason || "") ||
    gameLog.date.replace("Temporada ", "").split("-")[0] ||
    "2025";
  const roleLabel =
    isSeason
      ? data.isStarter
        ? "Rotación Abridora"
        : "Relevo / Bullpen"
      : gameLog.role || (data.isStarter ? "Abridor" : "Relevista");

  let sub1 = "";
  let sub2 = "";

  if (branch === "lvbp") {
    if (isSeason) {
      const phaseTxt =
        gameLog.phase === "R"
          ? "Ronda Regular"
          : gameLog.phase === "L"
          ? "Round Robin"
          : gameLog.phase === "F"
          ? "Serie Final"
          : "Temporada Completa";
      sub1 = `LVBP • ${teamLabel} (${phaseTxt})`;
      sub2 = `Temporada ${seasonNum} • ${data.gamesCount || gameLogs.length || 0} Apariciones Registradas`;
    } else {
      const decTxt = data.decision || gameLog.decision;
      const decSuffix = decTxt ? ` • Decisión: ${decTxt}` : "";
      sub1 = `LVBP • ${teamLabel} vs ${oppClean}`;
      sub2 = `Fecha: ${gameLog.date} • Rol: ${roleLabel}${decSuffix}`;
    }
  } else {
    if (isSeason) {
      sub1 = `MLB • ${pitcher.team || "Grandes Ligas"}`;
      sub2 = `Temporada ${seasonNum} • Consolidado Oficial (${data.gamesCount || gameLogs.length || 0} JJ)`;
    } else {
      const decTxt = data.decision || gameLog.decision;
      const decSuffix = decTxt ? ` • Decisión: ${decTxt}` : "";
      sub1 = `MLB • ${pitcher.team || "Grandes Ligas"} vs ${oppClean}`;
      sub2 = `Fecha: ${gameLog.date} • Rol: ${roleLabel}${decSuffix}`;
    }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#070B19";
  ctx.font = pitcher.name.length > 22 ? "900 56px Inter, sans-serif" : "900 66px Inter, sans-serif";
  ctx.fillText(pitcher.name, centerX, 114);

  const bioParts: string[] = [`${pitcher.throws || "R"}HP`, roleLabel];
  if (pitcher.age) bioParts.push(`Edad: ${pitcher.age}`);
  if (pitcher.height && pitcher.weight) {
    bioParts.push(`${pitcher.height} / ${pitcher.weight} lbs`);
  } else if (pitcher.height) {
    bioParts.push(pitcher.height);
  }
  ctx.fillStyle = "#475569";
  ctx.font = "bold 25px Inter, sans-serif";
  ctx.fillText(bioParts.join("  •  "), centerX, 172);

  ctx.fillStyle = "#B45309";
  ctx.font = "bold 29px Inter, sans-serif";
  ctx.fillText(sub1, centerX, 240);

  ctx.fillStyle = "#64748B";
  ctx.font = "italic 23px Inter, sans-serif";
  ctx.fillText(sub2, centerX, 294);

  // Badge de franquicia / modo centrado bajo subtítulos
  const badgeText =
    branch === "lvbp"
      ? isSeason
        ? `REPORTE DE TEMPORADA LVBP • PBP & CONTACTO BIS`
        : `REPORTE DE SALIDA INDIVIDUAL LVBP • PBP & CONTACTO BIS`
      : isSeason
      ? `REPORTE DE TEMPORADA MLB • TELEMETRÍA HAWK-EYE`
      : `REPORTE DE SALIDA INDIVIDUAL MLB • TELEMETRÍA HAWK-EYE`;
  const badgeW = 690;
  ctx.fillStyle = "#F1F5F9";
  ctx.fillRect(centerX - badgeW / 2, 316, badgeW, 40);
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(centerX - badgeW / 2, 316, badgeW, 40);
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 17px Inter, sans-serif";
  ctx.fillText(badgeText, centerX, 342);

  // Logo República Caraquista a la derecha
  const logoCenterX = CANVAS_W - 80 - 145;
  const logoCenterY = 162;
  const logoImg = await tryLoadImage("/assets/logo.png", false);
  if (logoImg) {
    const logoRadius = 74;
    ctx.drawImage(
      logoImg,
      logoCenterX - logoRadius,
      logoCenterY - logoRadius,
      logoRadius * 2,
      logoRadius * 2
    );
  } else {
    ctx.fillStyle = "#0D152B";
    ctx.beginPath();
    ctx.arc(logoCenterX, logoCenterY, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FDB827";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.fillStyle = "#B45309";
  ctx.font = "900 16px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("REPÚBLICA CARAQUISTA", logoCenterX, 266);

  if (branch === "lvbp" && pitcher.lvbpTeamId && LVBP_TEAMS[pitcher.lvbpTeamId]) {
    const club = LVBP_TEAMS[pitcher.lvbpTeamId];
    ctx.fillStyle = club.primaryColor || "#0F172A";
    ctx.fillRect(logoCenterX - 95, 284, 190, 34);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillText(`${club.abbreviation} • LVBP`, logoCenterX, 307);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Doble Barra KPI con Sombreado Semántico (y: 394 a 732 px)
  // ───────────────────────────────────────────────────────────────────────────
  const pitchesStr = `${bx.pitches} (${bx.strikes}S)`;
  const strikePctDisplay =
    bx.strikePct ||
    (bx.pitches > 0 ? `${((bx.strikes / bx.pitches) * 100).toFixed(1)}%` : "0.0%");

  if (!isSeason) {
    const gsv2Val = bx.gsv2 ?? ctxMet?.gsv2 ?? null;
    const isQs = Boolean(bx.isQS ?? ctxMet?.isQS);
    const roleCell: KpiCellDef = data.isStarter
      ? {
          label: isQs ? "GSv2 (QS)" : "GSv2",
          value: gsv2Val !== null ? (isQs ? `${gsv2Val} ★` : String(gsv2Val)) : "—",
          metricKey: "gsv2",
          numericValue: gsv2Val,
        }
      : {
          label: "IR / IRS",
          value: `${bx.ir ?? ctxMet?.ir ?? 0} / ${bx.irs ?? ctxMet?.irs ?? 0}`,
        };

    const row1: KpiCellDef[] = [
      { label: "IP", value: bx.ip || "0.0" },
      { label: "BF", value: String(bx.bf ?? "—") },
      { label: "H", value: String(bx.h) },
      { label: "R / CL", value: `${bx.r} / ${bx.er}` },
      { label: "BB", value: String(bx.bb) },
      { label: "SO (K)", value: String(bx.so) },
      { label: "HR", value: String(bx.hr ?? 0) },
      { label: "P (Strikes)", value: pitchesStr },
      {
        label: "Strike%",
        value: strikePctDisplay,
        metricKey: "strikePct",
        numericValue: parseNum(strikePctDisplay),
      },
    ];

    const row2: KpiCellDef[] = [
      roleCell,
      {
        label: "WPA",
        value: formatSigned(ctxMet?.wpa, 3),
        metricKey: "wpa",
        numericValue: ctxMet?.wpa ?? null,
      },
      {
        label: "RE24",
        value: formatSigned(ctxMet?.re24, 2),
        metricKey: "re24",
        numericValue: ctxMet?.re24 ?? null,
      },
      {
        label: "aLI (gmLI)",
        value: ctxMet
          ? `${ctxMet.aLI.toFixed(2)} (${ctxMet.gmLI.toFixed(2)})`
          : "1.00",
      },
      {
        label: "F-Strike%",
        value: bx.fStrikePct || data.pbpKpis.fpsPct || "0.0%",
        metricKey: "fStrikePct",
      },
      { label: "CSW%", value: bx.cswPct, metricKey: "cswPct" },
      { label: "Whiff%", value: bx.whiffPct, metricKey: "whiffPct" },
      {
        label: "SwStr%",
        value: bx.swStrPct || data.pbpKpis.swStrPct || "0.0%",
        metricKey: "swStrPct",
      },
      {
        label: "PutAway%",
        value: bx.putAwayPct || data.pbpKpis.putAwayPct || "0.0%",
        metricKey: "putAwayPct",
      },
    ];

    drawKpiRowTable(ctx, tblX, 384, tblW, 48, 72, row1);
    drawKpiRowTable(ctx, tblX, 516, tblW, 48, 72, row2);

    // Tira contextual compacta del partido (y: 636..680)
    drawContextBanner(
      ctx,
      tblX,
      650,
      tblW,
      42,
      data.isStarter
        ? `ROL DEL PARTIDO: ABRIDOR  •  GAME SCORE v2: ${gsv2Val ?? "—"}${
            isQs ? " (SALIDA DE CALIDAD • QS)" : ""
          }  •  K-BB%: ${bx.kMinusBbPct || "—"}  •  RODADOS / ELEVADOS (GO-AO): ${
            bx.go ?? 0
          }-${bx.ao ?? 0}`
        : `ROL DEL PARTIDO: RELEVISTA  •  LI AL ENTRAR (gmLI): ${
            ctxMet?.gmLI.toFixed(2) ?? "1.00"
          }  •  HEREDADOS (IR / IRS): ${bx.ir ?? 0} / ${bx.irs ?? 0}  •  K-BB%: ${
            bx.kMinusBbPct || "—"
          }`
    );
  } else {
    const jjTxt = `${bx.gamesPlayed ?? data.gamesCount ?? gameLogs.length} (${
      bx.gamesStarted ?? ctxMet?.gsCount ?? 0
    } GS)`;
    const row1: KpiCellDef[] = [
      { label: "JJ (GS)", value: jjTxt },
      { label: "RÉCORD", value: data.decision || "0-0" },
      { label: "IP", value: bx.ip || "0.0" },
      { label: "TBF", value: String(bx.bf ?? "—") },
      { label: "ERA", value: bx.era || "0.00", metricKey: "era" },
      { label: "WHIP", value: bx.whip || "0.00", metricKey: "whip" },
      { label: "FIP", value: bx.fip || "—", metricKey: "fip" },
      {
        label: "ERA-",
        value: bx.eraMinus !== null && bx.eraMinus !== undefined ? String(bx.eraMinus) : "—",
        metricKey: "eraMinus",
        numericValue: bx.eraMinus ?? null,
      },
      { label: "SO / BB", value: `${bx.so} / ${bx.bb}` },
      { label: "HR", value: String(bx.hr ?? 0) },
    ];

    const row2: KpiCellDef[] = [
      { label: "K%", value: bx.kPct || "—", metricKey: "kPct" },
      { label: "BB%", value: bx.bbPct || "—", metricKey: "bbPct" },
      { label: "K-BB%", value: bx.kMinusBbPct || "—", metricKey: "kMinusBbPct" },
      {
        label: "BABIP",
        value: bx.babip || "—",
        metricKey: "babip",
        numericValue: bx.babip && bx.babip !== "—" ? Number(`0${bx.babip}`) : null,
      },
      { label: "LOB%", value: bx.lobPct || "—", metricKey: "lobPct" },
      {
        label: "BAA / OPS",
        value: `${bx.baa || "—"} / ${bx.opsAgainst || "—"}`,
        metricKey: "opsAgainst",
        numericValue:
          bx.opsAgainst && bx.opsAgainst !== "—"
            ? Number(bx.opsAgainst.startsWith(".") ? `0${bx.opsAgainst}` : bx.opsAgainst)
            : null,
      },
      {
        label: "F-Strike%",
        value: bx.fStrikePct || data.pbpKpis.fpsPct || "0.0%",
        metricKey: "fStrikePct",
      },
      { label: "CSW%", value: bx.cswPct, metricKey: "cswPct" },
      { label: "Whiff%", value: bx.whiffPct, metricKey: "whiffPct" },
      {
        label: "WPA / RE24",
        value: `${formatSigned(ctxMet?.wpa, 2)} / ${formatSigned(ctxMet?.re24, 1)}`,
        metricKey: "wpa",
        numericValue: ctxMet?.wpa ?? null,
      },
    ];

    drawKpiRowTable(ctx, tblX, 384, tblW, 48, 72, row1);
    drawKpiRowTable(ctx, tblX, 516, tblW, 48, 72, row2);

    const roleBannerText = data.isStarter
      ? `VALOR DE ABRIDOR:  SALIDAS DE CALIDAD (QS): ${ctxMet?.qsCount ?? 0} de ${
          ctxMet?.gsCount ?? 0
        }  •  GSv2 PROMEDIO: ${ctxMet?.avgGsv2 ?? "—"}  •  PITCHEOS: ${pitchesStr}  •  PUTAWAY%: ${
          bx.putAwayPct || data.pbpKpis.putAwayPct || "—"
        }`
      : `VALOR DE RELEVO:  CORREDORES HEREDADOS (IR / IRS): ${ctxMet?.ir ?? 0} / ${
          ctxMet?.irs ?? 0
        } (${ctxMet?.irsPct !== null && ctxMet?.irsPct !== undefined ? `${ctxMet.irsPct}%` : "0.0%"})  •  SHUTDOWNS / MELTDOWNS (SD / MD): ${
          ctxMet?.shutdowns ?? 0
        } / ${ctxMet?.meltdowns ?? 0}  •  aLI: ${ctxMet?.aLI.toFixed(2) ?? "1.00"}`;

    drawContextBanner(ctx, tblX, 650, tblW, 42, roleBannerText);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Tríptico Gráfico Central (y: 748 a 1368 px | 3 paneles de 700 x 620 px)
  // ───────────────────────────────────────────────────────────────────────────
  const panelY = 758;
  const panelH = 600;
  const panelW = 700;
  const gap = 70; // 700*3 + 70*2 = 2240 == tblW

  const p1X = tblX;
  const p2X = tblX + panelW + gap;
  const p3X = tblX + (panelW + gap) * 2;

  if (branch === "lvbp") {
    if (isSeason && gameLogs && gameLogs.length > 0) {
      const sortedLogs = [...gameLogs].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const plotLogs = sortedLogs.slice(-10);

      drawLvbpSeasonPitchesPlot(ctx, p1X, panelY, panelW, panelH, plotLogs);
      drawLvbpSeasonWhiffPlot(ctx, p2X, panelY, panelW, panelH, plotLogs);
      drawLvbpSeasonCswPlot(ctx, p3X, panelY, panelW, panelH, plotLogs);
    } else {
      drawLvbpWorkloadPlot(ctx, p1X, panelY, panelW, panelH, data.inningsWorkload);
      drawLvbpLeveragePlot(ctx, p2X, panelY, panelW, panelH, data.inningsWorkload);
      drawLvbpPlatoonPlot(ctx, p3X, panelY, panelW, panelH, data.splitsPlatoon);
    }
  } else {
    drawMlbVelocityPlot(ctx, p1X, panelY, panelW, panelH, data.statcastTable);
    drawMlbStrikeZonePlot(ctx, p2X, panelY, panelW, panelH, data.pitches);
    drawMlbBreaksPlot(ctx, p3X, panelY, panelW, panelH, data.pitches, pitcher.throws);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Bloque Analítico Medio (y: 1465 a 2115 px | h: 650 px)
  // ───────────────────────────────────────────────────────────────────────────
  const midY = 1465;
  const midH = 650;

  if (branch === "lvbp") {
    if (!isSeason) {
      // Izquierda: Destinos del Pitcheo PBP | Derecha: Perfil de Contacto BIS Permitido
      const leftW = 1090;
      const rightW = 1090;
      const midGap = 60;
      drawPbpDestinationsCard(ctx, tblX, midY, leftW, midH, data.pbpTable, data.pbpKpis);
      drawBisContactCard(
        ctx,
        tblX + leftW + midGap,
        midY,
        rightW,
        midH,
        data.contactProfile,
        "PERFIL DE CONTACTO PERMITIDO (MODELO BIS)"
      );
    } else {
      // Temporada LVBP: Izquierda Splits Acumulados | Derecha Contacto BIS de Temporada
      const leftW = 1270;
      const rightW = 920;
      const midGap = 50;
      drawSplitsTableCard(
        ctx,
        tblX,
        midY,
        leftW,
        midH,
        data.situationalSplits || [],
        "SPLITS SITUACIONALES ACUMULADOS DE TEMPORADA",
        true
      );
      drawBisContactCard(
        ctx,
        tblX + leftW + midGap,
        midY,
        rightW,
        midH,
        data.contactProfile,
        "CONTACTO PERMITIDO BIS (TEMPORADA)"
      );
    }
  } else {
    // MLB: Tabla Completa de Repertorio Hawk-Eye enriquecida + Barra de Calidad de Contacto Óptico
    drawMlbArsenalAndOpticalCard(
      ctx,
      tblX,
      midY,
      tblW,
      midH,
      data.statcastTable,
      data.contactProfile,
      data.pbpKpis
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Bloque Profundo Inferior (y: 2195 a 2995 px | h: 800 px)
  // ───────────────────────────────────────────────────────────────────────────
  const botY = 2195;
  const botH = 800;

  if (!isSeason) {
    // Modo Salida Individual (LVBP y MLB): Splits del Partido + Vueltas al Orden (TTO) / Contexto Relevo
    drawSplitsTableCard(
      ctx,
      tblX,
      botY,
      tblW,
      380,
      data.situationalSplits || [],
      "SPLITS SITUACIONALES DEL PARTIDO (RESULTADOS Y DOMINIO PBP)",
      false
    );

    const ttoRows = data.ttoSplits || [];
    const hasSecondTto = ttoRows.some((r) => r.key !== "tto1" && r.bf > 0);
    if (data.isStarter || hasSecondTto) {
      drawSplitsTableCard(
        ctx,
        tblX,
        botY + 420,
        tblW,
        370,
        ttoRows,
        "RENDIMIENTO POR VUELTA AL ORDEN AL BATE (TIMES THROUGH THE ORDER • TTO)",
        false
      );
    } else {
      drawRelieverDeepDiveCard(ctx, tblX, botY + 420, tblW, 370, data);
    }
  } else {
    // Modo Temporada Completa (LVBP y MLB): Historial de Últimos 10 Juegos con PBP 100% Real
    const sortedDesc = [...gameLogs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const displayLogs = sortedDesc.slice(0, 10);
    drawSeasonHistoryRealPbpTable(ctx, tblX, botY + 28, tblW, botH - 28, displayLogs);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Pie Editorial Oficial (y: 3045 a 3155 px) — CERO jerga prohibida
  // ───────────────────────────────────────────────────────────────────────────
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tblX, 3035);
  ctx.lineTo(tblX + tblW, 3035);
  ctx.stroke();

  ctx.fillStyle = "#070B19";
  ctx.font = "900 26px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("República Caraquista", tblX, 3082);

  ctx.fillStyle = "#64748B";
  ctx.font = "600 19px Inter, sans-serif";
  ctx.fillText(
    "Jorge Leonardo Loreto • @JorgeLoreto • @RepubCaraquista",
    tblX,
    3118
  );

  ctx.fillStyle = "#475569";
  ctx.font = "italic 20px Inter, sans-serif";
  ctx.textAlign = "center";
  const centerFooter =
    branch === "lvbp"
      ? "Play-by-Play Oficial • Matriz RE24 / WPA & Clasificación de Contacto BIS"
      : "Telemetría Óptica Hawk-Eye • Matriz RE24 / WPA & Disciplina de Zona";
  ctx.fillText(centerFooter, centerX, 3100);

  ctx.textAlign = "right";
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 21px Inter, sans-serif";
  ctx.fillText("Diseño inspirado en Thomas Nestico (@TJStats)", tblX + tblW, 3082);

  ctx.fillStyle = "#64748B";
  ctx.font = "600 18px Inter, sans-serif";
  const srcData =
    branch === "lvbp"
      ? "Data: MLB Stats API / Gameday PBP • Lienzo 2400×3200 px (300 DPI)"
      : "Data: MLB Stats API / Hawk-Eye • Lienzo 2400×3200 px (300 DPI)";
  ctx.fillText(srcData, tblX + tblW, 3118);
  ctx.textAlign = "left";

  return true;
}

export async function generatePitchingCardBlob(
  data: PitchGameDataResponse,
  pitcher: PitcherProfile,
  gameLog: PitcherGameLog,
  branch: "lvbp" | "mlb",
  gameLogs: PitcherGameLog[] = []
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const ok = await renderPitchingCardToCanvas(
    canvas,
    data,
    pitcher,
    gameLog,
    branch,
    gameLogs
  );
  if (!ok) return null;

  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch (err) {
      console.error("Error exportando PNG desde canvas:", err);
      resolve(null);
    }
  });
}

function drawContextBanner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string
) {
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, x + w / 2, y + Math.round(h * 0.66), w - 36);
  ctx.textAlign = "left";
}

function drawSectionHeaderBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string
) {
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#FDB827";
  ctx.fillRect(x, y, 8, h);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 21px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title, x + 24, y + Math.round(h * 0.66));
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloque Medio LVBP: Destinos PBP + Perfil de Contacto BIS
// ─────────────────────────────────────────────────────────────────────────────

function drawPbpDestinationsCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pbpTable: PBPDestinationRow[],
  kpis: PitchGameDataResponse["pbpKpis"]
) {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  const headH = 54;
  drawSectionHeaderBar(
    ctx,
    x,
    y,
    w,
    headH,
    "DESTINOS DEL PITCHEO (PLAY-BY-PLAY OFICIAL)"
  );

  if (!pbpTable || pbpTable.length === 0) {
    drawEmptyState(ctx, x, y + headH, w, h - headH, "Sin pitcheos detallados");
    return;
  }

  const subHeadY = y + headH;
  const subHeadH = 46;
  ctx.fillStyle = "#F1F5F9";
  ctx.fillRect(x + 2, subHeadY, w - 4, subHeadH);

  ctx.fillStyle = "#334155";
  ctx.font = "bold 18px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Resultado / Destino", x + 28, subHeadY + 30);
  ctx.textAlign = "center";
  ctx.fillText("Conteo", x + w * 0.52, subHeadY + 30);
  ctx.fillText("% Total", x + w * 0.67, subHeadY + 30);
  ctx.fillText("Proporción", x + w * 0.85, subHeadY + 30);

  const rows = pbpTable.slice(0, 5);
  const bodyTop = subHeadY + subHeadH;
  const footerSummaryH = 74;
  const rowH = Math.floor((h - headH - subHeadH - footerSummaryH) / Math.max(rows.length, 1));

  rows.forEach((r, idx) => {
    const ry = bodyTop + idx * rowH;
    ctx.fillStyle = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
    ctx.fillRect(x + 2, ry, w - 4, rowH);

    // Dot de color
    ctx.fillStyle = r.color || "#0F172A";
    ctx.beginPath();
    ctx.arc(x + 34, ry + rowH / 2, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 21px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(r.destination, x + 56, ry + rowH / 2 + 8);

    ctx.font = "900 23px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(r.count), x + w * 0.52, ry + rowH / 2 + 8);
    ctx.fillText(r.pct, x + w * 0.67, ry + rowH / 2 + 8);

    // Barra proporcional
    const pctNum = parseNum(r.pct) ?? 0;
    const barX = x + w * 0.75;
    const barMaxW = w * 0.21;
    const barH = 22;
    const barY = ry + (rowH - barH) / 2;

    ctx.fillStyle = "#E2E8F0";
    ctx.fillRect(barX, barY, barMaxW, barH);
    ctx.fillStyle = r.color || "#0F172A";
    ctx.fillRect(barX, barY, Math.min(barMaxW, (pctNum / 60) * barMaxW), barH);

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, ry + rowH);
    ctx.lineTo(x + w, ry + rowH);
    ctx.stroke();
  });

  // Pie resumen de conteo de 2 strikes y swings
  const sumY = y + h - footerSummaryH;
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(x + 2, sumY, w - 4, footerSummaryH - 2);
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, sumY);
  ctx.lineTo(x + w, sumY);
  ctx.stroke();

  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 19px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `Swings Totales: ${kpis.swings}  •  Pitcheos en 2 Strikes: ${
      kpis.twoStrikePitches ?? 0
    }  •  Ponches en 2S (PutAway): ${kpis.twoStrikeK ?? 0} (${kpis.putAwayPct || "0.0%"})`,
    x + w / 2,
    sumY + 44
  );
  ctx.textAlign = "left";
}

function drawBisContactCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  contact: ContactProfileSummary | undefined,
  title: string
) {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  const headH = 54;
  drawSectionHeaderBar(ctx, x, y, w, headH, title);

  if (!contact || contact.bip === 0) {
    drawEmptyState(
      ctx,
      x,
      y + headH,
      w,
      h - headH,
      "Sin bolas puestas en juego registradas"
    );
    return;
  }

  const pad = 28;
  const innerW = w - pad * 2;

  // Subtítulo Trayectoria de Batazos
  ctx.fillStyle = "#334155";
  ctx.font = "bold 19px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    `1. DISTRIBUCIÓN DE TRAYECTORIA (${contact.bip} BOLAS EN JUEGO • GO/AO: ${contact.goAoRatio})`,
    x + pad,
    y + headH + 40
  );

  const trajItems = [
    {
      label: "Rodados (GB%)",
      val: `${contact.gbPct.toFixed(1)}%`,
      sub: `${contact.gb} batazos`,
      shade: getMetricCellShade("gbPct", contact.gbPct),
    },
    {
      label: "Líneas (LD%)",
      val: `${contact.ldPct.toFixed(1)}%`,
      sub: `${contact.ld} batazos`,
      shade: { bg: "#F8FAFC", fg: "#0F172A", border: "#CBD5E1", tier: "neutral" as const },
    },
    {
      label: "Elevados (FB%)",
      val: `${contact.fbPct.toFixed(1)}%`,
      sub: `${contact.fb} batazos`,
      shade: { bg: "#F8FAFC", fg: "#0F172A", border: "#CBD5E1", tier: "neutral" as const },
    },
    {
      label: "Infield Fly (PU%)",
      val: `${contact.puPct.toFixed(1)}%`,
      sub: `${contact.pu} batazos`,
      shade: { bg: "#F8FAFC", fg: "#0F172A", border: "#CBD5E1", tier: "neutral" as const },
    },
  ];

  const cardGap = 16;
  const cardW = (innerW - cardGap * 3) / 4;
  const cardY = y + headH + 60;
  const cardH = 152;

  trajItems.forEach((it, idx) => {
    const cx = x + pad + idx * (cardW + cardGap);
    ctx.fillStyle = it.shade.bg;
    ctx.fillRect(cx, cardY, cardW, cardH);
    ctx.strokeStyle = it.shade.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cardY, cardW, cardH);

    ctx.fillStyle = "#475569";
    ctx.font = "bold 17px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(it.label, cx + cardW / 2, cardY + 34);

    ctx.fillStyle = it.shade.fg;
    ctx.font = "900 34px Inter, sans-serif";
    ctx.fillText(it.val, cx + cardW / 2, cardY + 92);

    ctx.fillStyle = "#64748B";
    ctx.font = "600 16px Inter, sans-serif";
    ctx.fillText(it.sub, cx + cardW / 2, cardY + 130);
  });

  // Subtítulo Dureza Determinística BIS
  const hardTitleY = cardY + cardH + 54;
  ctx.fillStyle = "#334155";
  ctx.font = "bold 19px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    "2. SEVERIDAD DE CONTACTO PERMITIDO (CLASIFICACIÓN DETERMINÍSTICA BIS)",
    x + pad,
    hardTitleY
  );

  // Barra apilada horizontal Soft / Med / Hard
  const barY = hardTitleY + 24;
  const barH = 48;
  const softW = (contact.softPct / 100) * innerW;
  const medW = (contact.medPct / 100) * innerW;
  const hardW = Math.max(0, innerW - softW - medW);

  ctx.fillStyle = "#10B981";
  ctx.fillRect(x + pad, barY, softW, barH);
  ctx.fillStyle = "#F59E0B";
  ctx.fillRect(x + pad + softW, barY, medW, barH);
  ctx.fillStyle = "#EF4444";
  ctx.fillRect(x + pad + softW + medW, barY, hardW, barH);
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + pad, barY, innerW, barH);

  // 3 tarjetas de severidad debajo
  const sevY = barY + barH + 26;
  const sevH = 148;
  const sevW = (innerW - cardGap * 2) / 3;
  const hardShade = getMetricCellShade("hardPct", contact.hardPct);

  const sevItems = [
    {
      label: "Contacto Débil (Soft%)",
      val: `${contact.softPct.toFixed(1)}%`,
      sub: `${contact.soft} batazos • Favorable`,
      bg: "rgba(16, 185, 129, 0.10)",
      fg: "#065F46",
      border: "rgba(16, 185, 129, 0.35)",
    },
    {
      label: "Contacto Medio (Med%)",
      val: `${contact.medPct.toFixed(1)}%`,
      sub: `${contact.med} batazos • Neutro`,
      bg: "#F8FAFC",
      fg: "#0F172A",
      border: "#CBD5E1",
    },
    {
      label: "Contacto Sólido (Hard%)",
      val: `${contact.hardPct.toFixed(1)}%`,
      sub: `${contact.hard} batazos • Peligro`,
      bg: hardShade.bg,
      fg: hardShade.fg,
      border: hardShade.border,
    },
  ];

  sevItems.forEach((sv, idx) => {
    const cx = x + pad + idx * (sevW + cardGap);
    ctx.fillStyle = sv.bg;
    ctx.fillRect(cx, sevY, sevW, sevH);
    ctx.strokeStyle = sv.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, sevY, sevW, sevH);

    ctx.fillStyle = "#475569";
    ctx.font = "bold 17px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(sv.label, cx + sevW / 2, sevY + 34);

    ctx.fillStyle = sv.fg;
    ctx.font = "900 34px Inter, sans-serif";
    ctx.fillText(sv.val, cx + sevW / 2, sevY + 90);

    ctx.fillStyle = "#64748B";
    ctx.font = "600 16px Inter, sans-serif";
    ctx.fillText(sv.sub, cx + sevW / 2, sevY + 128);
  });

  ctx.textAlign = "left";
}

// ─────────────────────────────────────────────────────────────────────────────
// Tablas de Splits Situacionales y Vueltas al Orden (TTO)
// ─────────────────────────────────────────────────────────────────────────────

function drawSplitsTableCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rows: PitchingSplitRow[],
  title: string,
  compactCols: boolean
) {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  const headH = 52;
  drawSectionHeaderBar(ctx, x, y, w, headH, title);

  if (!rows || rows.length === 0) {
    drawEmptyState(ctx, x, y + headH, w, h - headH, "Sin registros situacionales");
    return;
  }

  const colDefs = compactCols
    ? [
        { label: "Situación", weight: 2.3 },
        { label: "BF", weight: 0.8 },
        { label: "H-AB", weight: 1.1 },
        { label: "AVG", weight: 0.95 },
        { label: "OPS", weight: 0.95 },
        { label: "K%", weight: 0.95 },
        { label: "BB%", weight: 0.95 },
        { label: "CSW%", weight: 1.05 },
        { label: "Whiff%", weight: 1.05 },
      ]
    : [
        { label: "Situación / Vuelta", weight: 2.4 },
        { label: "BF", weight: 0.8 },
        { label: "AB", weight: 0.8 },
        { label: "H", weight: 0.75 },
        { label: "HR", weight: 0.75 },
        { label: "BB", weight: 0.75 },
        { label: "SO", weight: 0.75 },
        { label: "AVG", weight: 1.0 },
        { label: "OPS", weight: 1.0 },
        { label: "F-Strike%", weight: 1.15 },
        { label: "CSW%", weight: 1.1 },
        { label: "Whiff%", weight: 1.1 },
      ];

  const totalWeight = colDefs.reduce((s, c) => s + c.weight, 0);
  const colWidths = colDefs.map((c) => (w / totalWeight) * c.weight);
  const colX: number[] = [];
  let accX = x;
  for (const cw of colWidths) {
    colX.push(accX);
    accX += cw;
  }

  const tblHeadY = y + headH;
  const tblHeadH = 46;
  ctx.fillStyle = "#F1F5F9";
  ctx.fillRect(x + 2, tblHeadY, w - 4, tblHeadH);

  colDefs.forEach((col, c) => {
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.textAlign = c === 0 ? "left" : "center";
    const tx = c === 0 ? colX[c] + 22 : colX[c] + colWidths[c] / 2;
    ctx.fillText(col.label, tx, tblHeadY + 30);

    if (c > 0) {
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(colX[c], tblHeadY);
      ctx.lineTo(colX[c], y + h);
      ctx.stroke();
    }
  });

  const availBodyH = h - headH - tblHeadH;
  const rowH = Math.min(72, Math.floor(availBodyH / Math.max(rows.length, 1)));

  rows.forEach((r, idx) => {
    const ry = tblHeadY + tblHeadH + idx * rowH;
    const baseBg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
    ctx.fillStyle = baseBg;
    ctx.fillRect(x + 2, ry, w - 4, rowH);

    const hasSample = r.bf >= 2;
    const opsNum =
      r.ops && r.ops !== "—"
        ? Number(r.ops.startsWith(".") ? `0${r.ops}` : r.ops)
        : null;

    const cells: Array<{ txt: string; metric?: string; num?: number | null }> = compactCols
      ? [
          { txt: r.label },
          { txt: String(r.bf) },
          { txt: `${r.h}-${r.ab}` },
          { txt: r.bf > 0 ? r.avg : "—" },
          {
            txt: r.bf > 0 ? r.ops : "—",
            metric: hasSample ? "opsAgainst" : undefined,
            num: opsNum,
          },
          {
            txt: r.bf > 0 ? `${r.kPct.toFixed(1)}%` : "—",
            metric: hasSample ? "kPct" : undefined,
            num: r.kPct,
          },
          {
            txt: r.bf > 0 ? `${r.bbPct.toFixed(1)}%` : "—",
            metric: hasSample ? "bbPct" : undefined,
            num: r.bbPct,
          },
          {
            txt: (r.pitches ?? 0) > 0 ? `${r.cswPct.toFixed(1)}%` : "—",
            metric: hasSample ? "cswPct" : undefined,
            num: r.cswPct,
          },
          {
            txt: (r.pitches ?? 0) > 0 ? `${r.whiffPct.toFixed(1)}%` : "—",
            metric: hasSample ? "whiffPct" : undefined,
            num: r.whiffPct,
          },
        ]
      : [
          { txt: r.label },
          { txt: String(r.bf) },
          { txt: String(r.ab) },
          { txt: String(r.h) },
          { txt: String(r.hr) },
          { txt: String(r.bb) },
          { txt: String(r.so) },
          { txt: r.bf > 0 ? r.avg : "—" },
          {
            txt: r.bf > 0 ? r.ops : "—",
            metric: hasSample ? "opsAgainst" : undefined,
            num: opsNum,
          },
          {
            txt: (r.pitches ?? 0) > 0 ? `${r.fStrikePct.toFixed(1)}%` : "—",
            metric: hasSample ? "fStrikePct" : undefined,
            num: r.fStrikePct,
          },
          {
            txt: (r.pitches ?? 0) > 0 ? `${r.cswPct.toFixed(1)}%` : "—",
            metric: hasSample ? "cswPct" : undefined,
            num: r.cswPct,
          },
          {
            txt: (r.pitches ?? 0) > 0 ? `${r.whiffPct.toFixed(1)}%` : "—",
            metric: hasSample ? "whiffPct" : undefined,
            num: r.whiffPct,
          },
        ];

    cells.forEach((cell, c) => {
      const cx = colX[c];
      const cw = colWidths[c];
      const shade = cell.metric
        ? getMetricCellShade(cell.metric, cell.num)
        : null;

      if (shade && shade.tier !== "neutral") {
        ctx.fillStyle = shade.bg;
        ctx.fillRect(cx + 1, ry + 1, cw - 2, rowH - 2);
      }

      ctx.fillStyle = shade && shade.tier !== "neutral" ? shade.fg : "#0F172A";
      ctx.font = c === 0 ? "bold 20px Inter, sans-serif" : "900 20px Inter, sans-serif";
      ctx.textAlign = c === 0 ? "left" : "center";
      const tx = c === 0 ? cx + 22 : cx + cw / 2;
      ctx.fillText(cell.txt, tx, ry + Math.round(rowH * 0.62));
    });

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, ry + rowH);
    ctx.lineTo(x + w, ry + rowH);
    ctx.stroke();
  });

  ctx.textAlign = "left";
}

function drawRelieverDeepDiveCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  data: PitchGameDataResponse
) {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  const headH = 52;
  drawSectionHeaderBar(
    ctx,
    x,
    y,
    w,
    headH,
    "IMPACTO SITUACIONAL Y EJECUCIÓN EN RELEVO (BULLPEN CONTEXT)"
  );

  const cm = data.contextMetrics;
  const bx = data.boxscore;
  const kpis = data.pbpKpis;

  const cards = [
    {
      label: "Presión al Entrar (gmLI)",
      val: cm ? cm.gmLI.toFixed(2) : "1.00",
      sub: cm && cm.gmLI >= 1.5 ? "Alta Presión" : "Situación Estándar",
      shade: { bg: "#F8FAFC", fg: "#0F172A", border: "#CBD5E1" },
    },
    {
      label: "Heredados (IR / IRS)",
      val: `${bx.ir ?? cm?.ir ?? 0} / ${bx.irs ?? cm?.irs ?? 0}`,
      sub:
        (bx.ir ?? 0) > 0 && (bx.irs ?? 0) === 0
          ? "100% Contenidos"
          : "Corredores en Base",
      shade:
        (bx.ir ?? 0) > 0 && (bx.irs ?? 0) === 0
          ? getMetricCellShade("cswPct", 35)
          : { bg: "#F8FAFC", fg: "#0F172A", border: "#CBD5E1" },
    },
    {
      label: "Impacto Victoria (WPA)",
      val: formatSigned(cm?.wpa, 3),
      sub:
        (cm?.wpa ?? 0) >= 0.06
          ? "Shutdown (+0.06+)"
          : (cm?.wpa ?? 0) <= -0.06
          ? "Meltdown (-0.06-)"
          : "Relevo Neutro",
      shade: getMetricCellShade("wpa", cm?.wpa ?? null),
    },
    {
      label: "Carreras Ahorradas (RE24)",
      val: formatSigned(cm?.re24, 2),
      sub: "vs Matriz 24 Estados",
      shade: getMetricCellShade("re24", cm?.re24 ?? null),
    },
    {
      label: "Conversión 2 Strikes",
      val: kpis.putAwayPct || "0.0%",
      sub: `${kpis.twoStrikeK ?? 0} K en ${kpis.twoStrikePitches ?? 0} P`,
      shade: getMetricCellShade("putAwayPct", parseNum(kpis.putAwayPct)),
    },
    {
      label: "Dominio K-BB%",
      val: bx.kMinusBbPct || "0.0%",
      sub: `K%: ${bx.kPct || "0%"} • BB%: ${bx.bbPct || "0%"}`,
      shade: getMetricCellShade("kMinusBbPct", parseNum(bx.kMinusBbPct)),
    },
  ];

  const pad = 28;
  const gap = 20;
  const cw = (w - pad * 2 - gap * 5) / 6;
  const cy = y + headH + 45;
  const ch = h - headH - 90;

  cards.forEach((c, idx) => {
    const cx = x + pad + idx * (cw + gap);
    ctx.fillStyle = c.shade.bg;
    ctx.fillRect(cx, cy, cw, ch);
    ctx.strokeStyle = c.shade.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);

    ctx.fillStyle = "#475569";
    ctx.font = "bold 17px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(c.label, cx + cw / 2, cy + 44);

    ctx.fillStyle = c.shade.fg;
    ctx.font = "900 38px Inter, sans-serif";
    ctx.fillText(c.val, cx + cw / 2, cy + 122);

    ctx.fillStyle = "#64748B";
    ctx.font = "600 16px Inter, sans-serif";
    ctx.fillText(c.sub, cx + cw / 2, cy + 178);
  });

  ctx.textAlign = "left";
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloque Medio MLB: Repertorio Hawk-Eye Enriquecido + Contacto Óptico
// ─────────────────────────────────────────────────────────────────────────────

function drawMlbArsenalAndOpticalCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  summary: StatcastPitchRow[],
  contact: ContactProfileSummary | undefined,
  kpis: PitchGameDataResponse["pbpKpis"]
) {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  const headH = 52;
  drawSectionHeaderBar(
    ctx,
    x,
    y,
    w,
    headH,
    "ARSENAL HAWK-EYE (VELOCIDAD, MOVIMIENTO, EXTENSIÓN Y DISCIPLINA DE ZONA)"
  );

  if (!summary || summary.length === 0) {
    drawEmptyState(ctx, x, y + headH, w, h - headH, "Sin datos de repertorio Hawk-Eye");
    return;
  }

  const opticalBarH = 104;
  const tableAreaH = h - headH - opticalBarH;
  const rows = summary.slice(0, 7);
  const subHeadH = 44;
  const rowH = Math.min(58, Math.floor((tableAreaH - subHeadH) / (rows.length + 1)));

  const cols = [
    { label: "Pitcheo", weight: 1.9 },
    { label: "#", weight: 0.65 },
    { label: "Uso%", weight: 0.85 },
    { label: "Velo (Máx)", weight: 1.25 },
    { label: "Spin", weight: 0.85 },
    { label: "iVB\"", weight: 0.75 },
    { label: "HB\"", weight: 0.75 },
    { label: "Ext (ft)", weight: 0.85 },
    { label: "Zone%", weight: 0.9 },
    { label: "Chase%", weight: 0.9 },
    { label: "Z-Con%", weight: 0.9 },
    { label: "Whiff%", weight: 0.95 },
    { label: "CSW%", weight: 0.95 },
  ];

  const totW = cols.reduce((s, c) => s + c.weight, 0);
  const colWidths = cols.map((c) => (w / totW) * c.weight);
  const colX: number[] = [];
  let accX = x;
  for (const cw of colWidths) {
    colX.push(accX);
    accX += cw;
  }

  const thY = y + headH;
  ctx.fillStyle = "#F1F5F9";
  ctx.fillRect(x + 2, thY, w - 4, subHeadH);

  cols.forEach((col, c) => {
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 17px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(col.label, colX[c] + colWidths[c] / 2, thY + 29);
    if (c > 0) {
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(colX[c], thY);
      ctx.lineTo(colX[c], thY + subHeadH + (rows.length + 1) * rowH);
      ctx.stroke();
    }
  });

  rows.forEach((pt, idx) => {
    const ry = thY + subHeadH + idx * rowH;
    const pColor = pt.color || getPitchColor(pt.pitchName, pt.pitchType);
    const bg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";

    ctx.fillStyle = bg;
    ctx.fillRect(x + 2, ry, w - 4, rowH);

    // Primera celda coloreada por tipo de pitcheo
    ctx.fillStyle = pColor;
    ctx.fillRect(colX[0] + 2, ry + 2, colWidths[0] - 4, rowH - 4);
    ctx.fillStyle = ["#67E18D", "#F79E70", "#FE6100", "#FFB000"].includes(pColor)
      ? "#070B19"
      : "#FFFFFF";
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pt.pitchName, colX[0] + colWidths[0] / 2, ry + Math.round(rowH * 0.62));

    const veloTxt =
      pt.veloAvg !== "—" && pt.veloMax !== "—"
        ? `${pt.veloAvg} (${pt.veloMax})`
        : String(pt.veloAvg);

    const vals: Array<{ txt: string; metric?: string }> = [
      { txt: String(pt.count) },
      { txt: pt.usagePct },
      { txt: veloTxt },
      { txt: String(pt.spinAvg) },
      { txt: String(pt.ivb) },
      { txt: String(pt.hb) },
      { txt: pt.extAvg !== undefined && pt.extAvg !== null ? String(pt.extAvg) : "—" },
      { txt: pt.zonePct || "—" },
      { txt: pt.chasePct || "—", metric: pt.count >= 5 ? "chasePct" : undefined },
      { txt: pt.zContactPct || "—", metric: pt.count >= 5 ? "zContactPct" : undefined },
      { txt: pt.whiffPct, metric: pt.count >= 5 ? "whiffPct" : undefined },
      { txt: pt.cswPct, metric: pt.count >= 5 ? "cswPct" : undefined },
    ];

    vals.forEach((v, cIdx) => {
      const c = cIdx + 1;
      const cx = colX[c];
      const cw = colWidths[c];
      const shade = v.metric ? getMetricCellShade(v.metric, parseNum(v.txt)) : null;

      if (shade && shade.tier !== "neutral") {
        ctx.fillStyle = shade.bg;
        ctx.fillRect(cx + 1, ry + 1, cw - 2, rowH - 2);
      }

      ctx.fillStyle = shade && shade.tier !== "neutral" ? shade.fg : "#0F172A";
      ctx.font = "900 18px Inter, sans-serif";
      ctx.fillText(v.txt, cx + cw / 2, ry + Math.round(rowH * 0.62));
    });

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, ry + rowH);
    ctx.lineTo(x + w, ry + rowH);
    ctx.stroke();
  });

  // Fila Total
  const totY = thY + subHeadH + rows.length * rowH;
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(x + 2, totY, w - 4, rowH);
  ctx.fillStyle = "#FDB827";
  ctx.font = "900 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Total / Prom", colX[0] + colWidths[0] / 2, totY + Math.round(rowH * 0.62));

  const totCount = summary.reduce((s, r) => s + r.count, 0);
  const totVals = [
    String(totCount),
    "100%",
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    kpis.chasePct || "—",
    kpis.zContactPct || "—",
    kpis.whiffPct,
    kpis.cswPct,
  ];
  totVals.forEach((tv, idx) => {
    const c = idx + 1;
    ctx.fillText(tv, colX[c] + colWidths[c] / 2, totY + Math.round(rowH * 0.62));
  });

  // Barra inferior de Calidad de Contacto Óptico Hawk-Eye
  const optY = y + h - opticalBarH;
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(x + 2, optY, w - 4, opticalBarH - 2);
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, optY);
  ctx.lineTo(x + w, optY);
  ctx.stroke();

  const optMetrics = [
    `Bolas en Juego: ${contact?.bip ?? 0}`,
    `EV Promedio Rival: ${contact?.avgEv != null ? `${contact.avgEv} mph` : "—"}`,
    `EV Máx: ${contact?.maxEv != null ? `${contact.maxEv} mph` : "—"}`,
    `HardHit% (≥95 mph): ${contact?.hardHitPct != null ? `${contact.hardHitPct}%` : "—"}`,
    `Barrel%: ${contact?.barrelPct != null ? `${contact.barrelPct}%` : "—"}`,
    `GB%: ${contact ? `${contact.gbPct}%` : "—"} (GO/AO: ${contact?.goAoRatio || "—"})`,
  ];

  ctx.fillStyle = "#0F172A";
  ctx.font = "900 20px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(optMetrics.join("   •   "), x + w / 2, optY + 60);
  ctx.textAlign = "left";
}

// ─────────────────────────────────────────────────────────────────────────────
// Historial de Últimos 10 Juegos con PBP 100% Real (Modo Temporada)
// ─────────────────────────────────────────────────────────────────────────────

function getRealLogRates(g: PitcherGameLog): {
  cswNum: number | null;
  whiffNum: number | null;
  cswStr: string;
  whiffStr: string;
} {
  const cswNum = parseNum(g.cswPct);
  const whiffNum = parseNum(g.whiffPct);
  return {
    cswNum,
    whiffNum,
    cswStr: cswNum !== null ? `${cswNum.toFixed(1)}%` : "—",
    whiffStr: whiffNum !== null ? `${whiffNum.toFixed(1)}%` : "—",
  };
}

function drawSeasonHistoryRealPbpTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  displayLogs: PitcherGameLog[]
) {
  if (!displayLogs || displayLogs.length === 0) {
    drawEmptyState(ctx, x, y, w, h, "Sin registros de salidas para este período");
    return;
  }

  ctx.fillStyle = "#070B19";
  ctx.font = "900 23px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    "HISTORIAL DE SALIDAS RECIENTES (ÚLTIMOS 10 JUEGOS • PBP 100% REAL)",
    x,
    y - 16
  );

  const colDefs = [
    { label: "Fecha", weight: 1.05 },
    { label: "Rival", weight: 2.15 },
    { label: "Rol", weight: 1.15 },
    { label: "Dec.", weight: 0.75 },
    { label: "IP", weight: 0.75 },
    { label: "H", weight: 0.65 },
    { label: "CL", weight: 0.65 },
    { label: "BB", weight: 0.65 },
    { label: "K", weight: 0.65 },
    { label: "P (S-B)", weight: 1.55 },
    { label: "GSv2", weight: 0.85 },
    { label: "WPA", weight: 0.95 },
    { label: "CSW%", weight: 1.0 },
    { label: "Whiff%", weight: 1.0 },
  ];

  const totalWeight = colDefs.reduce((acc, c) => acc + c.weight, 0);
  const colWidths = colDefs.map((c) => (w / totalWeight) * c.weight);
  const colX: number[] = [];
  let currX = x;
  for (const cw of colWidths) {
    colX.push(currX);
    currX += cw;
  }

  const headerH = 54;
  const rowH = Math.min(66, Math.floor((h - headerH) / Math.max(displayLogs.length, 1)));
  const totalH = headerH + displayLogs.length * rowH;

  for (let c = 0; c < colDefs.length; c++) {
    const cx = colX[c];
    const cw = colWidths[c];

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(cx, y, cw, headerH);

    ctx.fillStyle = "#FDB827";
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(colDefs[c].label, cx + cw / 2, y + 34);
  }

  displayLogs.forEach((g, idx) => {
    const ry = y + headerH + idx * rowH;
    const bg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
    ctx.fillStyle = bg;
    ctx.fillRect(x, ry, w, rowH);

    const pVal = g.pitches || 0;
    const sVal = g.strikes || 0;
    const bVal = Math.max(0, pVal - sVal);
    const pStr = pVal > 0 ? `${pVal} (${sVal}-${bVal})` : "—";
    const { cswNum, whiffNum, cswStr, whiffStr } = getRealLogRates(g);

    const dateFormatted = String(g.date || "").slice(-5).replace("-", "/");
    const roleFormatted = g.role || (g.isStarter ? "Abridor" : "Relevista");
    const decFormatted = g.decision || "—";
    const gsv2Txt =
      g.isStarter && g.gsv2 !== null && g.gsv2 !== undefined
        ? `${g.gsv2}${g.isQS ? "★" : ""}`
        : "—";
    const wpaTxt =
      g.wpa !== null && g.wpa !== undefined ? formatSigned(g.wpa, 2) : "—";

    const cells: Array<{ txt: string; metric?: string; num?: number | null }> = [
      { txt: dateFormatted },
      { txt: g.opponent || "Rival" },
      { txt: roleFormatted },
      { txt: decFormatted },
      { txt: String(g.ip || "0.0") },
      { txt: String(g.h ?? 0) },
      { txt: String(g.er ?? 0) },
      { txt: String(g.bb ?? 0) },
      { txt: String(g.so ?? 0) },
      { txt: pStr },
      {
        txt: gsv2Txt,
        metric: g.isStarter ? "gsv2" : undefined,
        num: g.gsv2 ?? null,
      },
      {
        txt: wpaTxt,
        metric: g.wpa !== null && g.wpa !== undefined ? "wpa" : undefined,
        num: g.wpa ?? null,
      },
      { txt: cswStr, metric: cswNum !== null ? "cswPct" : undefined, num: cswNum },
      { txt: whiffStr, metric: whiffNum !== null ? "whiffPct" : undefined, num: whiffNum },
    ];

    cells.forEach((cell, c) => {
      const cx = colX[c];
      const cw = colWidths[c];
      const shade = cell.metric ? getMetricCellShade(cell.metric, cell.num) : null;

      if (shade && shade.tier !== "neutral") {
        ctx.fillStyle = shade.bg;
        ctx.fillRect(cx + 1, ry + 1, cw - 2, rowH - 2);
      }

      if (c === 3) {
        ctx.fillStyle =
          decFormatted === "W"
            ? "#16A34A"
            : decFormatted === "L"
            ? "#DC2626"
            : decFormatted === "SV" || decFormatted === "HLD"
            ? "#D97706"
            : "#64748B";
        ctx.font = "900 18px Inter, sans-serif";
      } else if (c === 2) {
        ctx.fillStyle = roleFormatted === "Abridor" ? "#002D62" : "#475569";
        ctx.font = "bold 18px Inter, sans-serif";
      } else {
        ctx.fillStyle = shade && shade.tier !== "neutral" ? shade.fg : "#070B19";
        ctx.font = c <= 1 ? "bold 18px Inter, sans-serif" : "900 18px Inter, sans-serif";
      }

      ctx.textAlign = "center";
      ctx.fillText(cell.txt, cx + cw / 2, ry + Math.round(rowH * 0.62));

      if (c > 0) {
        ctx.strokeStyle = "#CBD5E1";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(cx, y + totalH);
        ctx.stroke();
      }
    });

    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, ry + rowH);
    ctx.lineTo(x + w, ry + rowH);
    ctx.stroke();
  });

  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, totalH);
  ctx.textAlign = "left";
}

// ─────────────────────────────────────────────────────────────────────────────
// Subrutinas Gráficas del Tríptico Central
// ─────────────────────────────────────────────────────────────────────────────

function drawSubplotFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string
) {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 1.8;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = "#070B19";
  ctx.font = "bold 22px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, x + w / 2, y - 16);
  ctx.textAlign = "left";
}

function drawLvbpWorkloadPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  workload: InningWorkloadItem[]
) {
  drawSubplotFrame(ctx, x, y, w, h, "Carga por Entrada (Strikes vs Bolas)");

  if (!workload || workload.length === 0) {
    drawEmptyState(ctx, x, y, w, h, "Sin registros de carga por entrada");
    return;
  }

  const plotBottom = y + h;
  const pCounts = workload.map((wk) => wk.pitches);
  const maxP = Math.max(...pCounts, 25);
  const yUpper = Math.ceil(maxP / 5) * 5;

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

    ctx.fillStyle = "#475569";
    ctx.font = "bold 15px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(tick), x - 10, ty + 5);
  }
  ctx.setLineDash([]);

  const n = workload.length;
  const slotW = w / n;
  const barW = Math.min(slotW * 0.58, 62);

  workload.forEach((wk, i) => {
    const cx = x + i * slotW + slotW / 2;
    const bx = cx - barW / 2;
    const strikeH = (wk.strikes / yUpper) * h;
    const ballH = (Math.max(0, wk.pitches - wk.strikes) / yUpper) * h;

    ctx.fillStyle = "#0C162D";
    ctx.fillRect(bx, plotBottom - strikeH, barW, strikeH);
    ctx.strokeStyle = "#0F172A";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, plotBottom - strikeH, barW, strikeH);

    ctx.fillStyle = "#F5A623";
    ctx.fillRect(bx, plotBottom - strikeH - ballH, barW, ballH);
    ctx.strokeRect(bx, plotBottom - strikeH - ballH, barW, ballH);

    ctx.fillStyle = "#070B19";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(wk.pitches), cx, plotBottom - strikeH - ballH - 8);
    ctx.fillText(`Inn ${wk.inning}`, cx, plotBottom + 28);
  });

  const legX = x + w - 135;
  const legY = y + 14;
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  ctx.fillRect(legX, legY, 122, 54);
  ctx.strokeRect(legX, legY, 122, 54);

  ctx.fillStyle = "#0C162D";
  ctx.fillRect(legX + 10, legY + 11, 14, 14);
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 14px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Strikes", legX + 32, legY + 23);

  ctx.fillStyle = "#F5A623";
  ctx.fillRect(legX + 10, legY + 31, 14, 14);
  ctx.fillStyle = "#070B19";
  ctx.fillText("Bolas", legX + 32, legY + 43);
}

function drawLvbpLeveragePlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  workload: InningWorkloadItem[]
) {
  drawSubplotFrame(ctx, x, y, w, h, "Índice de Presión por Entrada (Tango LI)");

  if (!workload || workload.length === 0) {
    drawEmptyState(ctx, x, y, w, h, "Sin datos de Leverage Index");
    return;
  }

  const plotBottom = y + h;
  const lis = workload.map((wk) => wk.avgLi || 1.0);
  const maxLi = Math.max(...lis, 1.8);
  const yUpper = Math.max(Math.ceil(maxLi * 1.25 * 2) / 2, 2.0);

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

  const base1Y = plotBottom - (1.0 / yUpper) * h;
  ctx.strokeStyle = "#5B7083";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x, base1Y);
  ctx.lineTo(x + w, base1Y);
  ctx.stroke();
  ctx.setLineDash([]);

  const n = workload.length;
  const paddingX = 45;
  const step = n > 1 ? (w - paddingX * 2) / (n - 1) : 0;

  const points: { px: number; py: number; li: number; inn: number }[] = [];
  workload.forEach((wk, i) => {
    const px = n > 1 ? x + paddingX + i * step : x + w / 2;
    const py = plotBottom - ((wk.avgLi || 1.0) / yUpper) * h;
    points.push({ px, py, li: wk.avgLi || 1.0, inn: wk.inning });
  });

  ctx.strokeStyle = "#D97706";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  points.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.px, pt.py);
    else ctx.lineTo(pt.px, pt.py);
  });
  ctx.stroke();

  points.forEach((pt) => {
    ctx.fillStyle = "#D97706";
    ctx.beginPath();
    ctx.arc(pt.px, pt.py, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "bold 15px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pt.li.toFixed(2), pt.px, pt.py - 12);

    ctx.fillStyle = "#070B19";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillText(`Inn ${pt.inn}`, pt.px, plotBottom + 28);
  });
  ctx.textAlign = "left";
}

function drawLvbpPlatoonPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  splits: PlatoonSplits
) {
  drawSubplotFrame(ctx, x, y, w, h, "Tasas por Mano del Bateador (LHB vs RHB)");

  if (!splits || (!splits.vsLhb?.pitches && !splits.vsRhb?.pitches)) {
    drawEmptyState(ctx, x, y, w, h, "Sin datos de Platoon disponibles");
    return;
  }

  const plotBottom = y + h;
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

  const cats = ["Strike%", "Whiff%", "CSW%"];
  const parseRate = (v: string | number) => parseNum(v) ?? 0;

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

    const hL = (valsL[i] / 100) * h;
    const bLx = cx - barW - 3;
    ctx.fillStyle = "#3B82F6";
    ctx.fillRect(bLx, plotBottom - hL, barW, hL);
    ctx.strokeStyle = "#0F172A";
    ctx.lineWidth = 1;
    ctx.strokeRect(bLx, plotBottom - hL, barW, hL);

    ctx.fillStyle = "#1E40AF";
    ctx.font = "bold 15px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(valsL[i])}%`, bLx + barW / 2, plotBottom - hL - 7);

    const hR = (valsR[i] / 100) * h;
    const bRx = cx + 3;
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(bRx, plotBottom - hR, barW, hR);
    ctx.strokeRect(bRx, plotBottom - hR, barW, hR);

    ctx.fillStyle = "#B45309";
    ctx.fillText(`${Math.round(valsR[i])}%`, bRx + barW / 2, plotBottom - hR - 7);

    ctx.fillStyle = "#070B19";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillText(cat, cx, plotBottom + 28);
  });

  const legX = x + w - 184;
  const legY = y + 14;
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  ctx.fillRect(legX, legY, 170, 54);
  ctx.strokeRect(legX, legY, 170, 54);

  ctx.fillStyle = "#3B82F6";
  ctx.fillRect(legX + 10, legY + 11, 14, 14);
  ctx.fillStyle = "#070B19";
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`vs Zurdos (${splits.vsLhb.pitches} P)`, legX + 32, legY + 23);

  ctx.fillStyle = "#F59E0B";
  ctx.fillRect(legX + 10, legY + 31, 14, 14);
  ctx.fillStyle = "#070B19";
  ctx.fillText(`vs Derechos (${splits.vsRhb.pitches} P)`, legX + 32, legY + 43);
}

function drawLvbpSeasonPitchesPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  plotLogs: PitcherGameLog[]
) {
  drawSubplotFrame(ctx, x, y, w, h, "Bolas y Strikes por Salida (Últ. 10)");

  const plotBottom = y + h;
  const pCounts = plotLogs.map((g) => g.pitches || 0);
  const maxP = Math.max(...pCounts, 30);
  const yUpper = Math.ceil((maxP * 1.22) / 10) * 10;

  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let tick = 0; tick <= yUpper; tick += 20) {
    const ty = plotBottom - (tick / yUpper) * h;
    if (tick > 0 && tick < yUpper) {
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x + w, ty);
      ctx.stroke();
    }
    ctx.fillStyle = "#475569";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(tick), x - 8, ty + 5);
  }
  ctx.setLineDash([]);

  const n = Math.max(plotLogs.length, 1);
  const slotW = w / n;
  const barW = Math.min(slotW * 0.62, 54);

  plotLogs.forEach((g, i) => {
    const cx = x + i * slotW + slotW / 2;
    const bx = cx - barW / 2;
    const tot = g.pitches || 0;
    const strks = g.strikes || 0;
    const bolas = Math.max(0, tot - strks);

    const strikeH = (strks / yUpper) * h;
    const ballH = (bolas / yUpper) * h;

    ctx.fillStyle = "#002D62";
    ctx.fillRect(bx, plotBottom - strikeH, barW, strikeH);
    ctx.fillStyle = "#FDB827";
    ctx.fillRect(bx, plotBottom - strikeH - ballH, barW, ballH);

    if (tot > 0) {
      ctx.fillStyle = "#070B19";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(tot), cx, plotBottom - strikeH - ballH - 6);
    }

    const dStr = String(g.date || "").slice(-5).replace("-", "/");
    ctx.save();
    ctx.translate(cx, plotBottom + 14);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "#070B19";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(dStr, 0, 0);
    ctx.restore();
  });
  ctx.textAlign = "left";
}

function drawLvbpSeasonWhiffPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  plotLogs: PitcherGameLog[]
) {
  drawSubplotFrame(ctx, x, y, w, h, "Whiff% Real por Salida (Últ. 10)");

  const plotBottom = y + h;
  const whiffVals = plotLogs.map((g) => getRealLogRates(g).whiffNum ?? 0);
  const maxW = Math.max(...whiffVals, 25);
  const yUpper = Math.max(Math.ceil((maxW * 1.35) / 10) * 10, 35);

  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let tick = 0; tick <= yUpper; tick += 10) {
    const ty = plotBottom - (tick / yUpper) * h;
    if (tick > 0 && tick < yUpper) {
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x + w, ty);
      ctx.stroke();
    }
    ctx.fillStyle = "#475569";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${tick}%`, x - 8, ty + 5);
  }
  ctx.setLineDash([]);

  const n = Math.max(plotLogs.length, 1);
  const paddingX = 35;
  const step = n > 1 ? (w - paddingX * 2) / (n - 1) : 0;

  const points = plotLogs.map((g, i) => ({
    px: n > 1 ? x + paddingX + i * step : x + w / 2,
    py: plotBottom - (whiffVals[i] / yUpper) * h,
    val: whiffVals[i],
    date: g.date,
  }));

  ctx.strokeStyle = "#2563EB";
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.px, pt.py);
    else ctx.lineTo(pt.px, pt.py);
  });
  ctx.stroke();

  points.forEach((pt) => {
    ctx.fillStyle = "#2563EB";
    ctx.beginPath();
    ctx.arc(pt.px, pt.py, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1E40AF";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${pt.val.toFixed(1)}%`, pt.px, pt.py - 10);

    const dStr = String(pt.date || "").slice(-5).replace("-", "/");
    ctx.save();
    ctx.translate(pt.px, plotBottom + 14);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "#070B19";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(dStr, 0, 0);
    ctx.restore();
  });
  ctx.textAlign = "left";
}

function drawLvbpSeasonCswPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  plotLogs: PitcherGameLog[]
) {
  drawSubplotFrame(ctx, x, y, w, h, "CSW% Real por Salida (Cota Élite 30%)");

  const plotBottom = y + h;
  const cswVals = plotLogs.map((g) => getRealLogRates(g).cswNum ?? 0);
  const maxC = Math.max(...cswVals, 35);
  const yUpper = Math.max(Math.ceil((maxC * 1.35) / 10) * 10, 45);

  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let tick = 0; tick <= yUpper; tick += 10) {
    const ty = plotBottom - (tick / yUpper) * h;
    if (tick > 0 && tick < yUpper) {
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x + w, ty);
      ctx.stroke();
    }
    ctx.fillStyle = "#475569";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${tick}%`, x - 8, ty + 5);
  }
  ctx.setLineDash([]);

  const eliteY = plotBottom - (30.0 / yUpper) * h;
  ctx.strokeStyle = "#DC2626";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, eliteY);
  ctx.lineTo(x + w, eliteY);
  ctx.stroke();
  ctx.setLineDash([]);

  const n = Math.max(plotLogs.length, 1);
  const paddingX = 35;
  const step = n > 1 ? (w - paddingX * 2) / (n - 1) : 0;

  const points = plotLogs.map((g, i) => ({
    px: n > 1 ? x + paddingX + i * step : x + w / 2,
    py: plotBottom - (cswVals[i] / yUpper) * h,
    val: cswVals[i],
    date: g.date,
  }));

  ctx.strokeStyle = "#059669";
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.px, pt.py);
    else ctx.lineTo(pt.px, pt.py);
  });
  ctx.stroke();

  points.forEach((pt) => {
    ctx.fillStyle = "#059669";
    ctx.fillRect(pt.px - 5, pt.py - 5, 10, 10);

    ctx.fillStyle = "#065F46";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${pt.val.toFixed(1)}%`, pt.px, pt.py - 10);

    const dStr = String(pt.date || "").slice(-5).replace("-", "/");
    ctx.save();
    ctx.translate(pt.px, plotBottom + 14);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "#070B19";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(dStr, 0, 0);
    ctx.restore();
  });
  ctx.textAlign = "left";
}

function drawMlbVelocityPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  summary: StatcastPitchRow[]
) {
  drawSubplotFrame(ctx, x, y, w, h, "Velocidad por Repertorio (mph)");

  if (!summary || summary.length === 0) {
    drawEmptyState(ctx, x, y, w, h, "Sin datos de velocidad");
    return;
  }

  const valid = summary.filter((s) => (parseNum(s.veloAvg) ?? 0) > 0);
  const rowH = Math.min((h - 70) / Math.max(valid.length, 1), 75);

  valid.forEach((pt, i) => {
    const ry = y + 36 + i * rowH;
    const pColor = pt.color || getPitchColor(pt.pitchName, pt.pitchType);
    const veloNum = parseNum(pt.veloAvg) ?? 0;

    ctx.fillStyle = pColor;
    ctx.font = "bold 19px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(pt.pitchName, x + 24, ry + 24);

    const barStartX = x + 215;
    const barMaxW = w - 215 - 125;
    const norm = Math.max(0, Math.min(1, (veloNum - 70) / 32));
    const curW = norm * barMaxW;

    ctx.fillStyle = "#F1F5F9";
    ctx.fillRect(barStartX, ry + 6, barMaxW, 24);
    ctx.fillStyle = pColor;
    ctx.fillRect(barStartX, ry + 6, curW, 24);

    ctx.fillStyle = "#070B19";
    ctx.font = "bold 19px Inter, sans-serif";
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
  drawSubplotFrame(ctx, x, y, w, h, "Ubicación y Zona de Strike (3×3)");

  const cx = x + w / 2;
  const cy = y + h / 2 - 10;
  const pxScale = 108;

  const szW = 1.416 * pxScale;
  const szH = 2.0 * pxScale;
  const szX = cx - szW / 2;
  const szY = cy - szH / 2;

  const plateW = szW;
  const plateY = szY + szH + 42;
  ctx.fillStyle = "#CBD5E1";
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - plateW / 2, plateY);
  ctx.lineTo(cx + plateW / 2, plateY);
  ctx.lineTo(cx + plateW / 2, plateY + 12);
  ctx.lineTo(cx, plateY + 26);
  ctx.lineTo(cx - plateW / 2, plateY + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 3;
  ctx.strokeRect(szX, szY, szW, szH);

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

  if (pitches && pitches.length > 0) {
    const sample = pitches.length > 260 ? pitches.slice(-260) : pitches;
    sample.forEach((p) => {
      if (p.plateX == null || p.plateZ == null) return;
      const ptX = cx + p.plateX * pxScale;
      const ptY = cy - (p.plateZ - 2.5) * pxScale;
      if (ptX < x + 12 || ptX > x + w - 12 || ptY < y + 12 || ptY > y + h - 12) return;

      const col = getPitchColor(p.pitchName || p.pitchType, p.pitchType);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(ptX, ptY, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 1.3;
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
  drawSubplotFrame(ctx, x, y, w, h, "Movimiento Corto (iVB vs HB, pulg)");

  const cx = x + w / 2;
  const cy = y + h / 2 - 6;
  const radius = Math.min(w, h) * 0.36;

  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.stroke();

  ctx.fillStyle = "#64748B";
  ctx.font = "bold 15px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("+20\"", cx, cy - radius - 10);
  ctx.fillText("-20\"", cx, cy + radius + 22);
  ctx.fillText(
    throws === "L" ? "Lado Brazo" : "Lado Guante",
    cx - radius + 52,
    cy - 10
  );
  ctx.fillText(
    throws === "L" ? "Lado Guante" : "Lado Brazo",
    cx + radius - 52,
    cy - 10
  );

  if (pitches && pitches.length > 0) {
    const sample = pitches.length > 260 ? pitches.slice(-260) : pitches;
    sample.forEach((p) => {
      if (p.hb == null || p.ivb == null) return;
      const pxX = cx + (p.hb / 25) * radius;
      const pxY = cy - (p.ivb / 25) * radius;
      if (pxX < x + 12 || pxX > x + w - 12 || pxY < y + 12 || pxY > y + h - 12) return;

      const col = getPitchColor(p.pitchName || p.pitchType, p.pitchType);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(pxX, pxY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 1.3;
      ctx.stroke();
    });
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
  ctx.font = "bold 19px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(msg, x + w / 2, y + h / 2);
  ctx.textAlign = "left";
}

export async function downloadPitchingCard(
  data: PitchGameDataResponse,
  pitcher: PitcherProfile,
  gameLog: PitcherGameLog,
  branch: "lvbp" | "mlb",
  gameLogs: PitcherGameLog[] = []
) {
  const blob = await generatePitchingCardBlob(data, pitcher, gameLog, branch, gameLogs);
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cleanName = pitcher.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  const modePrefix = data.timeMode === "season" ? "season" : "game";
  const safeDate = String(gameLog.date || "reporte").replace(/\s+/g, "_");
  a.download = `pitching_summary_3x4_${cleanName}_${modePrefix}_${safeDate}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
