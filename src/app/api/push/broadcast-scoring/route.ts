import { NextRequest, NextResponse } from "next/server";
import { sendPushToTopic } from "@/lib/push-service";

export const dynamic = "force-dynamic";

// Caché en memoria para evitar notificaciones duplicadas en la misma ventana de tiempo
const broadcastHistory = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gamePk, homeScore, awayScore, title, body: messageBody } = body;

    if (!gamePk || homeScore === undefined || awayScore === undefined) {
      return NextResponse.json(
        { success: false, error: "Datos incompletos de la jugada" },
        { status: 400 }
      );
    }

    const broadcastKey = `game-${gamePk}-${homeScore}-${awayScore}`;
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

    const payload = {
      topic: "scoring_plays" as const,
      title: title || "🦁 ¡Carrera en el Game Center!",
      body: messageBody || `Nuevo marcador: ${awayScore} - ${homeScore}`,
      icon: "/icon-512.png",
      badge: "/favicon.ico",
      url: `/game-center?gamePk=${gamePk}`,
      tag: `scoring-${gamePk}-${homeScore}-${awayScore}`,
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
