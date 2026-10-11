import { NextRequest, NextResponse } from "next/server";
import { NOTICUEVA_ADMIN_PASSWORD } from "@/lib/noticueva-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Contraseña requerida." },
        { status: 400 }
      );
    }

    if (password.trim() === NOTICUEVA_ADMIN_PASSWORD) {
      return NextResponse.json({
        success: true,
        message: "Acceso autorizado para Gilberto Méndez.",
      });
    }

    return NextResponse.json(
      { success: false, error: "Contraseña incorrecta." },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error en validación de acceso." },
      { status: 500 }
    );
  }
}
