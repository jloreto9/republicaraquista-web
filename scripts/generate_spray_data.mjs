import fs from "fs";
import path from "path";

const LEONES_TEAM_ID = 695;

const EVENT_TRANSLATIONS = {
  Single: "Sencillo (1B)",
  Double: "Doble (2B)",
  Triple: "Triple (3B)",
  "Home Run": "Jonrón (HR)",
  Flyout: "Elevado de out",
  Groundout: "Rolling de out",
  Lineout: "Línea de out",
  "Pop Out": "Foul/Pop out",
  Forceout: "Out forzado",
  "Field Error": "Error de fildeo",
  "Sac Fly": "Elevado de sacrificio",
  "Sac Bunt": "Toque de sacrificio",
  "Double Play": "Doble Play",
  "Grounded Into DP": "Rolling para DP",
};

const TRAJECTORY_TRANSLATIONS = {
  ground_ball: "Rolling (GB)",
  line_drive: "Línea (LD)",
  fly_ball: "Elevado (FB)",
  popup: "Pop up (PU)",
  unknown: "Sin dato",
};

const HARDNESS_TRANSLATIONS = {
  hard: "Fuerte (Hard)",
  medium: "Medio (Medium)",
  soft: "Suave (Soft)",
};

function classifyHardness(event, trajectory, distFt, rawHardness) {
  const ev = event || "Out";
  const traj = trajectory || "unknown";
  const raw = String(rawHardness).toLowerCase();

  // 1. Extremos indiscutibles de poder
  if (ev === "Home Run" || ev === "Triple") return "hard";
  if (ev === "Double" && traj !== "popup") return "hard";
  if (raw === "hard") return "hard";

  // 2. Contacto débil (Soft)
  if (traj === "popup" || traj.includes("bunt") || ev.includes("Bunt") || ev.includes("Pop Out")) {
    return "soft";
  }
  if (raw === "soft") return "soft";
  if (traj === "fly_ball" && distFt < 185) return "soft";
  if (traj === "ground_ball" && distFt < 85 && ev.includes("out")) return "soft";

  // 3. Contacto fuerte (Hard)
  if (traj === "line_drive") {
    if (distFt >= 200 || ev === "Double" || (ev === "Single" && distFt >= 150)) return "hard";
  }
  if (traj === "fly_ball" && distFt >= 310) return "hard";
  if (traj === "ground_ball" && distFt >= 155) return "hard";

  return "medium";
}

