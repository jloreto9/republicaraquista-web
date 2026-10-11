import { supabase, supabaseAdmin } from "./supabase";
import { NotiCuevaPost, CreatePostInput, UpdatePostInput } from "@/types/noticueva";
import fs from "fs";
import path from "path";

export const NOTICUEVA_AUTHOR = "Gilberto Méndez";
export const NOTICUEVA_ADMIN_PASSWORD =
  process.env.NOTICUEVA_ADMIN_PASSWORD || "Leones21.RC#NotiCueva*1942";

// Notas iniciales vacías: únicamente Gilberto Méndez redacta las notas oficiales
const DEFAULT_INITIAL_POSTS: NotiCuevaPost[] = [];

function getLocalPostsPath(): string {
  return path.join(process.cwd(), "public", "data", "noticueva_posts.json");
}

function readLocalPosts(): NotiCuevaPost[] {
  try {
    const filePath = getLocalPostsPath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    // Entornos de solo lectura como Vercel
  }
  return DEFAULT_INITIAL_POSTS;
}

function writeLocalPosts(posts: NotiCuevaPost[]): void {
  try {
    const filePath = getLocalPostsPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(posts, null, 2), "utf-8");
  } catch {
    // En Vercel EROFS se ignora silenciosamente como fallback secundario
  }
}

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  return `${base}-${Date.now().toString().slice(-4)}`;
}

/**
 * Obtiene todas las notas de la NotiCueva publicadas, ordenadas por fecha descendente.
 */
export async function getNotiCuevaPosts(): Promise<NotiCuevaPost[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("noticueva_posts")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data.map((row: any) => ({
          id: String(row.id),
          title: row.title,
          slug: row.slug,
          content: row.content,
          author: row.author || NOTICUEVA_AUTHOR,
          imageUrl: row.image_url || "/assets/logo.png",
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          published: Boolean(row.published),
        }));
      }

      if (error) {
        console.warn("Supabase noticueva_posts error:", error.message);
      }
    } catch (sbErr) {
      console.warn("Supabase fallo al consultar noticueva_posts, usando local:", sbErr);
    }
  }

  return readLocalPosts().map((p) => ({
    ...p,
    imageUrl: p.imageUrl || "/assets/logo.png",
  }));
}

/**
 * Obtiene una nota específica por su slug.
 */
export async function getNotiCuevaPostBySlug(slug: string): Promise<NotiCuevaPost | null> {
  const posts = await getNotiCuevaPosts();
  return posts.find((p) => p.slug === slug) || null;
}

/**
 * Crea una nueva nota en la NotiCueva.
 */
export async function createNotiCuevaPost(input: CreatePostInput): Promise<NotiCuevaPost> {
  const newPost: NotiCuevaPost = {
    id: `post-${Date.now()}`,
    title: input.title.trim(),
    slug: generateSlug(input.title),
    content: input.content.trim(),
    author: input.author?.trim() || NOTICUEVA_AUTHOR,
    imageUrl: input.imageUrl?.trim() || "/assets/logo.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    published: true,
  };

  const db = supabaseAdmin || supabase;
  if (db) {
    const { data, error } = await db
      .from("noticueva_posts")
      .insert({
        title: newPost.title,
        slug: newPost.slug,
        content: newPost.content,
        author: newPost.author,
        image_url: newPost.imageUrl,
        created_at: newPost.createdAt,
        updated_at: newPost.updatedAt,
        published: newPost.published,
      })
      .select()
      .single();

    if (error) {
      console.error("Error al insertar nota en Supabase:", error);
      if (error.code === "PGRST205" || error.message.includes("Could not find the table")) {
        throw new Error(
          "La tabla 'noticueva_posts' no existe en Supabase. Debes ejecutar el script de migración SQL en Supabase para habilitar la publicación permanente."
        );
      }
      throw new Error(`Error en base de datos Supabase: ${error.message}`);
    }

    if (data) {
      newPost.id = String(data.id);
    }
  } else {
    // Si no hay Supabase configurado, guardar localmente
    const current = readLocalPosts();
    writeLocalPosts([newPost, ...current]);
  }

  // Respaldo secundario local
  try {
    const current = readLocalPosts();
    writeLocalPosts([newPost, ...current]);
  } catch {}

  return newPost;
}

/**
 * Actualiza una nota existente.
 */
export async function updateNotiCuevaPost(
  id: string,
  input: UpdatePostInput
): Promise<NotiCuevaPost | null> {
  let updatedRecord: NotiCuevaPost | null = null;

  const db = supabaseAdmin || supabase;
  if (db) {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.content !== undefined) updateData.content = input.content.trim();
    if (input.author !== undefined) updateData.author = input.author.trim();
    if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl?.trim() || "/assets/logo.png";
    if (input.published !== undefined) updateData.published = input.published;

    const { data, error } = await db
      .from("noticueva_posts")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error al actualizar en Supabase:", error);
      throw new Error(`Error en base de datos Supabase: ${error.message}`);
    }

    if (data) {
      updatedRecord = {
        id: String(data.id),
        title: data.title,
        slug: data.slug,
        content: data.content,
        author: data.author || NOTICUEVA_AUTHOR,
        imageUrl: data.image_url || "/assets/logo.png",
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        published: Boolean(data.published),
      };
    }
  }

  // Actualizar también en respaldo local si existe
  try {
    const posts = readLocalPosts();
    const idx = posts.findIndex((p) => p.id === id);
    if (idx !== -1) {
      posts[idx] = {
        ...posts[idx],
        ...input,
        imageUrl: input.imageUrl !== undefined ? (input.imageUrl?.trim() || "/assets/logo.png") : posts[idx].imageUrl,
        updatedAt: new Date().toISOString(),
      };
      writeLocalPosts(posts);
      if (!updatedRecord) updatedRecord = posts[idx];
    }
  } catch {}

  return updatedRecord;
}

/**
 * Elimina una nota.
 */
export async function deleteNotiCuevaPost(id: string): Promise<boolean> {
  const db = supabaseAdmin || supabase;
  if (db) {
    const { error } = await db.from("noticueva_posts").delete().eq("id", id);
    if (error) {
      console.error("Error al eliminar en Supabase:", error);
      throw new Error(`Error en base de datos Supabase: ${error.message}`);
    }
  }

  try {
    const posts = readLocalPosts();
    const filtered = posts.filter((p) => p.id !== id);
    writeLocalPosts(filtered);
  } catch {}

  return true;
}
