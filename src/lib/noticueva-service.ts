import { supabase } from "./supabase";
import { NotiCuevaPost, CreatePostInput, UpdatePostInput } from "@/types/noticueva";
import fs from "fs";
import path from "path";

export const NOTICUEVA_AUTHOR = "Gilberto Méndez";
export const NOTICUEVA_ADMIN_PASSWORD = process.env.NOTICUEVA_ADMIN_PASSWORD || "Leones21.";

// Post inicial de bienvenida de Gilberto Méndez
const DEFAULT_INITIAL_POSTS: NotiCuevaPost[] = [
  {
    id: "bienvenida-gilberto-mendez",
    title: "¡Bienvenidos a la NotiCueva!",
    slug: "bienvenidos-a-la-noticueva",
    content:
      "Saludos a toda la fanaticada caraquista. Arranca la temporada 2026-2027 y desde esta NotiCueva les estaré compartiendo de primera mano las notas, impresiones desde el dugout, novedades de incorporaciones y el pulso real de los Leones del Caracas tanto en el Monumental como en la carretera.\n\nEl compromiso es total con la camiseta y aquí tendrán la información directa y sin rodeos. ¡Ruge el león!",
    author: NOTICUEVA_AUTHOR,
    imageUrl: "/assets/logo.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    published: true,
  },
];

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
    console.warn("No se pudo leer noticueva_posts.json local:", err);
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
  } catch (err) {
    console.warn("No se pudo escribir noticueva_posts.json local:", err);
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

      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          id: String(row.id),
          title: row.title,
          slug: row.slug,
          content: row.content,
          author: row.author || NOTICUEVA_AUTHOR,
          imageUrl: row.image_url,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          published: Boolean(row.published),
        }));
      }
    } catch (sbErr) {
      console.warn("Supabase fallo al consultar noticueva_posts, usando local:", sbErr);
    }
  }

  return readLocalPosts();
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
    imageUrl: input.imageUrl?.trim() || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    published: true,
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
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

      if (!error && data) {
        newPost.id = String(data.id);
      }
    } catch (err) {
      console.warn("Error al insertar en Supabase, guardando localmente:", err);
    }
  }

  // Respaldo en archivo local
  const current = readLocalPosts();
  writeLocalPosts([newPost, ...current]);

  return newPost;
}

/**
 * Actualiza una nota existente.
 */
export async function updateNotiCuevaPost(
  id: string,
  input: UpdatePostInput
): Promise<NotiCuevaPost | null> {
  if (supabase) {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      if (input.title !== undefined) updateData.title = input.title.trim();
      if (input.content !== undefined) updateData.content = input.content.trim();
      if (input.author !== undefined) updateData.author = input.author.trim();
      if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl?.trim() || null;
      if (input.published !== undefined) updateData.published = input.published;

      await supabase.from("noticueva_posts").update(updateData).eq("id", id);
    } catch (err) {
      console.warn("Error al actualizar en Supabase:", err);
    }
  }

  const posts = readLocalPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx !== -1) {
    posts[idx] = {
      ...posts[idx],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    writeLocalPosts(posts);
    return posts[idx];
  }
  return null;
}

/**
 * Elimina una nota.
 */
export async function deleteNotiCuevaPost(id: string): Promise<boolean> {
  if (supabase) {
    try {
      await supabase.from("noticueva_posts").delete().eq("id", id);
    } catch (err) {
      console.warn("Error al eliminar en Supabase:", err);
    }
  }

  const posts = readLocalPosts();
  const filtered = posts.filter((p) => p.id !== id);
  writeLocalPosts(filtered);
  return true;
}
