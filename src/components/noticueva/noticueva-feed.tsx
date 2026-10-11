"use client";

import { useState, useEffect } from "react";
import { NotiCuevaPost } from "@/types/noticueva";
import { NotiCuevaCard } from "./noticueva-card";
import { Newspaper, Search, RefreshCw } from "lucide-react";

interface NotiCuevaFeedProps {
  initialPosts: NotiCuevaPost[];
}

export function NotiCuevaFeed({ initialPosts }: NotiCuevaFeedProps) {
  const [posts, setPosts] = useState<NotiCuevaPost[]>(initialPosts);
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sincronizar si cambia initialPosts desde el servidor
  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  // Refrescar al montar para garantizar datos al día incluso en navegaciones de cliente
  const refreshPosts = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/noticueva", { cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPosts(json.data);
      }
    } catch (err) {
      // silencioso
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshPosts();
  }, []);

  const filteredPosts = posts.filter((post) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      post.title.toLowerCase().includes(q) ||
      post.content.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Buscador Rápido de Notas */}
      {posts.length > 3 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en la NotiCueva..."
            className="w-full bg-[#070B19]/80 border border-[#1E2B4D] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FDB827]/60 font-mono"
          />
        </div>
      )}

      {/* Lista de Artículos */}
      {filteredPosts.length > 0 ? (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <NotiCuevaCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl bg-[#0D152B]/60 border border-[#1E2B4D] space-y-3">
          <Newspaper className="w-8 h-8 text-[#FDB827] mx-auto opacity-70" />
          <p className="text-xs text-slate-400">
            {search
              ? "No se encontraron notas que coincidan con la búsqueda."
              : "Pronto Gilberto Méndez publicará las primeras notas de la temporada."}
          </p>
        </div>
      )}
    </div>
  );
}
