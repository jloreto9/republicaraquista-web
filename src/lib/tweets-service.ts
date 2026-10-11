import fs from "fs";
import path from "path";
import { EmbeddedTweet } from "@/types/noticueva";
import { supabase } from "@/lib/supabase";
import { DEFAULT_EMBEDDED_TWEETS } from "./tweet-constants";

export { DEFAULT_EMBEDDED_TWEETS };

function getTweetsFilePath(): string {
  return path.join(process.cwd(), "public", "data", "embedded_tweets.json");
}

export function readLocalTweets(): EmbeddedTweet[] {
  try {
    const filePath = getTweetsFilePath();
    if (!fs.existsSync(filePath)) {
      return DEFAULT_EMBEDDED_TWEETS;
    }
    const data = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    // Entorno de solo lectura
  }
  return DEFAULT_EMBEDDED_TWEETS;
}

export function writeLocalTweets(tweets: EmbeddedTweet[]): void {
  try {
    const filePath = getTweetsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(tweets, null, 2), "utf-8");
  } catch {
    // Silencioso en Vercel EROFS
  }
}

export async function getEmbeddedTweets(): Promise<EmbeddedTweet[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("noticueva_tweets")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          id: String(row.id),
          url: row.url || "https://x.com/RepubCaraquista",
          authorName: row.author_name || "RepubliCaraquista ®©",
          handle: row.handle || "@RepubCaraquista",
          text: row.text,
          date:
            row.date ||
            new Date(row.created_at).toLocaleDateString("es-VE", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          likes: row.likes,
          retweets: row.retweets,
        }));
      }

      if (error) {
        console.warn("Supabase noticueva_tweets error:", error.message);
      }
    } catch (err) {
      console.warn("Supabase fallo al consultar noticueva_tweets, usando local:", err);
    }
  }

  return readLocalTweets();
}

export async function addEmbeddedTweet(
  tweet: Omit<EmbeddedTweet, "id">
): Promise<EmbeddedTweet> {
  const newTweet: EmbeddedTweet = {
    ...tweet,
    id: `tweet-${Date.now()}`,
  };

  if (supabase) {
    const { data, error } = await supabase
      .from("noticueva_tweets")
      .insert({
        url: newTweet.url,
        author_name: newTweet.authorName,
        handle: newTweet.handle,
        text: newTweet.text,
        date: newTweet.date,
        likes: newTweet.likes || 0,
        retweets: newTweet.retweets || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error al guardar tuit en Supabase:", error);
      if (error.code === "PGRST205" || error.message.includes("Could not find the table")) {
        throw new Error(
          "La tabla 'noticueva_tweets' no existe en Supabase. Debes ejecutar el script de migración SQL en Supabase para habilitar el guardado permanente."
        );
      }
      throw new Error(`Error en base de datos Supabase: ${error.message}`);
    }

    if (data) {
      newTweet.id = String(data.id);
    }
  } else {
    const current = readLocalTweets();
    writeLocalTweets([newTweet, ...current]);
  }

  try {
    const current = readLocalTweets();
    writeLocalTweets([newTweet, ...current]);
  } catch {}

  return newTweet;
}

export async function deleteEmbeddedTweet(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from("noticueva_tweets").delete().eq("id", id);
    if (error) {
      console.error("Error al eliminar tuit en Supabase:", error);
      throw new Error(`Error en base de datos Supabase: ${error.message}`);
    }
  }

  try {
    const current = readLocalTweets();
    const filtered = current.filter((t) => t.id !== id);
    writeLocalTweets(filtered);
  } catch {}

  return true;
}
