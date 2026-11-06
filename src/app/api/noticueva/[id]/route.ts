import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
    const password = (authHeader || body.password || "").trim();

    if (!NOTICUEVA_ADMIN_PASSWORD || !password || password !== NOTICUEVA_ADMIN_PASSWORD) {
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

    try {
      revalidatePath("/noticueva");
      revalidatePath("/admin");
      revalidatePath("/");
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Nota actualizada exitosamente.",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al actualizar nota.",
      },
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
    const authHeader =
      request.headers.get("x-admin-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      "";
    const url = new URL(request.url);
    const password = (authHeader || url.searchParams.get("password") || "").trim();

    if (!NOTICUEVA_ADMIN_PASSWORD || !password || password !== NOTICUEVA_ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "No autorizado." },
        { status: 401 }
      );
    }

    await deleteNotiCuevaPost(id);

    try {
      revalidatePath("/noticueva");
      revalidatePath("/admin");
      revalidatePath("/");
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Nota eliminada de la NotiCueva.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al eliminar nota.",
      },
      { status: 500 }
    );
  }
}
