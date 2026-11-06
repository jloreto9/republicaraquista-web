import { NextRequest, NextResponse } from "next/server";
import { sendPushToTopic } from "@/lib/push-service";

export const dynamic = "force-dynamic";

// Caché en memoria para evitar notificaciones duplicadas en la misma ventana de tiempo
const broadcastHistory = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const xAdminKey = request.headers.get("x-admin-key") || "";
    const cronSecret = process.env.CRON_SECRET;
    const adminPassword = process.env.NOTICUEVA_ADMIN_PASSWORD;

    const isPrivileged = Boolean(
      (cronSecret && token === cronSecret) ||
      (adminPassword && (token === adminPassword || xAdminKey === adminPassword))
    );

    const body = await request.json();
    const { gamePk, homeScore, awayScore, title, body: messageBody } = body;

    const numGamePk = Number(gamePk);
    const numHomeScore = Number(homeScore);
    const numAwayScore = Number(awayScore);

    if (
      !numGamePk ||
      Number.isNaN(numGamePk) ||
      numGamePk <= 0 ||
      Number.isNaN(numHomeScore) ||
      numHomeScore < 0 ||
      Number.isNaN(numAwayScore) ||
      numAwayScore < 0
    ) {
      return NextResponse.json(
        { success: false, error: "Parámetros numéricos de jugada inválidos o incompletos." },
        { status: 400 }
      );
    }

    const broadcastKey = `game-${numGamePk}-${numHomeScore}-${numAwayScore}`;
    const now = Date.now();
    const lastSent = broadcastHistory.get(broadcastKey);

    // Evitar reenvíos dentro de 3 minutos para el mismo marcador
    if (lastSent && now - lastSent < 180000) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "Alerta ya despachada para este marcador recientemente",
      });
    }

    broadcastHistory.set(broadcastKey, now);

    // Limpieza de claves viejas (> 6 horas)
    for (const [key, timestamp] of broadcastHistory.entries()) {
      if (now - timestamp > 21600000) {
        broadcastHistory.delete(key);
      }
    }

    // Para clientes no privilegiados, forzar título, cuerpo y URL canónicos para neutralizar inyecciones de phishing o spam
    const safeTitle = isPrivileged && title && typeof title === "string"
      ? title.slice(0, 100)
      : "🦁 ¡Carrera en el Game Center!";
    const safeBody = isPrivileged && messageBody && typeof messageBody === "string"
      ? messageBody.slice(0, 200)
      : `Nuevo marcador en vivo: ${numAwayScore} - ${numHomeScore}`;

    const payload = {
      topic: "scoring_plays" as const,
      title: safeTitle,
      body: safeBody,
      icon: "/icon-512.png",
      badge: "/favicon.ico",
      url: `/game-center?gamePk=${numGamePk}`,
      tag: `scoring-${numGamePk}-${numHomeScore}-${numAwayScore}`,
    };

    const pushResult = await sendPushToTopic(payload);

    return NextResponse.json({
      success: true,
      broadcasted: true,
      result: pushResult,
    });
  } catch (error) {
    console.error("Error en /api/push/broadcast-scoring:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 500 }
    );
  }
}
