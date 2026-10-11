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
      writeLocalTweets(DEFAULT_EMBEDDED_TWEETS);
      return DEFAULT_EMBEDDED_TWEETS;
    }
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.warn("Error leyendo embedded_tweets.json local:", err);
    return DEFAULT_EMBEDDED_TWEETS;
  }
}

export function writeLocalTweets(tweets: EmbeddedTweet[]): void {
  try {
    const filePath = getTweetsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(tweets, null, 2), "utf-8");
  } catch (err) {
    console.warn("Error escribiendo embedded_tweets.json local:", err);
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
    } catch {
      // Fallback a almacenamiento local
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
    try {
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

      if (!error && data) {
        newTweet.id = String(data.id);
      }
    } catch (err) {
      console.warn("Supabase fallo al guardar tuit, usando local:", err);
    }
  }

  const current = readLocalTweets();
  writeLocalTweets([newTweet, ...current]);
  return newTweet;
}

export async function deleteEmbeddedTweet(id: string): Promise<boolean> {
  if (supabase) {
    try {
      await supabase.from("noticueva_tweets").delete().eq("id", id);
    } catch {}
  }

  const current = readLocalTweets();
  const filtered = current.filter((t) => t.id !== id);
  writeLocalTweets(filtered);
  return true;
}