async function main() {
  console.log("Iniciando extracción de telemetría de spray charts para Leones 2025...");
  const seasonDataPath = path.join(process.cwd(), "src", "data", "lvbp_season_2025.json");
  const seasonRaw = JSON.parse(fs.readFileSync(seasonDataPath, "utf8"));

  const leonesLineups = (seasonRaw.lineup_records || []).filter(
    (l) => Number(l.team_id) === LEONES_TEAM_ID
  );
  const gameMap = new Map();
  for (const l of leonesLineups) {
    if (!gameMap.has(l.game_id)) gameMap.set(l.game_id, l);
  }
  const gameIds = Array.from(gameMap.keys());
  console.log(`Extrayendo datos de ${gameIds.length} juegos oficiales de Leones...`);

  const allBattedBalls = [];
  const pitchesByBatter = {};

  const BATCH_SIZE = 8;
  for (let i = 0; i < gameIds.length; i += BATCH_SIZE) {
    const batch = gameIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (gamePk) => {
        try {
          const res = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`, {
            signal: AbortSignal.timeout(15000),
          });
          if (!res.ok) return;
          const json = await res.json();
          const plays = json?.liveData?.plays?.allPlays || [];
          const isHome = json?.gameData?.teams?.home?.id === LEONES_TEAM_ID;
          const gameDate = json?.gameData?.datetime?.originalDate || "";

          for (const play of plays) {
            const isBottom = play.about?.halfInning === "bottom";
            const leonesBatting = isHome ? isBottom : !isBottom;
            if (!leonesBatting) continue;

            const matchup = play.matchup || {};
            const batter = matchup.batter || {};
            const pitcher = matchup.pitcher || {};
            const batSide = matchup.batSide?.code || "R";
            const event = play.result?.event || "Out";
            const rbi = play.result?.rbi || 0;
            const desc = play.result?.description || "";
            const isHit = ["Single", "Double", "Triple", "Home Run"].includes(event);
            const eventGroup = ["Single", "Double", "Triple", "Home Run", "Field Error"].includes(
              event
            )
              ? event
              : "Out";

            for (const ev of play.playEvents || []) {
              // 1. Extraer Batazos (Hit Data)
              if (ev.hitData?.coordinates?.coordX != null && ev.hitData?.coordinates?.coordY != null) {
                const cx = ev.hitData.coordinates.coordX;
                const cy = ev.hitData.coordinates.coordY;
                if (cx !== 0 || cy !== 0) {
                  const xFt = Math.round((cx - 125.0) * 2.5 * 10) / 10;
                  const yFt = Math.round((204.5 - cy) * 2.5 * 10) / 10;
                  const distFt = Math.round(Math.sqrt(xFt * xFt + yFt * yFt) * 10) / 10;
                  const angleDeg = Math.round(((Math.atan2(xFt, yFt) * 180) / Math.PI) * 10) / 10;
                  const traj = ev.hitData.trajectory || "unknown";
                  const rawHard = ev.hitData.hardness || "medium";
                  const hardness = classifyHardness(event, traj, distFt, rawHard);

                  const dir =
                    batSide === "R"
                      ? angleDeg < -15
                        ? "Pull"
                        : angleDeg > 15
                        ? "Oppo"
                        : "Center"
                      : angleDeg > 15
                      ? "Pull"
                      : angleDeg < -15
                      ? "Oppo"
                      : "Center";

                  allBattedBalls.push({
                    gamePk,
                    gameDate,
                    batterId: batter.id,
                    batterName: batter.fullName,
                    pitcherId: pitcher.id,
                    pitcherName: pitcher.fullName,
                    event,
                    eventGroup,
                    eventEs: EVENT_TRANSLATIONS[event] || event,
                    isHit,
                    description: desc,
                    rbi,
                    coordX: cx,
                    coordY: cy,
                    xFt,
                    yFt,
                    distanceFt: distFt,
                    sprayAngle: angleDeg,
                    direction: dir,
                    trajectory: traj,
                    trajectoryEs: TRAJECTORY_TRANSLATIONS[traj] || traj,
                    hardness,
                    hardnessEs: HARDNESS_TRANSLATIONS[hardness] || hardness,
                  });
                }
              }

              // 2. Extraer Pitcheos (Strike Zone Data)
              if (ev.pitchData?.coordinates?.x != null && ev.pitchData?.coordinates?.y != null) {
                const xRaw = ev.pitchData.coordinates.x;
                const yRaw = ev.pitchData.coordinates.y;
                const szTop = ev.pitchData.strikeZoneTop || 3.4;
                const szBot = ev.pitchData.strikeZoneBottom || 1.5;
                const xFt = Math.round((xRaw - 110.0) * (1.417 / 35.0) * 100) / 100;
                const zFt = Math.round((szBot + (szTop - szBot) * ((176.0 - yRaw) / 40.0)) * 100) / 100;

                const inHoriz = xFt >= -0.71 && xFt <= 0.71;
                const inVert = zFt >= szBot && zFt <= szTop;
                const inZone = inHoriz && inVert;

                let zone = 0;
                if (inZone) {
                  const col = xFt < -0.24 ? 0 : xFt < 0.24 ? 1 : 2;
                  const rowHeight = (szTop - szBot) / 3;
                  const row = zFt > szTop - rowHeight ? 0 : zFt > szTop - 2 * rowHeight ? 1 : 2;
                  zone = row * 3 + col + 1;
                }

                const details = ev.details || {};
                const pDesc = details.description || details.call?.description || "Pitch";
                const isSwing =
                  details.isSwing ||
                  [
                    "Swinging Strike",
                    "Swinging Strike (Blocked)",
                    "Foul",
                    "Foul Tip",
                    "Foul Bunt",
                    "In play, out(s)",
                    "In play, no out",
                    "In play, run(s)",
                  ].includes(pDesc);
                const isWhiff = ["Swinging Strike", "Swinging Strike (Blocked)", "Missed Bunt"].includes(
                  pDesc
                );
                const isContact = isSwing && !isWhiff;
                const isCalledStrike = pDesc === "Called Strike";
                const isBall = details.isBall || pDesc.includes("Ball");
                const isStrike = isCalledStrike || isSwing;

                let callGroup = "Ball";
                if (isWhiff) callGroup = "Whiff";
                else if (isCalledStrike) callGroup = "Called Strike";
                else if (isContact) callGroup = pDesc.includes("Foul") ? "Foul" : "In Play";
                else if (isBall) callGroup = "Ball";
                else callGroup = "Other";

                if (!pitchesByBatter[batter.id]) {
                  pitchesByBatter[batter.id] = [];
                }
                pitchesByBatter[batter.id].push({
                  pitchNumber: pitchesByBatter[batter.id].length + 1,
                  callDesc: pDesc,
                  callGroup,
                  xFt,
                  zFt,
                  zone,
                  isSwing,
                  isWhiff,
                  isContact,
                  isCalledStrike,
                  isBall,
                  isStrike,
                  inZone,
                });
              }
            }
          }
        } catch (err) {
          console.error(`Error en juego ${gamePk}:`, err.message);
        }
      })
    );
  }

  // Agrupar conteo de bateadores
  const batterCounts = {};
  for (const b of allBattedBalls) {
    if (!batterCounts[b.batterId]) {
      batterCounts[b.batterId] = { id: b.batterId, name: b.batterName, count: 0 };
    }
    batterCounts[b.batterId].count++;
  }

  const sortedPlayers = Object.values(batterCounts).sort((a, b) => b.count - a.count);
  const playerList = [
    { id: 0, name: "🌟 Toda la Ofensiva de Leones", count: allBattedBalls.length },
    ...sortedPlayers,
  ];

  const output = {
    season: 2025,
    teamId: LEONES_TEAM_ID,
    teamName: "Leones del Caracas",
    totalBattedBalls: allBattedBalls.length,
    players: playerList,
    battedBalls: allBattedBalls,
    pitchesByBatter,
  };

  const targetPath = path.join(process.cwd(), "src", "data", "lvbp_spray_2025.json");
  fs.writeFileSync(targetPath, JSON.stringify(output));
  const fileSizeMb = (fs.statSync(targetPath).size / (1024 * 1024)).toFixed(2);
  console.log(`¡Éxito! Archivo generado en: ${targetPath}`);
  console.log(`Total batazos reales: ${allBattedBalls.length}`);
  console.log(`Total bateadores: ${playerList.length}`);
  console.log(`Tamaño del archivo: ${fileSizeMb} MB`);
}

main().catch(console.error);
