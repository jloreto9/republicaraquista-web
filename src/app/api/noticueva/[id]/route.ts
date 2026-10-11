import { NextRequest, NextResponse } from "next/server";
import {
  updateNotiCuevaPost,
  deleteNotiCuevaPost,
  NOTICUEVA_ADMIN_PASSWORD,
} from "@/lib/noticueva-service";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("x-admin-key") || "";
    const body = await request.json();
    const password = body.password || authHeader;

    if (password !== NOTICUEVA_ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "No autorizado." },
        { status: 401 }
      );
    }

    const updated = await updateNotiCuevaPost(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Nota no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Nota actualizada exitosamente.",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error al actualizar nota." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("x-admin-key") || "";
    const url = new URL(request.url);
    const password = url.searchParams.get("password") || authHeader;

    if (password !== NOTICUEVA_ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "No autorizado." },
        { status: 401 }
      );
    }

    await deleteNotiCuevaPost(id);
    return NextResponse.json({
      success: true,
      message: "Nota eliminada de la NotiCueva.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error al eliminar nota." },
      { status: 500 }
    );
  }
}
