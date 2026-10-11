import { NextRequest, NextResponse } from "next/server";
import {
  getNotiCuevaPosts,
  createNotiCuevaPost,
  NOTICUEVA_ADMIN_PASSWORD,
} from "@/lib/noticueva-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await getNotiCuevaPosts();
    return NextResponse.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error al obtener notas de la NotiCueva" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("x-admin-key") || "";
    const body = await request.json();
    const password = body.password || authHeader;

    if (password !== NOTICUEVA_ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "No autorizado. Clave de redactor requerida." },
        { status: 401 }
      );
    }

    const { title, content, author, imageUrl } = body;
    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "El título de la nota es obligatorio." },
        { status: 400 }
      );
    }
    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "El contenido de la nota es obligatorio." },
        { status: 400 }
      );
    }

    const post = await createNotiCuevaPost({
      title,
      content,
      author,
      imageUrl,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Nota publicada exitosamente en la NotiCueva.",
        data: post,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al publicar nota",
      },
      { status: 500 }
    );
  }
}
