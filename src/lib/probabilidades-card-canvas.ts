import { GameProjection, ValueAssessment } from "@/types/probabilidades";

/**
 * Pre-carga una imagen desde una URL con timeout seguro
 */
async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => {
      resolve(null);
    }, 4000);

    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Genera la Tarjeta Gráfica HD en Canvas HTML5 para Líneas & Probabilidades (Tipster)
 * Soporta dos formatos:
 * - 'square': 2400 x 2400 px (1:1, Twitter / Feed Instagram)
 * - 'story': 1080 x 1920 px (9:16, Instagram Stories / Estados de WhatsApp)
 */
export async function generateProbabilidadesCardBlob(
  dateStr: string,
  projections: GameProjection[],
  topPicks: ValueAssessment[],
  mispricedAlerts: ValueAssessment[],
  format: "square" | "story" = "square"
): Promise<Blob | null> {
  const isSquare = format === "square";
  const width = isSquare ? 2400 : 1080;
  const height = isSquare ? 2400 : 1920;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // ── 1. Fondo Dark Navy (#070B19) con degradado y destello ──
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#050814");
  bgGrad.addColorStop(0.5, "#070B19");
  bgGrad.addColorStop(1, "#0A1024");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Destello radial dorado en esquina superior derecha
  const glow = ctx.createRadialGradient(width - 200, 200, 50, width - 200, 200, 600);
  glow.addColorStop(0, "rgba(253, 184, 39, 0.08)");
  glow.addColorStop(1, "rgba(7, 11, 25, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // ── 2. Pre-cargar logos de los equipos ──
  const logoMap = new Map<number, HTMLImageElement | null>();
  const logoPromises = projections.flatMap((p) => [
    loadImage(p.homeTeamLogo).then((img) => logoMap.set(p.homeTeamId, img)),
    loadImage(p.awayTeamLogo).then((img) => logoMap.set(p.awayTeamId, img)),
  ]);
  const appLogoPromise = loadImage("/assets/logo.png");
  const [appLogo] = await Promise.all([appLogoPromise, ...logoPromises]);

  // Factor de escala según formato
  const scale = isSquare ? 1.0 : 0.45;
  const marginX = isSquare ? 90 : 40;

  // ── 3. Cabecera (Header) ──
  const headerY = isSquare ? 80 : 50;

  // Logo de la App
  if (appLogo) {
    const lSize = isSquare ? 110 : 64;
    ctx.drawImage(appLogo, marginX, headerY, lSize, lSize);
  }

  const textStartX = marginX + (isSquare ? 135 : 80);

  // Marca República Caraquista
  ctx.fillStyle = "#FDB827"; // Dorado caraquista
  ctx.font = `bold ${isSquare ? 32 : 18}px 'Inter', sans-serif`;
  ctx.fillText("REPÚBLICA CARAQUISTA", textStartX, headerY + (isSquare ? 32 : 20));

  // Título Principal
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `900 ${isSquare ? 56 : 30}px 'Inter', sans-serif`;
  ctx.fillText("LÍNEAS & PROBABILIDADES SABERMÉTRICAS", textStartX, headerY + (isSquare ? 85 : 48));

  // Subtítulo con fecha y liga
  ctx.fillStyle = "#94A3B8";
  ctx.font = `${isSquare ? 28 : 16}px 'Inter', sans-serif`;
  ctx.fillText(
    `LVBP • Jornada ${dateStr} • Modelos ELO + FIP + Parques • Cuotas de Mercado`,
    textStartX,
    headerY + (isSquare ? 122 : 70)
  );

  // Badge de Cuotas Desfasadas si existen
  let currentY = headerY + (isSquare ? 160 : 95);

  if (mispricedAlerts.length > 0) {
    const bannerH = isSquare ? 100 : 60;
    const bannerW = width - marginX * 2;

    ctx.fillStyle = "rgba(253, 184, 39, 0.12)";
    drawRoundedRect(ctx, marginX, currentY, bannerW, bannerH, 16);
    ctx.fill();

    ctx.strokeStyle = "rgba(253, 184, 39, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#FDB827";
    ctx.font = `bold ${isSquare ? 32 : 18}px 'Inter', sans-serif`;
    ctx.fillText("⚡ ALERTA DE CUOTA DESFASADA / MERCADO INEFICIENTE:", marginX + (isSquare ? 30 : 16), currentY + (isSquare ? 42 : 26));

    const alertSample = mispricedAlerts[0];
    ctx.fillStyle = "#E2E8F0";
    ctx.font = `${isSquare ? 26 : 14}px 'Inter', sans-serif`;
    ctx.fillText(
      `${alertSample.label} en ${alertSample.sportsbookName} paga a cuota ${alertSample.marketOdds.toFixed(2)} (Cuota Justa: ${alertSample.fairOdds.toFixed(2)}) ➔ +${alertSample.evPercent}% EV`,
      marginX + (isSquare ? 30 : 16),
      currentY + (isSquare ? 78 : 48)
    );

    currentY += bannerH + (isSquare ? 35 : 20);
  }

  // ── 4. Renderizado de las Tarjetas de Partido ──
  const gamesCount = Math.min(4, projections.length);
  const cardGap = isSquare ? 28 : 16;
  const availH = height - currentY - (isSquare ? 140 : 100);
  const cardH = (availH - cardGap * (gamesCount - 1)) / gamesCount;
  const cardW = width - marginX * 2;

  for (let i = 0; i < gamesCount; i++) {
    const game = projections[i];
    const cardY = currentY + i * (cardH + cardGap);

    // Fondo de tarjeta de juego
    ctx.fillStyle = "#0D152B";
    drawRoundedRect(ctx, marginX, cardY, cardW, cardH, 16);
    ctx.fill();

    ctx.strokeStyle = game.topPick?.rating === "mispriced" ? "rgba(253, 184, 39, 0.4)" : "#1E2B4D";
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Bloque Equipos (Columna Izquierda) ──
    const homeLogo = logoMap.get(game.homeTeamId);
    const awayLogo = logoMap.get(game.awayTeamId);
    const logoSz = isSquare ? 64 : 36;

    // Visitante (Away)
    const awayRowY = cardY + cardH * 0.32;
    if (awayLogo) ctx.drawImage(awayLogo, marginX + (isSquare ? 25 : 14), awayRowY - logoSz * 0.7, logoSz, logoSz);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${isSquare ? 32 : 18}px 'Inter', sans-serif`;
    ctx.fillText(game.awayTeamAbbr, marginX + (isSquare ? 105 : 58), awayRowY);

    ctx.fillStyle = "#94A3B8";
    ctx.font = `${isSquare ? 22 : 12}px 'Inter', sans-serif`;
    ctx.fillText(
      `${game.awayPitcher.name} (${game.awayPitcher.throws}) • FIP ${game.awayPitcher.fip.toFixed(2)}`,
      marginX + (isSquare ? 190 : 105),
      awayRowY
    );

    // Local (Home)
    const homeRowY = cardY + cardH * 0.72;
    if (homeLogo) ctx.drawImage(homeLogo, marginX + (isSquare ? 25 : 14), homeRowY - logoSz * 0.7, logoSz, logoSz);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${isSquare ? 32 : 18}px 'Inter', sans-serif`;
    ctx.fillText(game.homeTeamAbbr, marginX + (isSquare ? 105 : 58), homeRowY);

    ctx.fillStyle = "#94A3B8";
    ctx.font = `${isSquare ? 22 : 12}px 'Inter', sans-serif`;
    ctx.fillText(
      `${game.homePitcher.name} (${game.homePitcher.throws}) • FIP ${game.homePitcher.fip.toFixed(2)}`,
      marginX + (isSquare ? 190 : 105),
      homeRowY
    );

    // ── Bloque Probabilidades del Modelo (Centro) ──
    const centerColX = marginX + cardW * (isSquare ? 0.42 : 0.44);

    ctx.fillStyle = "#64748B";
    ctx.font = `bold ${isSquare ? 18 : 10}px 'Inter', sans-serif`;
    ctx.fillText("PROB. MODELO (JUSTA)", centerColX, cardY + cardH * 0.22);

    // Prob Away
    ctx.fillStyle = game.model.awayWinProb > 0.5 ? "#FDB827" : "#CBD5E1";
    ctx.font = `bold ${isSquare ? 28 : 16}px 'Inter', sans-serif`;
    ctx.fillText(
      `${(game.model.awayWinProb * 100).toFixed(1)}% (Cuota ${game.model.fairAwayDecimal.toFixed(2)})`,
      centerColX,
      awayRowY
    );

    // Prob Home
    ctx.fillStyle = game.model.homeWinProb > 0.5 ? "#FDB827" : "#CBD5E1";
    ctx.font = `bold ${isSquare ? 28 : 16}px 'Inter', sans-serif`;
    ctx.fillText(
      `${(game.model.homeWinProb * 100).toFixed(1)}% (Cuota ${game.model.fairHomeDecimal.toFixed(2)})`,
      centerColX,
      homeRowY
    );

    // ── Bloque Mercado & Mejor Cuota (Columna Derecha) ──
    const rightColX = marginX + cardW * (isSquare ? 0.68 : 0.72);

    ctx.fillStyle = "#64748B";
    ctx.font = `bold ${isSquare ? 18 : 10}px 'Inter', sans-serif`;
    ctx.fillText("MEJOR CUOTA MERCADO", rightColX, cardY + cardH * 0.22);

    // Mejor Cuota Away
    ctx.fillStyle = "#10B981"; // Verde esmeralda
    ctx.font = `bold ${isSquare ? 26 : 15}px 'Inter', sans-serif`;
    ctx.fillText(
      `${game.bestOdds.bestAwayMl.odds.toFixed(2)} (${game.bestOdds.bestAwayMl.sportsbookName.slice(0, 8)})`,
      rightColX,
      awayRowY
    );

    // Mejor Cuota Home
    ctx.fillStyle = "#10B981";
    ctx.font = `bold ${isSquare ? 26 : 15}px 'Inter', sans-serif`;
    ctx.fillText(
      `${game.bestOdds.bestHomeMl.odds.toFixed(2)} (${game.bestOdds.bestHomeMl.sportsbookName.slice(0, 8)})`,
      rightColX,
      homeRowY
    );

    // ── Badge de Pick Recomendado (+EV) ──
    if (game.topPick && game.topPick.evPercent >= 4.0) {
      const isMis = game.topPick.rating === "mispriced";
      const badgeW = isSquare ? 240 : 120;
      const badgeH = isSquare ? 50 : 28;
      const badgeX = marginX + cardW - badgeW - (isSquare ? 25 : 12);
      const badgeY = cardY + (cardH - badgeH) / 2;

      ctx.fillStyle = isMis ? "#FDB827" : "#10B981";
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
      ctx.fill();

      ctx.fillStyle = "#070B19";
      ctx.font = `900 ${isSquare ? 22 : 11}px 'Inter', sans-serif`;
      ctx.textAlign = "center";
      const badgeText = isMis ? `⚡ +${game.topPick.evPercent}% EV` : `VALOR +${game.topPick.evPercent}%`;
      ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH * 0.68);
      ctx.textAlign = "left"; // Restaurar
    }
  }

  // ── 5. Pie de Página (Footer Oficial y Disclaimer) ──
  const footerY1 = height - (isSquare ? 65 : 42);
  const footerY2 = height - (isSquare ? 35 : 20);

  ctx.fillStyle = "#64748B";
  ctx.font = `${isSquare ? 22 : 12}px 'Inter', sans-serif`;
  ctx.fillText("REPÚBLICA CARAQUISTA • @republicaraquista • Jorge Leonardo Loreto", marginX, footerY1);

  const rightText = "Benchmarks: JuegaEnLínea • Betcris • SellaTuParley • Apuestas Royal";
  ctx.textAlign = "right";
  ctx.fillText(rightText, width - marginX, footerY1);

  // Línea 2: Disclaimer de fines informativos y juego responsable
  ctx.fillStyle = "#475569";
  ctx.font = `italic ${isSquare ? 18 : 10}px 'Inter', sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(
    "Fines estrictamente informativos y de modelado sabermétrico • Cuotas de referencia • Juego Responsable (+18)",
    width / 2,
    footerY2
  );
  ctx.textAlign = "left";

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/png");
  });
}
