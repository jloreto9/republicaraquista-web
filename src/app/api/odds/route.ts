import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") || "";

    // 1. Intentar consultar Supabase en la tabla lvbp_odds si está disponible
    if (supabase) {
      try {
        let query = supabase.from("lvbp_odds").select("*");
        if (dateParam) {
          query = query.eq("game_date", dateParam);
        } else {
          query = query.order("game_date", { ascending: false }).limit(1);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const row = data[0];
          return NextResponse.json(
            {
              success: true,
              source: "supabase",
              date: row.game_date,
              updatedAt: row.updated_at,
              data: row.odds_json,
            },
            {
              status: 200,
              headers: {
                "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
              },
            }
          );
        }
      } catch (sbErr) {
        console.warn("Error consultando tabla lvbp_odds en Supabase:", sbErr);
      }
    }

    // 2. Fallback: Leer archivo snapshot local public/data/lvbp_odds_latest.json
    try {
      const filePath = path.join(process.cwd(), "public", "data", "lvbp_odds_latest.json");
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(fileContent);
        return NextResponse.json(
          {
            success: true,
            source: "local_snapshot",
            date: parsed.date || dateParam,
            updatedAt: parsed.updatedAt,
            data: parsed,
          },
          {
            status: 200,
            headers: {
              "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
            },
          }
        );
      }
    } catch (fsErr) {
      console.warn("No se pudo leer snapshot local public/data/lvbp_odds_latest.json:", fsErr);
    }

    // 3. Si no hay datos específicos en BD o snapshot
    return NextResponse.json(
      {
        success: true,
        source: "none",
        date: dateParam,
        data: null,
        message: "No hay cuotas en vivo registradas para esta fecha.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("Error en /api/odds:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al consultar cuotas",
      },
      { status: 500 }
    );
  }
}
