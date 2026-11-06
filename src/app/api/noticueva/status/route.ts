import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { NOTICUEVA_ADMIN_PASSWORD } from "@/lib/noticueva-service";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader =
    request.headers.get("x-admin-key") ||
    request.headers.get("authorization")?.replace("Bearer ", "") ||
    "";
  const isAdmin = Boolean(
    NOTICUEVA_ADMIN_PASSWORD && authHeader.trim() === NOTICUEVA_ADMIN_PASSWORD
  );

  if (!supabase) {
    return NextResponse.json({
      supabaseConfigured: false,
      ready: false,
      postsTableExists: false,
      error: isAdmin ? "Supabase no está inicializado." : undefined,
    });
  }

  let postsTableExists = false;
  let postsError: string | null = null;

  try {
    const { error: pErr } = await supabase
      .from("noticueva_posts")
      .select("id")
      .limit(1);

    if (!pErr) {
      postsTableExists = true;
    } else if (isAdmin) {
      postsError = pErr.message;
    }
  } catch (err: unknown) {
    if (isAdmin) {
      postsError = err instanceof Error ? err.message : "Error al verificar conexión";
    }
  }

  // Leer script SQL de migración únicamente para administradores autenticados
  let sqlMigration = "";
  if (isAdmin) {
    try {
      const sqlPath = path.join(process.cwd(), "supabase", "migrations", "noticueva_posts.sql");
      if (fs.existsSync(sqlPath)) {
        sqlMigration = fs.readFileSync(sqlPath, "utf-8");
      }
    } catch {}
  }

  const ready = postsTableExists;

  return NextResponse.json({
    supabaseConfigured: true,
    ready,
    postsTableExists,
    postsError,
    sqlMigration,
  });
}
