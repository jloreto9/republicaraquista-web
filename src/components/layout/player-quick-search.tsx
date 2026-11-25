"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X, Loader2, Flame, Target, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSeason } from "@/context/season-context";
import { getMlbFallbackHeadshotUrl, formatSeason } from "@/lib/constants";
import type { PlayerSelectorItem } from "@/types/player-splits";

interface PlayerQuickSearchProps {
  compact?: boolean;
  className?: string;
}

type RoleFilter = "all" | "batter" | "pitcher";

const ROLE_FILTERS: Array<{ id: RoleFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "batter", label: "Bateadores" },
  { id: "pitcher", label: "Lanzadores" },
];

// Caché en memoria del módulo por temporada para evitar fetches repetidos al abrir Ctrl+K
const playersListCache = new Map<number, PlayerSelectorItem[]>();

const emptySubscribe = () => () => {};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function PlayerQuickSearch({ compact = false, className }: PlayerQuickSearchProps) {
  const router = useRouter();
  const { season } = useSeason();

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [fetchedBySeason, setFetchedBySeason] = useState<
    Record<number, PlayerSelectorItem[]>
  >({});
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const cachedForSeason = playersListCache.get(season);
  const players = useMemo(
    () => cachedForSeason ?? fetchedBySeason[season] ?? [],
    [cachedForSeason, fetchedBySeason, season]
  );
  const loading =
    isOpen && cachedForSeason === undefined && fetchedBySeason[season] === undefined;

  const openModal = useCallback(() => {
    setQuery("");
    setActiveIndex(0);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  // Solo la instancia de escritorio (no compact) registra el atajo global Ctrl+K / Cmd+K
  useEffect(() => {
    if (compact) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          setQuery("");
          setActiveIndex(0);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [compact]);

  // Cargar lista de jugadores al abrir si aún no está en caché para la temporada activa
  useEffect(() => {
    if (!isOpen || cachedForSeason !== undefined || fetchedBySeason[season] !== undefined) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    fetch(`/api/stats/player-splits?mode=list&season=${season}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        const list: PlayerSelectorItem[] = Array.isArray(json?.players) ? json.players : [];
        if (list.length > 0) {
          playersListCache.set(season, list);
        }
        setFetchedBySeason((prev) => ({ ...prev, [season]: list }));
      })
      .catch((err) => {
        if (!active || (err instanceof Error && err.name === "AbortError")) return;
        console.error("Error al cargar lista rápida de jugadores:", err);
        setFetchedBySeason((prev) => ({ ...prev, [season]: [] }));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, season, cachedForSeason, fetchedBySeason]);

  // Enfocar input al abrir
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    return players
      .filter((p) => {
        if (roleFilter !== "all" && p.type !== roleFilter) return false;
        if (!normalizedQuery) return true;
        const nameNorm = normalizeText(p.name || "");
        const teamNorm = normalizeText(p.teamAbbr || "");
        const subtitleNorm = normalizeText(p.subtitle || "");
        return (
          nameNorm.includes(normalizedQuery) ||
          teamNorm.includes(normalizedQuery) ||
          subtitleNorm.includes(normalizedQuery)
        );
      })
      .slice(0, 40);
  }, [players, query, roleFilter]);

  const safeActiveIndex =
    filteredPlayers.length === 0 ? 0 : Math.min(activeIndex, filteredPlayers.length - 1);

  const handleSelectPlayer = useCallback(
    (p: PlayerSelectorItem) => {
      closeModal();
      router.push(`/jugadores?player=${p.id}&type=${p.type}&season=${season}`);
    },
    [closeModal, router, season]
  );

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        filteredPlayers.length === 0 ? 0 : (prev + 1) % filteredPlayers.length
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        filteredPlayers.length === 0
          ? 0
          : (prev - 1 + filteredPlayers.length) % filteredPlayers.length
      );
      return;
    }
    if (e.key === "Enter" && filteredPlayers.length > 0) {
      e.preventDefault();
      const target = filteredPlayers[safeActiveIndex] ?? filteredPlayers[0];
      if (target) {
        handleSelectPlayer(target);
      }
    }
  };

  // Mantener ítem activo visible durante navegación con teclado
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      `[data-player-idx="${safeActiveIndex}"]`
    );
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [safeActiveIndex, isOpen]);

  const modalContent =
    mounted && isOpen
      ? createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-start justify-center pt-14 sm:pt-20 px-3 sm:px-4 bg-black/75 backdrop-blur-sm"
            onClick={closeModal}
            role="dialog"
            aria-modal="true"
            aria-label="Buscador rápido de jugadores LVBP"
          >
            <div
              className="w-full max-w-xl rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleModalKeyDown}
            >
              {/* Barra de Búsqueda */}
              <div className="p-3 sm:p-4 border-b border-[#1E2B4D] bg-[#070B19]/90 space-y-3">
                <div className="flex items-center gap-2.5 bg-[#0D152B] border border-[#1E2B4D] focus-within:border-[#FDB827] rounded-xl px-3 py-2 transition-colors">
                  <Search className="w-4 h-4 text-[#FDB827] shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveIndex(0);
                    }}
                    placeholder="Buscar pelotero por nombre o equipo (ej. Rondón, CAR)..."
                    className="flex-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                    aria-label="Buscar jugador"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setActiveIndex(0);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-[#1E2B4D]"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeModal}
                    className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-[#070B19] border border-[#1E2B4D] text-[10px] font-mono text-slate-400 hover:text-slate-200"
                  >
                    ESC
                  </button>
                </div>

                {/* Filtros de Rol y Temporada Activa */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div
                    role="group"
                    aria-label="Filtrar por rol"
                    className="inline-flex items-center gap-1 bg-[#0D152B] p-1 rounded-lg border border-[#1E2B4D]"
                  >
                    {ROLE_FILTERS.map((rf) => {
                      const active = roleFilter === rf.id;
                      return (
                        <button
                          key={rf.id}
                          type="button"
                          onClick={() => {
                            setRoleFilter(rf.id);
                            setActiveIndex(0);
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1",
                            active
                              ? "bg-[#FDB827] text-[#070B19] font-bold"
                              : "text-slate-300 hover:text-slate-100 hover:bg-[#131E3D]"
                          )}
                        >
                          {rf.id === "all" && <Users className="w-3 h-3" />}
                          {rf.id === "batter" && <Flame className="w-3 h-3" />}
                          {rf.id === "pitcher" && <Target className="w-3 h-3" />}
                          <span>{rf.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    Temporada <span className="text-[#FDB827] font-semibold">{formatSeason(season)}</span>
                  </span>
                </div>
              </div>

              {/* Lista de Resultados */}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar"
                role="listbox"
              >
                {loading ? (
                  <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 text-[#FDB827] animate-spin" />
                    <span className="text-xs font-mono">Cargando peloteros activos...</span>
                  </div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 font-mono">
                    No se encontraron peloteros para &ldquo;{query}&rdquo; en {formatSeason(season)}.
                  </div>
                ) : (
                  filteredPlayers.map((p, idx) => {
                    const isActive = idx === safeActiveIndex;
                    return (
                      <button
                        key={`${p.type}-${p.id}`}
                        type="button"
                        data-player-idx={idx}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleSelectPlayer(p)}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-colors border",
                          isActive
                            ? "bg-[#131E3D] border-[#FDB827]/50 text-slate-100"
                            : "bg-transparent border-transparent hover:bg-[#131E3D]/60 text-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-[#070B19] border border-[#1E2B4D] shrink-0">
                            <Image
                              src={p.avatarUrl}
                              alt={p.name}
                              width={36}
                              height={36}
                              className="object-cover"
                              unoptimized
                              onError={(e) => {
                                const target = e.currentTarget;
                                const fallback = getMlbFallbackHeadshotUrl(p.id);
                                if (target.src !== fallback && !target.src.includes("mlbstatic.com")) {
                                  target.src = fallback;
                                } else {
                                  target.src = p.teamLogo;
                                }
                              }}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                                {p.name}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#070B19] border border-[#1E2B4D] text-[#FDB827] shrink-0">
                                {p.teamAbbr}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                              {p.subtitle}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              "text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border",
                              p.type === "batter"
                                ? "bg-sky-500/10 text-sky-300 border-sky-500/30"
                                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            )}
                          >
                            {p.type === "batter" ? "Bateador" : "Lanzador"}
                          </span>
                          <ArrowRight
                            className={cn(
                              "w-3.5 h-3.5 transition-opacity",
                              isActive ? "text-[#FDB827] opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Pie de ayuda de teclado */}
              <div className="px-4 py-2 border-t border-[#1E2B4D] bg-[#070B19]/90 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <div className="flex items-center gap-3">
                  <span>↑↓ Navegar</span>
                  <span>Enter Abrir ficha</span>
                  <span>Esc Cerrar</span>
                </div>
                <span>{filteredPlayers.length} resultados</span>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={openModal}
          aria-label="Buscar jugador"
          title="Buscar jugador (Ctrl+K)"
          className={cn(
            "p-2 rounded-lg bg-[#0D152B] border border-[#1E2B4D] text-slate-300 hover:text-[#FDB827] hover:border-[#FDB827]/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827]",
            className
          )}
        >
          <Search className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
          aria-label="Buscar jugador (Ctrl+K)"
          className={cn(
            "flex items-center justify-between gap-3 px-3 py-1.5 rounded-full bg-[#0D152B] border border-[#1E2B4D] hover:border-[#FDB827]/50 text-xs text-slate-400 hover:text-slate-200 transition-colors min-w-[200px] xl:min-w-[240px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827]",
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-[#FDB827] shrink-0" />
            <span className="truncate">Buscar jugador...</span>
          </span>
          <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded bg-[#070B19] border border-[#1E2B4D] text-[10px] font-mono text-slate-400 shrink-0">
            Ctrl K
          </kbd>
        </button>
      )}
      {modalContent}
    </>
  );
}
