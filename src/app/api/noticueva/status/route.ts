import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabase) {
    return NextResponse.json({
      supabaseConfigured: false,
      ready: false,
      postsTableExists: false,
      error: "Supabase no está inicializado. Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
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
    } else {
      postsError = pErr.message;
    }
  } catch (err: any) {
    postsError = err?.message || "Error al verificar conexión";
  }

  // Leer script SQL de migración
  let sqlMigration = "";
  try {
    const sqlPath = path.join(process.cwd(), "supabase", "migrations", "noticueva_posts.sql");
    if (fs.existsSync(sqlPath)) {
      sqlMigration = fs.readFileSync(sqlPath, "utf-8");
    }
  } catch {}

  const ready = postsTableExists;

  return NextResponse.json({
    supabaseConfigured: true,
    ready,
    postsTableExists,
    postsError,
    sqlMigration,
  });
}
