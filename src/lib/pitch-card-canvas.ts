import { PitchGameDataResponse, PitcherProfile, PitcherGameLog } from "@/types/pitching";

export async function generatePitchingCardBlob(
  data: PitchGameDataResponse,
  pitcher: PitcherProfile,
  gameLog: PitcherGameLog,
  branch: "lvbp" | "mlb"
): Promise<Blob | null> {
  const width = 2400;
  const height = 1350;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 1. Fondo Dark Navy
  ctx.fillStyle = "#070B19";
  ctx.fillRect(0, 0, width, height);

  // Gradiente sutil
  const grad = ctx.createRadialGradient(width / 2, 200, 100, width / 2, 600, 1400);
  grad.addColorStop(0, "rgba(253, 184, 39, 0.08)");
  grad.addColorStop(1, "rgba(7, 11, 25, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Cabecera (Avatar + Info + Marca)
  const headerY = 70;

  // Intentar cargar y dibujar avatar
  try {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = pitcher.photoUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    // Marco Avatar
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(80, headerY, 150, 150, 24);
    ctx.clip();
    ctx.fillStyle = "#0D152B";
    ctx.fillRect(80, headerY, 150, 150);
    ctx.drawImage(img, 80, headerY, 150, 150);
    ctx.restore();

    // Borde Avatar
    ctx.strokeStyle = "#FDB827";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(80, headerY, 150, 150, 24);
    ctx.stroke();
  } catch {
    // Si falla la imagen, dibujar avatar de respaldo
    ctx.fillStyle = "#0D152B";
    ctx.beginPath();
    ctx.roundRect(80, headerY, 150, 150, 24);
    ctx.fill();
    ctx.strokeStyle = "#FDB827";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // Nombre y Datos Biográficos
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 48px Inter, system-ui, sans-serif";
  ctx.fillText(pitcher.name, 260, headerY + 55);

  ctx.fillStyle = "#FDB827";
  ctx.font = "bold 24px Inter, system-ui, sans-serif";
  const bio = `${pitcher.team.toUpperCase()} • ${pitcher.position} (${pitcher.throws}HP) • #${pitcher.id}`;
  ctx.fillText(bio, 260, headerY + 95);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "500 22px Inter, monospace";
  const outing =
    data.timeMode === "season"
      ? `Temporada Completa (${data.gamesCount || "—"} Salidas acumuladas • Récord: ${gameLog.decision || "—"})`
      : `Salida del ${gameLog.date} vs ${gameLog.opponent} (${gameLog.role}${
          gameLog.decision ? ` • Decisión: ${gameLog.decision}` : ""
        })`;
  ctx.fillText(outing, 260, headerY + 135);

  // Logo / Branding Header Derecho
  ctx.textAlign = "right";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 34px Inter, system-ui, sans-serif";
  ctx.fillText("REPÚBLICA CARAQUISTA", width - 80, headerY + 55);

  ctx.fillStyle = "#FDB827";
  ctx.font = "bold 20px Inter, monospace";
  ctx.fillText(
    data.timeMode === "season"
      ? branch === "lvbp"
        ? "PITCHING SUMMARY LVBP (TEMPORADA)"
        : "STATCAST SUMMARY (TEMPORADA)"
      : branch === "lvbp"
      ? "PITCHING SUMMARY LVBP"
      : "STATCAST & HAWK-EYE SUMMARY",
    width - 80,
    headerY + 95
  );

  ctx.fillStyle = "#64748B";
  ctx.font = "500 18px Inter, sans-serif";
  ctx.fillText("TEMPORADA 2025-26", width - 80, headerY + 130);
  ctx.textAlign = "left";

  // 3. Pastillas de Boxscore (KPIs)
  const kpiY = 260;
  const kpiWidth = 210;
  const kpiGap = 20;
  const kpis = [
    { label: "IP", val: data.boxscore.ip, color: "#FDB827" },
    { label: "H", val: String(data.boxscore.h), color: "#FFFFFF" },
    { label: "R", val: String(data.boxscore.r), color: "#FFFFFF" },
    { label: "ER", val: String(data.boxscore.er), color: "#FFFFFF" },
    { label: "BB", val: String(data.boxscore.bb), color: "#FFFFFF" },
    { label: "SO", val: String(data.boxscore.so), color: "#FDB827" },
    { label: "PIT", val: String(data.boxscore.pitches), color: "#FFFFFF" },
    { label: "STR", val: String(data.boxscore.strikes), color: "#10B981" },
    {
      label: data.timeMode === "season" ? "ERA" : "CSW%",
      val: data.timeMode === "season" ? data.boxscore.era || "0.00" : data.boxscore.cswPct,
      color: "#38BDF8",
    },
    {
      label: data.timeMode === "season" ? "WHIP" : "WHIFF%",
      val: data.timeMode === "season" ? data.boxscore.whip || "0.00" : data.boxscore.whiffPct,
      color: "#FDB827",
    },
  ];

  kpis.forEach((kpi, i) => {
    const x = 80 + i * (kpiWidth + kpiGap);
    if (x + kpiWidth > width - 80) return;

    ctx.fillStyle = "#0D152B";
    ctx.strokeStyle = "#1E2B4D";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, kpiY, kpiWidth, 80, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#94A3B8";
    ctx.font = "600 16px monospace";
    ctx.fillText(kpi.label, x + 16, kpiY + 30);

    ctx.fillStyle = kpi.color;
    ctx.font = "900 30px monospace";
    ctx.fillText(kpi.val, x + 16, kpiY + 65);
  });

  // 4. Contenedores Centrales
  const bodyY = 370;

  if (branch === "lvbp") {
    // ── LVBP Mode ──
    // Izquierda: Tabla de Destinos Sabermétricos (Ancho: 1050px)
    ctx.fillStyle = "#0D152B";
    ctx.strokeStyle = "#1E2B4D";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(80, bodyY, 1080, 840, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FDB827";
    ctx.font = "bold 26px Inter, sans-serif";
    ctx.fillText("Destinos de Pitcheos (Play-by-Play)", 120, bodyY + 60);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "18px monospace";
    ctx.fillText("Desglose porcentual y control del plato", 120, bodyY + 95);

    // Filas de la tabla
    let rowY = bodyY + 160;
    data.pbpTable.forEach((row) => {
      ctx.fillStyle = row.color;
      ctx.beginPath();
      ctx.arc(130, rowY - 8, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "600 24px Inter, sans-serif";
      ctx.fillText(row.destination, 160, rowY);

      ctx.textAlign = "right";
      ctx.font = "bold 26px monospace";
      ctx.fillText(`${row.count} (${row.pct})`, 1100, rowY);
      ctx.textAlign = "left";

      // Barra de porcentaje
      ctx.fillStyle = "#070B19";
      ctx.beginPath();
      ctx.roundRect(160, rowY + 16, 940, 16, 8);
      ctx.fill();

      const pctVal = parseFloat(row.pct) || 0;
      ctx.fillStyle = row.color;
      ctx.beginPath();
      ctx.roundRect(160, rowY + 16, (940 * pctVal) / 100, 16, 8);
      ctx.fill();

      rowY += 120;
    });

    // Derecha: Panel de 2 tarjetas (Carga por Entrada + Splits)
    const rightX = 1200;
    const rightW = width - rightX - 80;

    // Tarjeta Carga por entrada
    ctx.fillStyle = "#0D152B";
    ctx.strokeStyle = "#1E2B4D";
    ctx.beginPath();
    ctx.roundRect(rightX, bodyY, rightW, 400, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FDB827";
    ctx.font = "bold 24px Inter, sans-serif";
    ctx.fillText("Carga de Trabajo por Entrada (Workload)", rightX + 40, bodyY + 50);

    // Dibujar barras apiladas
    const innCount = Math.max(data.inningsWorkload.length, 1);
    const colW = Math.min((rightW - 100) / innCount, 90);
    const maxP = Math.max(...data.inningsWorkload.map((w) => w.pitches), 20);

    data.inningsWorkload.forEach((inn, i) => {
      const bx = rightX + 60 + i * (colW + 20);
      const strH = (inn.strikes / maxP) * 180;
      const bllH = (inn.balls / maxP) * 180;
      const baseY = bodyY + 320;

      // Balls (Azul)
      ctx.fillStyle = "#3B82F6";
      ctx.fillRect(bx, baseY - strH - bllH, colW, bllH);
      // Strikes (Verde)
      ctx.fillStyle = "#10B981";
      ctx.fillRect(bx, baseY - strH, colW, strH);

      ctx.fillStyle = "#E2E8F0";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`Inn ${inn.inning}`, bx + colW / 2, baseY + 30);
      ctx.fillText(`${inn.pitches}P`, bx + colW / 2, baseY - strH - bllH - 10);
      ctx.textAlign = "left";
    });

    // Tarjeta Platoon Splits
    const splitsY = bodyY + 440;
    ctx.fillStyle = "#0D152B";
    ctx.strokeStyle = "#1E2B4D";
    ctx.beginPath();
    ctx.roundRect(rightX, splitsY, rightW, 400, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FDB827";
    ctx.font = "bold 24px Inter, sans-serif";
    ctx.fillText("Splits por Mano de Bateador (LHB vs RHB)", rightX + 40, splitsY + 50);

    // LHB Box
    ctx.fillStyle = "#070B19";
    ctx.beginPath();
    ctx.roundRect(rightX + 40, splitsY + 80, rightW - 80, 120, 16);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.fillText(`vs Bateadores Zurdos (LHB) • ${data.splitsPlatoon.vsLhb.pitches} Pitcheos`, rightX + 60, splitsY + 120);
    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 22px monospace";
    ctx.fillText(
      `Strike%: ${data.splitsPlatoon.vsLhb.strikePct}  |  Whiff%: ${data.splitsPlatoon.vsLhb.whiffPct}  |  CSW%: ${data.splitsPlatoon.vsLhb.cswPct}`,
      rightX + 60,
      splitsY + 165
    );

    // RHB Box
    ctx.fillStyle = "#070B19";
    ctx.beginPath();
    ctx.roundRect(rightX + 40, splitsY + 220, rightW - 80, 120, 16);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.fillText(`vs Bateadores Derechos (RHB) • ${data.splitsPlatoon.vsRhb.pitches} Pitcheos`, rightX + 60, splitsY + 260);
    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 22px monospace";
    ctx.fillText(
      `Strike%: ${data.splitsPlatoon.vsRhb.strikePct}  |  Whiff%: ${data.splitsPlatoon.vsRhb.whiffPct}  |  CSW%: ${data.splitsPlatoon.vsRhb.cswPct}`,
      rightX + 60,
      splitsY + 305
    );
  } else {
    // ── MLB Mode (Statcast) ──
    ctx.fillStyle = "#0D152B";
    ctx.strokeStyle = "#1E2B4D";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(80, bodyY, width - 160, 840, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FDB827";
    ctx.font = "bold 26px Inter, sans-serif";
    ctx.fillText("Matriz Sabermétrica de Repertorio Hawk-Eye", 120, bodyY + 60);

    // Tabla de pitcheos
    let rowY = bodyY + 140;
    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 18px monospace";
    ctx.fillText("LANZAMIENTO", 120, rowY);
    ctx.fillText("USO%", 550, rowY);
    ctx.fillText("VELO AVG", 750, rowY);
    ctx.fillText("SPIN", 1000, rowY);
    ctx.fillText("iVB (in)", 1250, rowY);
    ctx.fillText("HB (in)", 1500, rowY);
    ctx.fillText("WHIFF%", 1750, rowY);
    ctx.fillText("CSW%", 2000, rowY);

    rowY += 20;
    ctx.strokeStyle = "#1E2B4D";
    ctx.beginPath();
    ctx.moveTo(120, rowY);
    ctx.lineTo(width - 120, rowY);
    ctx.stroke();

    rowY += 50;
    data.statcastTable.forEach((row) => {
      ctx.fillStyle = row.color;
      ctx.beginPath();
      ctx.arc(130, rowY - 7, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 22px Inter, sans-serif";
      ctx.fillText(row.pitchName, 155, rowY);

      ctx.font = "20px monospace";
      ctx.fillStyle = "#FDB827";
      ctx.fillText(row.usagePct, 550, rowY);

      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(`${row.veloAvg}`, 750, rowY);
      ctx.fillText(`${row.spinAvg}`, 1000, rowY);

      ctx.fillStyle = "#38BDF8";
      ctx.fillText(`${row.ivb}`, 1250, rowY);

      ctx.fillStyle = "#10B981";
      ctx.fillText(`${row.hb}`, 1500, rowY);

      ctx.fillStyle = "#FDB827";
      ctx.fillText(row.whiffPct, 1750, rowY);

      ctx.fillStyle = "#38BDF8";
      ctx.fillText(row.cswPct, 2000, rowY);

      rowY += 60;
    });
  }

  // 5. Pie de Página (Créditos Oficiales Obligatorios)
  const footerY = height - 45;
  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 18px Inter, sans-serif";
  ctx.fillText("@republicaraquista • Jorge Leonardo Loreto", 80, footerY);

  ctx.textAlign = "center";
  ctx.font = "500 16px Inter, sans-serif";
  ctx.fillStyle = "#64748B";
  ctx.fillText(
    "Plataforma Sabermétrica de República Caraquista • Datos oficiales MLB Stats API",
    width / 2,
    footerY
  );

  ctx.textAlign = "right";
  ctx.fillStyle = "#FDB827";
  ctx.font = "600 16px Inter, sans-serif";
  ctx.fillText("Metodología inspirada en Thomas Nestico (@TJStats)", width - 80, footerY);
  ctx.textAlign = "left";

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
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
  a.download = `pitching_summary_${cleanName}_${gameLog.date}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
