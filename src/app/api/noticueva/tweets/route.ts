import { NextRequest, NextResponse } from "next/server";
import {
  getEmbeddedTweets,
  addEmbeddedTweet,
  deleteEmbeddedTweet,
} from "@/lib/tweets-service";
import { NOTICUEVA_ADMIN_PASSWORD } from "@/lib/noticueva-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tweets = await getEmbeddedTweets();
    return NextResponse.json({
      success: true,
      data: tweets,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error al obtener tuits embebidos" },
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
        { success: false, error: "No autorizado." },
        { status: 401 }
      );
    }

    const { text, url, authorName, handle, date } = body;
    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "El texto del tuit es obligatorio." },
        { status: 400 }
      );
    }

    const tweet = await addEmbeddedTweet({
      text: text.trim(),
      url: url?.trim() || "https://x.com/RepubCaraquista",
      authorName: authorName?.trim() || "RepubliCaraquista ®©",
      handle: handle?.trim() || "@RepubCaraquista",
      date:
        date?.trim() ||
        new Date().toLocaleDateString("es-VE", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tuit embebido agregado exitosamente.",
        data: tweet,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al agregar tuit",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("x-admin-key") || "";
    const url = new URL(request.url);
    const password = url.searchParams.get("password") || authHeader;
    const id = url.searchParams.get("id");

    if (password !== NOTICUEVA_ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "No autorizado." },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID del tuit requerido." },
        { status: 400 }
      );
    }

    await deleteEmbeddedTweet(id);
    return NextResponse.json({
      success: true,
      message: "Tuit embebido eliminado.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error al eliminar tuit" },
      { status: 500 }
    );
  }
}
