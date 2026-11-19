"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Filter,
  Loader2,
  Minus,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { BattingStats, FieldingStats, PitchingStats } from "@/types/sports";
import {
  LVBP_TEAMS,
  LVBP_TEAM_IDS,
  getMlbFallbackHeadshotUrl,
  getPlayerHeadshotUrl,
} from "@/lib/constants";
import { cn, getVenezuelanToday } from "@/lib/utils";

export interface StatheadIndividualSearchProps {
  season: number;
  onSelectBatterForSplits?: (playerId: number) => void;
  onSelectPitcherForSplits?: (playerId: number) => void;
  onSelectFielderForSplits?: (playerId: number) => void;
}

type IndividualGroup = "batting" | "pitching" | "fielding";
type DatePreset = "7d" | "14d" | "oct" | "nov" | "dic" | "all" | "custom";
type MinPreset = "qualified" | "all" | "mid" | "high";
type ColumnView = "all" | "traditional" | "advanced";

const COLUMN_VIEW_OPTIONS: Array<{ id: ColumnView; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "traditional", label: "Tradicionales" },
  { id: "advanced", label: "Avanzadas & Stats+" },
];

const BATTING_PLUS_COLUMNS: Array<{
  key: "avgPlus" | "obpPlus" | "slgPlus" | "opsPlus" | "wobaPlus" | "wrcPlus";
  label: string;
  title: string;
}> = [
  {
    key: "avgPlus",
    label: "AVG+",
    title: "Índice ajustado de Promedio de Bateo (100 = Promedio LVBP)",
  },
  {
    key: "obpPlus",
    label: "OBP+",
    title: "Índice ajustado de Embasado (100 = Promedio LVBP)",
  },
  {
    key: "slgPlus",
    label: "SLG+",
    title: "Índice ajustado de Slugging (100 = Promedio LVBP)",
  },
  {
    key: "opsPlus",
    label: "OPS+",
    title: "Índice ajustado de OPS (100 = Promedio LVBP)",
  },
  {
    key: "wobaPlus",
    label: "wOBA+",
    title: "Índice ajustado de wOBA (100 = Promedio LVBP)",
  },
  {
    key: "wrcPlus",
    label: "wRC+",
    title: "Carreras Creadas Ponderadas Ajustadas (100 = Promedio LVBP)",
  },
];

const PITCHING_PLUS_COLUMNS: Array<{
  key: "eraPlus" | "whipPlus" | "fipPlus";
  label: string;
  title: string;
}> = [
  {
    key: "eraPlus",
    label: "ERA+",
    title: "Índice ajustado de Efectividad (>100 es mejor, 100 = Promedio LVBP)",
  },
  {
    key: "whipPlus",
    label: "WHIP+",
    title: "Índice ajustado de WHIP (>100 es mejor, 100 = Promedio LVBP)",
  },
  {
    key: "fipPlus",
    label: "FIP+",
    title: "Índice ajustado de FIP (>100 es mejor, 100 = Promedio LVBP)",
  },
];

interface IndividualStatsApiResponse<T> {
  success: boolean;
  season: number;
  phase: string;
  startDate?: string;
  endDate?: string;
  count: number;
  maxGames: number;
  teamGamesMap: Record<number, number>;
  teamWinPctMap?: Record<number, number>;
  data: T[];
  error?: string;
}

type GroupDataState =
  | {
      group: "batting";
      rows: BattingStats[];
      prevRows: BattingStats[];
    }
  | {
      group: "pitching";
      rows: PitchingStats[];
      prevRows: PitchingStats[];
    }
  | {
      group: "fielding";
      rows: FieldingStats[];
      prevRows: FieldingStats[];
    };

interface DeltaMetric {
  value: number;
  formatted: string;
  positiveIsGood: boolean;
  decimals: number;
}

interface KpiLeaderCardData {
  title: string;
  valueText: string;
  playerId: number;
  playerName: string;
  teamId: number;
  teamAbbr: string;
  teamLogo: string;
  delta?: DeltaMetric;
  hasPrev: boolean;
}

const CARACAS_TEAM_ID = 695;

const FIELDING_POSITION_PILLS = [
  { id: "ALL", label: "Todas" },
  { id: "C", label: "C" },
  { id: "1B", label: "1B" },
  { id: "2B", label: "2B" },
  { id: "3B", label: "3B" },
  { id: "SS", label: "SS" },
  { id: "LF", label: "LF" },
  { id: "CF", label: "CF" },
  { id: "RF", label: "RF" },
  { id: "P", label: "P" },
] as const;

const ASCENDING_DEFAULT_FIELDS = new Set([
  "era",
  "whip",
  "fip",
  "bbPer9",
  "walks",
  "earnedRuns",
  "runs",
  "hits",
  "losses",
  "errors",
  "passedBalls",
]);

function shiftDays(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function shiftDateYear(dateStr: string, deltaYears: number): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  if (Number.isNaN(year)) return dateStr;
  const nextYear = year + deltaYears;
  if (parts[1] === "02" && parts[2] === "29") {
    return `${nextYear}-02-28`;
  }
  return `${nextYear}-${parts[1]}-${parts[2]}`;
}

function getDefaultDateRange(
  season: number,
  todayStr: string
): { startDate: string; endDate: string; preset: DatePreset } {
  const seasonStart = `${season}-10-12`;
  const seasonEnd = `${season + 1}-01-31`;
  if (todayStr >= seasonStart && todayStr <= seasonEnd) {
    const fourteenAgo = shiftDays(todayStr, -14);
    return {
      startDate: fourteenAgo < seasonStart ? seasonStart : fourteenAgo,
      endDate: todayStr,
      preset: "14d",
    };
  }
  return {
    startDate: seasonStart,
    endDate: `${season}-10-31`,
    preset: "oct",
  };
}

function getDefaultSortForGroup(group: IndividualGroup): {
  field: string;
  asc: boolean;
} {
  if (group === "pitching") return { field: "era", asc: true };
  if (group === "fielding") return { field: "totalChances", asc: false };
  return { field: "ops", asc: false };
}

function getBatterPa(b: BattingStats): number {
  return b.plateAppearances ?? b.pa ?? (b.atBats || 0) + (b.walks || 0);
}

function formatRate3(val: number | undefined): string {
  const n = Number(val ?? 0);
  if (!Number.isFinite(n)) return ".000";
  return n.toFixed(3).replace(/^0(?=\.)/, "");
}

function formatFixed(val: number | undefined, decimals: number): string {
  const n = Number(val ?? 0);
  if (!Number.isFinite(n)) return (0).toFixed(decimals);
  return n.toFixed(decimals);
}

function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function compareSortableRows(
  valA: unknown,
  valB: unknown,
  tieBreaker: number,
  sortAsc: boolean
): number {
  if (typeof valA === "string" || typeof valB === "string") {
    return sortAsc
      ? String(valA ?? "").localeCompare(String(valB ?? ""))
      : String(valB ?? "").localeCompare(String(valA ?? ""));
  }
  const nA = Number(valA ?? 0);
  const nB = Number(valB ?? 0);
  const safeA = Number.isFinite(nA) ? nA : 0;
  const safeB = Number.isFinite(nB) ? nB : 0;
  if (safeA !== safeB) return sortAsc ? safeA - safeB : safeB - safeA;
  return tieBreaker;
}

function computeDelta(
  currVal: number | undefined,
  prevVal: number | undefined,
  positiveIsGood: boolean,
  decimals: number
): DeltaMetric {
  const c = Number(currVal ?? 0);
  const p = Number(prevVal ?? 0);
  const diff = (Number.isFinite(c) ? c : 0) - (Number.isFinite(p) ? p : 0);
  const rounded = Number(diff.toFixed(decimals));
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  const sign = normalized > 0 ? "+" : "";
  return {
    value: normalized,
    formatted: `${sign}${normalized.toFixed(decimals)}`,
    positiveIsGood,
    decimals,
  };
}

function renderDeltaBadge(hasPrev: boolean, delta?: DeltaMetric) {
  if (!hasPrev) {
    return (
      <span
        className="text-[10px] font-mono text-slate-400"
        title="Sin registros en el rango de comparación"
      >
        --
      </span>
    );
  }
  if (!delta || delta.value === 0) {
    return (
      <span className="inline-flex items-center text-[10px] text-slate-400 font-mono">
        <Minus className="w-2.5 h-2.5 mr-0.5 opacity-75" />
        {(0).toFixed(delta?.decimals ?? 0)}
      </span>
    );
  }

  const isGood = delta.positiveIsGood ? delta.value > 0 : delta.value < 0;
  const colorClass = isGood
    ? "text-emerald-300 bg-emerald-950/50 border-emerald-700/50"
    : "text-rose-300 bg-rose-950/50 border-rose-700/50";

  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded border font-semibold whitespace-nowrap",
        colorClass
      )}
    >
      {delta.value > 0 ? (
        <TrendingUp className="w-2.5 h-2.5 mr-0.5 shrink-0" />
      ) : (
        <TrendingDown className="w-2.5 h-2.5 mr-0.5 shrink-0" />
      )}
      {delta.formatted}
    </span>
  );
}

function pickLeader<T>(
  items: T[],
  scoreFn: (item: T) => number,
  mode: "max" | "min",
  tieBreakerFn?: (item: T) => number
): T | null {
  if (items.length === 0) return null;
  let best = items[0];
  let bestScore = scoreFn(best);
  let bestTie = tieBreakerFn ? tieBreakerFn(best) : 0;

  for (let i = 1; i < items.length; i++) {
    const candidate = items[i];
    const score = scoreFn(candidate);
    const tie = tieBreakerFn ? tieBreakerFn(candidate) : 0;
    const isBetter =
      mode === "max"
        ? score > bestScore || (score === bestScore && tie > bestTie)
        : score < bestScore || (score === bestScore && tie > bestTie);
    if (isBetter) {
      best = candidate;
      bestScore = score;
      bestTie = tie;
    }
  }
  return best;
}

function PlayerHeadshot({
  playerId,
  playerName,
  teamLogo,
  size = 28,
  highlight = false,
}: {
  playerId: number;
  playerName: string;
  teamLogo: string;
  size?: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "rounded-full overflow-hidden bg-[#070B19] border relative shrink-0",
        highlight ? "border-[#FDB827]/70" : "border-[#1E2B4D]"
      )}
    >
      <Image
        src={getPlayerHeadshotUrl(playerId)}
        alt={playerName}
        width={size}
        height={size}
        className="object-cover w-full h-full"
        unoptimized
        onError={(e) => {
          const target = e.currentTarget;
          const mlbFallback = getMlbFallbackHeadshotUrl(playerId);
          if (target.src !== mlbFallback && !target.src.includes("mlbstatic.com")) {
            target.src = mlbFallback;
          } else if (teamLogo && target.src !== teamLogo) {
            target.src = teamLogo;
          }
        }}
      />
    </div>
  );
}

function SortableHeader({
  label,
  field,
  sortField,
  sortAsc,
  onSort,
  align = "center",
  highlight = false,
  className,
  title,
}: {
  label: string;
  field: string;
  sortField: string;
  sortAsc: boolean;
  onSort: (field: string) => void;
  align?: "left" | "center";
  highlight?: boolean;
  className?: string;
  title?: string;
}) {
  const isActive = sortField === field;
  const ariaSort = isActive
    ? sortAsc
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th
      aria-sort={ariaSort}
      title={title}
      className={cn(
        "py-3 px-2 font-mono text-[11px] select-none whitespace-nowrap",
        align === "center" ? "text-center" : "text-left",
        highlight && "bg-[#FDB827]/10 text-[#FDB827]",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 font-semibold transition-colors rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827]",
          isActive
            ? "text-[#FDB827]"
            : highlight
            ? "text-[#FDB827] hover:text-amber-200"
            : "text-slate-300 hover:text-[#FDB827]"
        )}
      >
        <span>{label}</span>
        {isActive ? (
          sortAsc ? (
            <ArrowUp className="w-3 h-3 shrink-0" />
          ) : (
            <ArrowDown className="w-3 h-3 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 shrink-0 opacity-35" />
        )}
      </button>
    </th>
  );
}

function getPlusBadgeClass(value: number): string {
  if (value >= 130) {
    return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold";
  }
  if (value >= 110) {
    return "bg-[#FDB827]/15 text-[#FDB827] border-[#FDB827]/35 font-semibold";
  }
  if (value >= 91) {
    return "bg-slate-800/80 text-slate-200 border-slate-700";
  }
  return "bg-rose-500/15 text-rose-300 border-rose-500/30";
}

function PlusStatBadge({ value }: { value?: number }) {
  const rounded =
    typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
  if (rounded <= 0) {
    return <span className="text-slate-500 font-mono">--</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[2.25rem] px-1.5 py-0.5 rounded border text-[11px] font-mono tabular-nums",
        getPlusBadgeClass(rounded)
      )}
    >
      {rounded}
    </span>
  );
}

function StatValueCell({
  display,
  compareEnabled,
  hasPrev,
  delta,
  className,
}: {
  display: React.ReactNode;
  compareEnabled: boolean;
  hasPrev: boolean;
  delta?: DeltaMetric;
  className?: string;
}) {
  return (
    <td className={cn("py-2.5 px-2 text-center font-mono tabular-nums", className)}>
      <div className="flex flex-col items-center gap-0.5">
        <span>{display}</span>
        {compareEnabled && renderDeltaBadge(hasPrev, delta)}
      </div>
    </td>
  );
}

function TeamBadge({
  teamLogo,
  teamAbbr,
}: {
  teamLogo: string;
  teamAbbr: string;
}) {
  return (
    <div className="inline-flex items-center justify-center gap-1">
      {teamLogo ? (
        <Image
          src={teamLogo}
          alt={teamAbbr}
          width={16}
          height={16}
          className="w-4 h-4 object-contain shrink-0"
          unoptimized
        />
      ) : null}
      <span className="text-[11px] text-slate-300 font-semibold font-mono">
        {teamAbbr}
      </span>
    </div>
  );
}

function LeaderKpiCard({
  card,
  compareEnabled,
  onSelectPlayer,
}: {
  card: KpiLeaderCardData;
  compareEnabled: boolean;
  onSelectPlayer?: (playerId: number) => void;
}) {
  const isCaracas = card.teamId === CARACAS_TEAM_ID;

  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 transition-colors flex flex-col justify-between gap-3",
        isCaracas
          ? "bg-[#0D152B] border-[#FDB827]/50"
          : "bg-[#0D152B] border-[#1E2B4D]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wide">
          {card.title}
        </span>
        <TeamBadge teamLogo={card.teamLogo} teamAbbr={card.teamAbbr} />
      </div>

      <div className="flex items-center gap-3">
        <PlayerHeadshot
          playerId={card.playerId}
          playerName={card.playerName}
          teamLogo={card.teamLogo}
          size={44}
          highlight={isCaracas}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl font-black font-mono tabular-nums text-[#FDB827] leading-none">
              {card.valueText}
            </span>
            {compareEnabled && renderDeltaBadge(card.hasPrev, card.delta)}
          </div>
          {onSelectPlayer ? (
            <button
              type="button"
              onClick={() => onSelectPlayer(card.playerId)}
              className={cn(
                "mt-1 text-xs font-bold truncate max-w-full text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827] rounded",
                isCaracas ? "text-[#FDB827]" : "text-slate-100"
              )}
              title={`Ver splits de ${card.playerName}`}
            >
              {card.playerName}
            </button>
          ) : (
            <p
              className={cn(
                "mt-1 text-xs font-bold truncate",
                isCaracas ? "text-[#FDB827]" : "text-slate-100"
              )}
            >
              {card.playerName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatheadIndividualSearch({
  season,
  onSelectBatterForSplits,
  onSelectPitcherForSplits,
  onSelectFielderForSplits,
}: StatheadIndividualSearchProps) {
  const todayStr = useMemo(() => getVenezuelanToday().dateString, []);
  const initialRange = useMemo(
    () => getDefaultDateRange(season, todayStr),
    [season, todayStr]
  );

  const compareSeason = season - 1;

  const [prevSeason, setPrevSeason] = useState<number>(season);
  const [group, setGroup] = useState<IndividualGroup>("batting");
  const [activePreset, setActivePreset] = useState<DatePreset>(initialRange.preset);
  const [startDate, setStartDate] = useState<string>(initialRange.startDate);
  const [endDate, setEndDate] = useState<string>(initialRange.endDate);

  const [compareEnabled, setCompareEnabled] = useState<boolean>(false);
  const [prevStartDate, setPrevStartDate] = useState<string>(() =>
    shiftDateYear(initialRange.startDate, -1)
  );
  const [prevEndDate, setPrevEndDate] = useState<string>(() =>
    shiftDateYear(initialRange.endDate, -1)
  );

  // Filtros client-side sobre el pool del rango consultado
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [minPreset, setMinPreset] = useState<MinPreset>("qualified");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");

  // Ordenamiento y vista de columnas
  const [sortField, setSortField] = useState<string>("ops");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [columnView, setColumnView] = useState<ColumnView>("all");

  const showTraditionalCols = columnView === "all" || columnView === "traditional";
  const showAdvancedCols = columnView === "all" || columnView === "advanced";

  // Datos y estado de red
  const [groupData, setGroupData] = useState<GroupDataState>({
    group: "batting",
    rows: [],
    prevRows: [],
  });
  const [teamGamesMap, setTeamGamesMap] = useState<Record<number, number>>({});
  const [maxGames, setMaxGames] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);

  // Sincronización de rango cuando cambia la temporada seleccionada en el padre
  if (season !== prevSeason) {
    setPrevSeason(season);
    const nextRange = getDefaultDateRange(season, todayStr);
    setActivePreset(nextRange.preset);
    setStartDate(nextRange.startDate);
    setEndDate(nextRange.endDate);
    setPrevStartDate(shiftDateYear(nextRange.startDate, -1));
    setPrevEndDate(shiftDateYear(nextRange.endDate, -1));
  }

  const executeQuery = useCallback(
    async (params?: {
      targetGroup?: IndividualGroup;
      targetSeason?: number;
      targetStart?: string;
      targetEnd?: string;
      targetCompare?: boolean;
      targetPrevStart?: string;
      targetPrevEnd?: string;
    }) => {
      const qGroup = params?.targetGroup ?? group;
      const qSeason = params?.targetSeason ?? season;
      const qStart = params?.targetStart ?? startDate;
      const qEnd = params?.targetEnd ?? endDate;
      const qCompare = params?.targetCompare ?? compareEnabled;
      const qPrevStart = params?.targetPrevStart ?? prevStartDate;
      const qPrevEnd = params?.targetPrevEnd ?? prevEndDate;

      if (!qStart || !qEnd) {
        setErrorMsg("Debes especificar fecha de inicio y fin.");
        return;
      }
      if (qStart > qEnd) {
        setErrorMsg("La fecha de inicio no puede ser posterior a la fecha final.");
        return;
      }
      if (qCompare) {
        if (!qPrevStart || !qPrevEnd) {
          setErrorMsg("Debes especificar las fechas de la temporada anterior.");
          return;
        }
        if (qPrevStart > qPrevEnd) {
          setErrorMsg(
            "La fecha de inicio de comparación no puede ser posterior a la fecha final."
          );
          return;
        }
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const reqId = ++requestSeqRef.current;

      setErrorMsg(null);
      setLoading(true);

      try {
        const currUrl = `/api/stats/${qGroup}?season=${qSeason}&phase=all&team_id=all&limit=1000&startDate=${encodeURIComponent(
          qStart
        )}&endDate=${encodeURIComponent(qEnd)}`;
        const prevUrl = qCompare
          ? `/api/stats/${qGroup}?season=${
              qSeason - 1
            }&phase=all&team_id=all&limit=1000&startDate=${encodeURIComponent(
              qPrevStart
            )}&endDate=${encodeURIComponent(qPrevEnd)}`
          : null;

        const currFetch = fetch(currUrl, { signal: controller.signal }).then(
          async (res) => {
            const json =
              (await res.json()) as IndividualStatsApiResponse<unknown>;
            if (!res.ok || !json.success) {
              throw new Error(
                json.error || "No se pudieron obtener las estadísticas del rango."
              );
            }
            return json;
          }
        );

        const prevFetch = prevUrl
          ? fetch(prevUrl, { signal: controller.signal })
              .then(async (res) => {
                if (!res.ok) return null;
                const json =
                  (await res.json()) as IndividualStatsApiResponse<unknown>;
                return json.success ? json : null;
              })
              .catch(() => null)
          : Promise.resolve(null);

        const [currRes, prevRes] = await Promise.all([currFetch, prevFetch]);
        if (reqId !== requestSeqRef.current) return;

        setTeamGamesMap(currRes.teamGamesMap || {});
        setMaxGames(typeof currRes.maxGames === "number" ? currRes.maxGames : 0);

        if (qGroup === "batting") {
          setGroupData({
            group: "batting",
            rows: (currRes.data || []) as BattingStats[],
            prevRows: (prevRes?.data || []) as BattingStats[],
          });
        } else if (qGroup === "pitching") {
          setGroupData({
            group: "pitching",
            rows: (currRes.data || []) as PitchingStats[],
            prevRows: (prevRes?.data || []) as PitchingStats[],
          });
        } else {
          setGroupData({
            group: "fielding",
            rows: (currRes.data || []) as FieldingStats[],
            prevRows: (prevRes?.data || []) as FieldingStats[],
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (reqId !== requestSeqRef.current) return;
        console.error("Error en buscador individual:", err);
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Error de conexión al consultar estadísticas individuales."
        );
      } finally {
        if (reqId === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [
      group,
      season,
      startDate,
      endDate,
      compareEnabled,
      prevStartDate,
      prevEndDate,
    ]
  );

  // Carga inicial y al cambiar de temporada (usa las fechas sincronizadas del render)
  useEffect(() => {
    const effectAbort = new AbortController();
    void Promise.resolve().then(() => {
      if (!effectAbort.signal.aborted) {
        void executeQuery({ targetSeason: season });
      }
    });
    return () => {
      effectAbort.abort();
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  const handleGroupChange = (nextGroup: IndividualGroup) => {
    if (nextGroup === group) return;
    const defSort = getDefaultSortForGroup(nextGroup);
    setGroup(nextGroup);
    setSortField(defSort.field);
    setSortAsc(defSort.asc);
    if (nextGroup !== "fielding") {
      setPositionFilter("ALL");
    }
    void executeQuery({ targetGroup: nextGroup });
  };

  const handleCurrentDateChange = (nextStart: string, nextEnd: string) => {
    setActivePreset("custom");
    setStartDate(nextStart);
    setEndDate(nextEnd);
    if (nextStart) {
      setPrevStartDate(shiftDateYear(nextStart, -1));
    }
    if (nextEnd) {
      setPrevEndDate(shiftDateYear(nextEnd, -1));
    }
  };

  const applyPreset = (preset: Exclude<DatePreset, "custom">) => {
    let s = "";
    let e = "";
    if (preset === "7d") {
      s = shiftDays(todayStr, -7);
      e = todayStr;
    } else if (preset === "14d") {
      s = shiftDays(todayStr, -14);
      e = todayStr;
    } else if (preset === "oct") {
      s = `${season}-10-12`;
      e = `${season}-10-31`;
    } else if (preset === "nov") {
      s = `${season}-11-01`;
      e = `${season}-11-30`;
    } else if (preset === "dic") {
      s = `${season}-12-01`;
      e = `${season}-12-31`;
    } else if (preset === "all") {
      s = `${season}-10-12`;
      e = `${season + 1}-01-31`;
    }

    const ps = shiftDateYear(s, -1);
    const pe = shiftDateYear(e, -1);
    setActivePreset(preset);
    setStartDate(s);
    setEndDate(e);
    setPrevStartDate(ps);
    setPrevEndDate(pe);
    void executeQuery({
      targetStart: s,
      targetEnd: e,
      targetPrevStart: ps,
      targetPrevEnd: pe,
    });
  };

  const handleToggleCompare = (checked: boolean) => {
    setCompareEnabled(checked);
    if (checked) {
      void executeQuery({ targetCompare: true });
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(ASCENDING_DEFAULT_FIELDS.has(field));
    }
  };

  // Referencia dinámica de juegos del rango
  const referenceTeamGames = useMemo(() => {
    if (selectedTeam !== "all") {
      const g = teamGamesMap[Number(selectedTeam)];
      if (typeof g === "number") return g;
    }
    return maxGames;
  }, [selectedTeam, teamGamesMap, maxGames]);

  const qualifiedMinBadgeText = useMemo(() => {
    if (group === "batting") {
      const req = Math.max(1, Math.round(referenceTeamGames * 3.1));
      return referenceTeamGames > 0
        ? `Calificados (≥ 3.1 AP/J • ${req} AP)`
        : "Calificados (≥ 3.1 AP/J)";
    }
    if (group === "pitching") {
      const req = Math.max(0.1, Number((referenceTeamGames * 1.0).toFixed(1)));
      return referenceTeamGames > 0
        ? `Calificados (≥ 1.0 IP/J • ${req.toFixed(1)} IP)`
        : "Calificados (≥ 1.0 IP/J)";
    }
    const req = referenceTeamGames > 0 ? Math.max(3, Math.round(referenceTeamGames * 0.5)) : 0;
    return referenceTeamGames > 0
      ? `Calificados (≥ 0.5 TC/J • ${req} TC)`
      : "Calificados (≥ 0.5 TC/J)";
  }, [group, referenceTeamGames]);

  const minPresets = useMemo(
    () => [
      { id: "qualified" as const, label: qualifiedMinBadgeText },
      { id: "all" as const, label: "Todos (Sin mínimo)" },
      {
        id: "mid" as const,
        label:
          group === "batting"
            ? "≥ 10 AP"
            : group === "pitching"
            ? "≥ 3.0 IP"
            : "≥ 5 TC",
      },
      {
        id: "high" as const,
        label:
          group === "batting"
            ? "≥ 25 AP"
            : group === "pitching"
            ? "≥ 5.0 IP"
            : "≥ 10 TC",
      },
    ],
    [group, qualifiedMinBadgeText]
  );

  // Mapas de búsqueda rápida de temporada anterior
  const prevBattingLookup = useMemo(() => {
    const byTeam = new Map<string, BattingStats>();
    const byPlayer = new Map<number, BattingStats>();
    if (groupData.group !== "batting") return { byTeam, byPlayer };
    for (const row of groupData.prevRows) {
      byTeam.set(`${row.playerId}-${row.teamId}`, row);
      if (!byPlayer.has(row.playerId)) {
        byPlayer.set(row.playerId, row);
      }
    }
    return { byTeam, byPlayer };
  }, [groupData]);

  const prevPitchingLookup = useMemo(() => {
    const byTeam = new Map<string, PitchingStats>();
    const byPlayer = new Map<number, PitchingStats>();
    if (groupData.group !== "pitching") return { byTeam, byPlayer };
    for (const row of groupData.prevRows) {
      byTeam.set(`${row.playerId}-${row.teamId}`, row);
      if (!byPlayer.has(row.playerId)) {
        byPlayer.set(row.playerId, row);
      }
    }
    return { byTeam, byPlayer };
  }, [groupData]);

  const prevFieldingLookup = useMemo(() => {
    const byPlayerPos = new Map<string, FieldingStats>();
    const byPlayer = new Map<number, FieldingStats>();
    if (groupData.group !== "fielding") return { byPlayerPos, byPlayer };
    for (const row of groupData.prevRows) {
      const posKey = `${row.playerId}-${row.position}`;
      if (!byPlayerPos.has(posKey)) {
        byPlayerPos.set(posKey, row);
      }
      if (!byPlayer.has(row.playerId)) {
        byPlayer.set(row.playerId, row);
      }
    }
    return { byPlayerPos, byPlayer };
  }, [groupData]);

  const normalizedSearch = useMemo(
    () => normalizeSearchText(searchQuery),
    [searchQuery]
  );

  // Filtrado por equipo, posición y nombre (previo al corte de calificación)
  const preMinBatting = useMemo(() => {
    if (groupData.group !== "batting") return [];
    return groupData.rows.filter((row) => {
      if (selectedTeam !== "all" && row.teamId !== Number(selectedTeam)) {
        return false;
      }
      if (
        normalizedSearch &&
        !normalizeSearchText(row.playerName).includes(normalizedSearch)
      ) {
        return false;
      }
      return true;
    });
  }, [groupData, selectedTeam, normalizedSearch]);

  const preMinPitching = useMemo(() => {
    if (groupData.group !== "pitching") return [];
    return groupData.rows.filter((row) => {
      if (selectedTeam !== "all" && row.teamId !== Number(selectedTeam)) {
        return false;
      }
      if (
        normalizedSearch &&
        !normalizeSearchText(row.playerName).includes(normalizedSearch)
      ) {
        return false;
      }
      return true;
    });
  }, [groupData, selectedTeam, normalizedSearch]);

  const preMinFielding = useMemo(() => {
    if (groupData.group !== "fielding") return [];
    return groupData.rows.filter((row) => {
      if (selectedTeam !== "all" && row.teamId !== Number(selectedTeam)) {
        return false;
      }
      if (positionFilter !== "ALL" && row.position !== positionFilter) {
        return false;
      }
      if (
        normalizedSearch &&
        !normalizeSearchText(row.playerName).includes(normalizedSearch)
      ) {
        return false;
      }
      return true;
    });
  }, [groupData, selectedTeam, positionFilter, normalizedSearch]);

  // Filtro de calificación mínima
  const filteredBatting = useMemo(() => {
    if (minPreset === "all") return preMinBatting;
    return preMinBatting.filter((b) => {
      const pa = getBatterPa(b);
      if (minPreset === "mid") return pa >= 10;
      if (minPreset === "high") return pa >= 25;
      const tGames =
        selectedTeam !== "all"
          ? referenceTeamGames
          : teamGamesMap[b.teamId] ?? maxGames;
      const reqPa = Math.max(1, Math.round(tGames * 3.1));
      return pa >= reqPa;
    });
  }, [
    preMinBatting,
    minPreset,
    selectedTeam,
    referenceTeamGames,
    teamGamesMap,
    maxGames,
  ]);

  const filteredPitching = useMemo(() => {
    if (minPreset === "all") return preMinPitching;
    return preMinPitching.filter((p) => {
      const ip = p.inningsPitched || 0;
      if (minPreset === "mid") return ip >= 2.95;
      if (minPreset === "high") return ip >= 4.95;
      const tGames =
        selectedTeam !== "all"
          ? referenceTeamGames
          : teamGamesMap[p.teamId] ?? maxGames;
      const reqIp = Math.max(0.1, Number((tGames * 1.0).toFixed(1)));
      return ip >= reqIp - 0.05;
    });
  }, [
    preMinPitching,
    minPreset,
    selectedTeam,
    referenceTeamGames,
    teamGamesMap,
    maxGames,
  ]);

  const filteredFielding = useMemo(() => {
    if (minPreset === "all") return preMinFielding;
    return preMinFielding.filter((f) => {
      const tc = f.totalChances || 0;
      if (minPreset === "mid") return tc >= 5;
      if (minPreset === "high") return tc >= 10;
      const tGames =
        selectedTeam !== "all"
          ? referenceTeamGames
          : teamGamesMap[f.teamId] ?? maxGames;
      const reqTc = tGames > 0 ? Math.max(3, Math.round(tGames * 0.5)) : 0;
      return tc >= reqTc;
    });
  }, [
    preMinFielding,
    minPreset,
    selectedTeam,
    referenceTeamGames,
    teamGamesMap,
    maxGames,
  ]);

  // Ordenamiento de filas
  const sortedBatting = useMemo(() => {
    return [...filteredBatting].sort((a, b) => {
      const valA =
        sortField === "plateAppearances"
          ? getBatterPa(a)
          : a[sortField as keyof BattingStats];
      const valB =
        sortField === "plateAppearances"
          ? getBatterPa(b)
          : b[sortField as keyof BattingStats];
      return compareSortableRows(
        valA,
        valB,
        getBatterPa(b) - getBatterPa(a),
        sortAsc
      );
    });
  }, [filteredBatting, sortField, sortAsc]);

  const sortedPitching = useMemo(() => {
    return [...filteredPitching].sort((a, b) => {
      const valA =
        sortField === "inningsDisplay"
          ? a.inningsPitched
          : a[sortField as keyof PitchingStats];
      const valB =
        sortField === "inningsDisplay"
          ? b.inningsPitched
          : b[sortField as keyof PitchingStats];
      return compareSortableRows(
        valA,
        valB,
        b.inningsPitched - a.inningsPitched,
        sortAsc
      );
    });
  }, [filteredPitching, sortField, sortAsc]);

  const sortedFielding = useMemo(() => {
    return [...filteredFielding].sort((a, b) => {
      const valA =
        sortField === "innings"
          ? a.inningsDecimal ?? 0
          : a[sortField as keyof FieldingStats];
      const valB =
        sortField === "innings"
          ? b.inningsDecimal ?? 0
          : b[sortField as keyof FieldingStats];
      return compareSortableRows(
        valA,
        valB,
        b.totalChances - a.totalChances,
        sortAsc
      );
    });
  }, [filteredFielding, sortField, sortAsc]);

  // Top 4 KPI Leader Cards recalculadas sobre la lista filtrada/calificada
  const kpiCards = useMemo((): KpiLeaderCardData[] => {
    if (group === "batting") {
      if (filteredBatting.length === 0) return [];
      const findPrev = (curr: BattingStats) =>
        prevBattingLookup.byTeam.get(`${curr.playerId}-${curr.teamId}`) ??
        prevBattingLookup.byPlayer.get(curr.playerId) ??
        null;

      const avgLeader = pickLeader(
        filteredBatting,
        (b) => b.avg,
        "max",
        (b) => b.hits
      );
      const opsLeader = pickLeader(
        filteredBatting,
        (b) => b.ops,
        "max",
        (b) => b.atBats
      );
      const hrLeader = pickLeader(
        filteredBatting,
        (b) => b.homeRuns,
        "max",
        (b) => b.ops
      );
      const rbiLeader = pickLeader(
        filteredBatting,
        (b) => b.rbi,
        "max",
        (b) => b.ops
      );

      const defs: Array<{
        title: string;
        leader: BattingStats | null;
        valueText: string;
        key: keyof BattingStats;
        decimals: number;
      }> = [
        {
          title: "LÍDER AVG",
          leader: avgLeader,
          valueText: avgLeader ? formatRate3(avgLeader.avg) : ".000",
          key: "avg",
          decimals: 3,
        },
        {
          title: "LÍDER OPS",
          leader: opsLeader,
          valueText: opsLeader ? formatRate3(opsLeader.ops) : ".000",
          key: "ops",
          decimals: 3,
        },
        {
          title: "LÍDER JONRONES (HR)",
          leader: hrLeader,
          valueText: hrLeader ? String(hrLeader.homeRuns) : "0",
          key: "homeRuns",
          decimals: 0,
        },
        {
          title: "LÍDER IMPULSADAS (CI)",
          leader: rbiLeader,
          valueText: rbiLeader ? String(rbiLeader.rbi) : "0",
          key: "rbi",
          decimals: 0,
        },
      ];

      return defs
        .filter((d): d is typeof d & { leader: BattingStats } => d.leader !== null)
        .map((d) => {
          const prev = compareEnabled ? findPrev(d.leader) : null;
          return {
            title: d.title,
            valueText: d.valueText,
            playerId: d.leader.playerId,
            playerName: d.leader.playerName,
            teamId: d.leader.teamId,
            teamAbbr: d.leader.teamAbbr,
            teamLogo: d.leader.teamLogo,
            hasPrev: prev !== null,
            delta:
              prev !== null
                ? computeDelta(
                    Number(d.leader[d.key] ?? 0),
                    Number(prev[d.key] ?? 0),
                    true,
                    d.decimals
                  )
                : undefined,
          };
        });
    }

    if (group === "pitching") {
      if (filteredPitching.length === 0) return [];
      const findPrev = (curr: PitchingStats) =>
        prevPitchingLookup.byTeam.get(`${curr.playerId}-${curr.teamId}`) ??
        prevPitchingLookup.byPlayer.get(curr.playerId) ??
        null;

      const withIp = filteredPitching.filter((p) => p.inningsPitched > 0);
      const ratePool = withIp.length > 0 ? withIp : filteredPitching;

      const eraLeader = pickLeader(
        ratePool,
        (p) => p.era,
        "min",
        (p) => p.inningsPitched
      );
      const whipLeader = pickLeader(
        ratePool,
        (p) => p.whip,
        "min",
        (p) => p.inningsPitched
      );
      const soLeader = pickLeader(
        filteredPitching,
        (p) => p.strikeouts,
        "max",
        (p) => p.inningsPitched
      );
      const svLeader = pickLeader(
        filteredPitching,
        (p) => p.saves ?? 0,
        "max",
        (p) => -p.era
      );

      const defs: Array<{
        title: string;
        leader: PitchingStats | null;
        valueText: string;
        key: keyof PitchingStats;
        positiveIsGood: boolean;
        decimals: number;
      }> = [
        {
          title: "MEJOR EFECTIVIDAD (ERA)",
          leader: eraLeader,
          valueText: eraLeader ? formatFixed(eraLeader.era, 2) : "0.00",
          key: "era",
          positiveIsGood: false,
          decimals: 2,
        },
        {
          title: "MEJOR WHIP",
          leader: whipLeader,
          valueText: whipLeader ? formatFixed(whipLeader.whip, 2) : "0.00",
          key: "whip",
          positiveIsGood: false,
          decimals: 2,
        },
        {
          title: "LÍDER PONCHES (SO)",
          leader: soLeader,
          valueText: soLeader ? String(soLeader.strikeouts) : "0",
          key: "strikeouts",
          positiveIsGood: true,
          decimals: 0,
        },
        {
          title: "LÍDER SALVADOS (SV)",
          leader: svLeader,
          valueText: svLeader ? String(svLeader.saves ?? 0) : "0",
          key: "saves",
          positiveIsGood: true,
          decimals: 0,
        },
      ];

      return defs
        .filter((d): d is typeof d & { leader: PitchingStats } => d.leader !== null)
        .map((d) => {
          const prev = compareEnabled ? findPrev(d.leader) : null;
          return {
            title: d.title,
            valueText: d.valueText,
            playerId: d.leader.playerId,
            playerName: d.leader.playerName,
            teamId: d.leader.teamId,
            teamAbbr: d.leader.teamAbbr,
            teamLogo: d.leader.teamLogo,
            hasPrev: prev !== null,
            delta:
              prev !== null
                ? computeDelta(
                    Number(d.leader[d.key] ?? 0),
                    Number(prev[d.key] ?? 0),
                    d.positiveIsGood,
                    d.decimals
                  )
                : undefined,
          };
        });
    }

    if (filteredFielding.length === 0) return [];
    const findPrev = (curr: FieldingStats) =>
      prevFieldingLookup.byPlayerPos.get(`${curr.playerId}-${curr.position}`) ??
      prevFieldingLookup.byPlayer.get(curr.playerId) ??
      null;

    const withChances = filteredFielding.filter((f) => f.totalChances > 0);
    const fpctPool = withChances.length > 0 ? withChances : filteredFielding;

    const fpctLeader = pickLeader(
      fpctPool,
      (f) => f.fieldingPct,
      "max",
      (f) => f.totalChances
    );
    const tcLeader = pickLeader(
      filteredFielding,
      (f) => f.totalChances,
      "max",
      (f) => f.fieldingPct
    );
    const dpLeader = pickLeader(
      filteredFielding,
      (f) => f.doublePlays,
      "max",
      (f) => f.totalChances
    );

    const catchersWithAttempts = filteredFielding.filter(
      (f) =>
        f.position === "C" &&
        (f.caughtStealing ?? 0) + (f.stolenBases ?? 0) > 0
    );

    const csLeader =
      catchersWithAttempts.length > 0
        ? pickLeader(
            catchersWithAttempts,
            (f) => f.caughtStealingPct ?? 0,
            "max",
            (f) => f.caughtStealing ?? 0
          )
        : null;
    const assistsLeader =
      csLeader === null
        ? pickLeader(
            filteredFielding,
            (f) => f.assists,
            "max",
            (f) => f.totalChances
          )
        : null;

    const defs: Array<{
      title: string;
      leader: FieldingStats | null;
      valueText: string;
      key: keyof FieldingStats;
      decimals: number;
    }> = [
      {
        title: "MEJOR % FILDEO (FPCT)",
        leader: fpctLeader,
        valueText: fpctLeader ? formatRate3(fpctLeader.fieldingPct) : ".000",
        key: "fieldingPct",
        decimals: 3,
      },
      {
        title: "LÍDER LANCES (TC)",
        leader: tcLeader,
        valueText: tcLeader ? String(tcLeader.totalChances) : "0",
        key: "totalChances",
        decimals: 0,
      },
      {
        title: "LÍDER DOBLE PLAYS (DP)",
        leader: dpLeader,
        valueText: dpLeader ? String(dpLeader.doublePlays) : "0",
        key: "doublePlays",
        decimals: 0,
      },
      csLeader
        ? {
            title: "MEJOR % ATRAPADOS (CS%)",
            leader: csLeader,
            valueText: formatRate3(csLeader.caughtStealingPct),
            key: "caughtStealingPct",
            decimals: 3,
          }
        : {
            title: "LÍDER ASISTENCIAS",
            leader: assistsLeader,
            valueText: assistsLeader ? String(assistsLeader.assists) : "0",
            key: "assists",
            decimals: 0,
          },
    ];

    return defs
      .filter((d): d is typeof d & { leader: FieldingStats } => d.leader !== null)
      .map((d) => {
        const prev = compareEnabled ? findPrev(d.leader) : null;
        return {
          title: d.title,
          valueText: d.valueText,
          playerId: d.leader.playerId,
          playerName: d.leader.playerName,
          teamId: d.leader.teamId,
          teamAbbr: d.leader.teamAbbr,
          teamLogo: d.leader.teamLogo,
          hasPrev: prev !== null,
          delta:
            prev !== null
              ? computeDelta(
                  Number(d.leader[d.key] ?? 0),
                  Number(prev[d.key] ?? 0),
                  true,
                  d.decimals
                )
              : undefined,
        };
      });
  }, [
    group,
    filteredBatting,
    filteredPitching,
    filteredFielding,
    prevBattingLookup,
    prevPitchingLookup,
    prevFieldingLookup,
    compareEnabled,
  ]);

  const activePreMinCount =
    group === "batting"
      ? preMinBatting.length
      : group === "pitching"
      ? preMinPitching.length
      : preMinFielding.length;

  const activeFilteredCount =
    group === "batting"
      ? sortedBatting.length
      : group === "pitching"
      ? sortedPitching.length
      : sortedFielding.length;

  const activeTotalPoolCount = groupData.rows.length;

  const activeKpiSelectCallback =
    group === "batting"
      ? onSelectBatterForSplits
      : group === "pitching"
      ? onSelectPitcherForSplits
      : onSelectFielderForSplits;

  return (
    <div className="space-y-5">
      {/* ── Panel Superior de Control y Rango de Fechas ── */}
      <div className="bg-[#0B132B] border border-[#1E2B4D] rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E2B4D]">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              <Search className="w-5 h-5 text-[#FDB827] shrink-0" />
              <span>Buscador Individual por Rango de Fechas</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Explora líderes y rendimientos individuales de la LVBP en cualquier período de la temporada {season}.
            </p>
          </div>

          {/* Toggle de 3 grupos de estadísticas */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#070B19] p-1 rounded-xl border border-[#1E2B4D] self-start lg:self-auto">
            <button
              type="button"
              onClick={() => handleGroupChange("batting")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827]",
                group === "batting"
                  ? "bg-[#FDB827] text-slate-950 shadow-md font-black"
                  : "text-slate-300 hover:text-slate-100"
              )}
            >
              🏏 Bateo Individual
            </button>
            <button
              type="button"
              onClick={() => handleGroupChange("pitching")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827]",
                group === "pitching"
                  ? "bg-[#FDB827] text-slate-950 shadow-md font-black"
                  : "text-slate-300 hover:text-slate-100"
              )}
            >
              ⚡ Pitcheo Individual
            </button>
            <button
              type="button"
              onClick={() => handleGroupChange("fielding")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827]",
                group === "fielding"
                  ? "bg-[#FDB827] text-slate-950 shadow-md font-black"
                  : "text-slate-300 hover:text-slate-100"
              )}
            >
              🧤 Fildeo Individual
            </button>
          </div>
        </div>

        {/* Presets rápidos de fechas */}
        <div className="pt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mr-1">
            Accesos Rápidos:
          </span>
          {(
            [
              { id: "7d", label: "Últimos 7 días" },
              { id: "14d", label: "Últimos 14 días" },
              { id: "oct", label: "Octubre (12-31)" },
              { id: "nov", label: "Noviembre" },
              { id: "dic", label: "Diciembre" },
              { id: "all", label: "Temporada Completa" },
            ] as const
          ).map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827]",
                  isSelected
                    ? "bg-[#1E2B4D] text-[#FDB827] border-[#FDB827]/60"
                    : "bg-[#111C3D] hover:bg-[#1A2A57] text-slate-200 border-[#1E2B4D]"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Formulario de rango de fechas + comparación interanual */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void executeQuery();
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 pt-4"
        >
          {/* Rango temporada actual */}
          <div className="lg:col-span-5 bg-[#070B19] p-3.5 rounded-xl border border-[#1E2B4D] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#FDB827]" />
                Temporada {season} (Actual)
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                Rango Principal
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="stathead-ind-start"
                  className="text-[11px] text-slate-300 font-medium block mb-1"
                >
                  Desde:
                </label>
                <input
                  id="stathead-ind-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleCurrentDateChange(e.target.value, endDate)}
                  className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono outline-none focus:border-[#FDB827]"
                />
              </div>
              <div>
                <label
                  htmlFor="stathead-ind-end"
                  className="text-[11px] text-slate-300 font-medium block mb-1"
                >
                  Hasta:
                </label>
                <input
                  id="stathead-ind-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => handleCurrentDateChange(startDate, e.target.value)}
                  className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono outline-none focus:border-[#FDB827]"
                />
              </div>
            </div>
          </div>

          {/* Toggle opcional de comparación interanual */}
          <div className="lg:col-span-5 bg-[#070B19] p-3.5 rounded-xl border border-[#1E2B4D] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compareEnabled}
                  onChange={(e) => handleToggleCompare(e.target.checked)}
                  className="rounded border-[#1E2B4D] accent-[#FDB827] bg-[#0D152B] cursor-pointer"
                />
                <span className={compareEnabled ? "text-[#FDB827]" : "text-slate-200"}>
                  Comparar con temporada anterior (Δ)
                </span>
              </label>
              <span className="text-[11px] font-mono text-slate-300 shrink-0">
                {compareSeason}
              </span>
            </div>

            {compareEnabled ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="stathead-ind-prev-start"
                    className="text-[11px] text-slate-300 font-medium block mb-1"
                  >
                    Desde ({compareSeason}):
                  </label>
                  <input
                    id="stathead-ind-prev-start"
                    type="date"
                    value={prevStartDate}
                    onChange={(e) => setPrevStartDate(e.target.value)}
                    className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono outline-none focus:border-[#FDB827]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="stathead-ind-prev-end"
                    className="text-[11px] text-slate-300 font-medium block mb-1"
                  >
                    Hasta ({compareSeason}):
                  </label>
                  <input
                    id="stathead-ind-prev-end"
                    type="date"
                    value={prevEndDate}
                    onChange={(e) => setPrevEndDate(e.target.value)}
                    className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono outline-none focus:border-[#FDB827]"
                  />
                </div>
              </div>
            ) : (
              <div className="py-2.5 text-center text-xs text-slate-300">
                Activa la casilla para comparar rendimiento vs {compareSeason}.
              </div>
            )}
          </div>

          {/* Botón ejecutar consulta */}
          <div className="lg:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[62px] bg-[#FDB827] hover:bg-amber-300 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-slate-950" />
                  <span>Filtrar Stats</span>
                </>
              )}
            </button>
          </div>
        </form>

        {errorMsg && (
          <div
            role="alert"
            className="mt-3 flex items-center gap-2 text-xs font-semibold text-rose-300 bg-rose-950/50 border border-rose-800/60 rounded-lg p-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* ── Barra de Filtros Instantáneos sobre el Pool del Período ── */}
      <div className="bg-[#0B132B] border border-[#1E2B4D] rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Franquicia + Búsqueda por Nombre */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#FDB827] shrink-0" />
              <label
                htmlFor="stathead-team-select"
                className="text-xs font-mono text-slate-300 shrink-0"
              >
                Franquicia:
              </label>
              <select
                id="stathead-team-select"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="bg-[#070B19] text-xs font-semibold text-slate-100 border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FDB827]"
              >
                <option value="all">Toda la LVBP (8 equipos)</option>
                {LVBP_TEAM_IDS.map((id) => (
                  <option key={id} value={String(id)}>
                    {LVBP_TEAMS[id].name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar jugador..."
                aria-label="Buscar jugador"
                className="w-full bg-[#070B19] text-xs text-slate-100 placeholder:text-slate-400 border border-[#1E2B4D] rounded-lg pl-8 pr-8 py-1.5 focus:outline-none focus:border-[#FDB827]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#FDB827] p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Selector rápido de calificación mínima */}
          <div className="flex flex-wrap items-center gap-1.5">
            {minPresets.map((preset) => {
              const active = minPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setMinPreset(preset.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827]",
                    active
                      ? "bg-[#1E2B4D] text-[#FDB827] border-[#FDB827]/60"
                      : "bg-[#070B19] text-slate-300 border-[#1E2B4D] hover:text-slate-100"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pills de posición para Fildeo */}
        {group === "fielding" && (
          <div className="pt-2 border-t border-[#1E2B4D] flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-300 mr-1">
              Posición:
            </span>
            {FIELDING_POSITION_PILLS.map((pos) => {
              const active = positionFilter === pos.id;
              return (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => setPositionFilter(pos.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827]",
                    active
                      ? "bg-[#FDB827] text-slate-950 border-[#FDB827] font-bold"
                      : "bg-[#070B19] text-slate-300 border-[#1E2B4D] hover:text-slate-100"
                  )}
                >
                  {pos.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Top 4 KPI Cards de Líderes del Rango ── */}
      {!loading && kpiCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpiCards.map((card) => (
            <LeaderKpiCard
              key={card.title}
              card={card}
              compareEnabled={compareEnabled}
              onSelectPlayer={activeKpiSelectCallback}
            />
          ))}
        </div>
      )}

      {/* ── Estado de Carga / Vacío / Tabla Ordenable ── */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#0B132B] border border-[#1E2B4D]">
          <Loader2 className="w-6 h-6 text-[#FDB827] animate-spin" />
          <span className="text-xs font-mono text-slate-300">
            Consultando estadísticas del período {startDate} – {endDate}...
          </span>
        </div>
      ) : activeTotalPoolCount === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#0B132B] border border-[#1E2B4D] text-slate-300 text-xs space-y-3">
          <p>
            No se encontraron registros individuales entre {startDate} y {endDate} para la temporada {season}.
          </p>
          <button
            type="button"
            onClick={() => applyPreset("all")}
            className="px-3.5 py-1.5 rounded-lg bg-[#1E2B4D] hover:bg-[#FDB827] text-[#FDB827] hover:text-slate-950 text-xs font-bold transition-colors border border-[#FDB827]/40"
          >
            Consultar Temporada Completa
          </button>
        </div>
      ) : activeFilteredCount === 0 && activePreMinCount > 0 && minPreset !== "all" ? (
        <div className="p-8 text-center rounded-2xl bg-[#0B132B] border border-[#1E2B4D] text-slate-300 text-xs space-y-3">
          <p>
            Ningún jugador alcanza el mínimo seleccionado en el período ({activePreMinCount} disponibles sin restricción).
          </p>
          <button
            type="button"
            onClick={() => setMinPreset("all")}
            className="px-3.5 py-1.5 rounded-lg bg-[#1E2B4D] hover:bg-[#FDB827] text-[#FDB827] hover:text-slate-950 text-xs font-bold transition-colors border border-[#FDB827]/40"
          >
            Ver todos los jugadores sin mínimo
          </button>
        </div>
      ) : activeFilteredCount === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#0B132B] border border-[#1E2B4D] text-slate-300 text-xs space-y-3">
          <p>
            No hay jugadores que coincidan con los filtros actuales.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedTeam("all");
              setSearchQuery("");
              setPositionFilter("ALL");
              setMinPreset("all");
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#1E2B4D] hover:bg-[#FDB827] text-[#FDB827] hover:text-slate-950 text-xs font-bold transition-colors border border-[#FDB827]/40"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="bg-[#0B132B] border border-[#1E2B4D] rounded-2xl shadow-xl overflow-hidden">
          <div className="px-4 py-3 bg-[#070B19] border-b border-[#1E2B4D] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-100">
                  {group === "batting"
                    ? "Bateo Individual"
                    : group === "pitching"
                    ? "Pitcheo Individual"
                    : "Fildeo Individual"}
                </span>
                <span className="text-[11px] text-slate-300 font-mono">
                  ({startDate} → {endDate})
                </span>
                <span className="text-[11px] font-mono text-slate-300">
                  • Mostrando {activeFilteredCount} de {activePreMinCount}
                </span>
                {compareEnabled && (
                  <span className="text-[10px] text-[#FDB827] bg-[#FDB827]/10 px-2 py-0.5 rounded font-mono border border-[#FDB827]/30">
                    vs {compareSeason} ({prevStartDate} → {prevEndDate})
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-300">
                Haz clic en un encabezado para ordenar o en un nombre para ver splits
              </span>
            </div>

            {(group === "batting" || group === "pitching") && (
              <div className="pt-2 border-t border-[#1E2B4D]/70 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <div
                  role="group"
                  aria-label="Vista de columnas del buscador"
                  className="inline-flex flex-wrap items-center gap-1 bg-[#0B132B] p-1 rounded-lg border border-[#1E2B4D] self-start"
                >
                  {COLUMN_VIEW_OPTIONS.map((option) => {
                    const active = columnView === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setColumnView(option.id)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827]",
                          active
                            ? "bg-[#FDB827] text-slate-950 font-bold"
                            : "text-slate-300 hover:text-slate-100 hover:bg-[#131E3D]"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-slate-300 font-semibold mr-1">
                    100 = Promedio LVBP
                  </span>
                  <span className="px-1.5 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold">
                    ≥130 Élite
                  </span>
                  <span className="px-1.5 py-0.5 rounded border bg-[#FDB827]/15 text-[#FDB827] border-[#FDB827]/35 font-semibold">
                    110–129 Sobre prom.
                  </span>
                  <span className="px-1.5 py-0.5 rounded border bg-slate-800/80 text-slate-200 border-slate-700">
                    91–109 Promedio
                  </span>
                  <span className="px-1.5 py-0.5 rounded border bg-rose-500/15 text-rose-300 border-rose-500/30">
                    1–90 Bajo prom.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {groupData.group === "batting" ? (
              <table
                className={cn(
                  "w-full text-left text-xs border-collapse",
                  columnView === "all" ? "min-w-[1260px]" : "min-w-[820px]"
                )}
              >
                <thead>
                  <tr className="bg-[#0D152B] border-b border-[#1E2B4D]">
                    <th className="py-3 px-3 text-center w-10 font-mono text-[11px] text-slate-300">
                      #
                    </th>
                    <SortableHeader
                      label="JUGADOR"
                      field="playerName"
                      sortField={sortField}
                      sortAsc={sortAsc}
                      onSort={handleSort}
                      align="left"
                      className="px-3"
                    />
                    <th className="py-3 px-2 text-center font-mono text-[11px] text-slate-300">
                      EQ
                    </th>
                    <SortableHeader label="JJ" field="games" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="AP" field="plateAppearances" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} title="Apariciones al Plato" />
                    {showTraditionalCols && (
                      <>
                        <SortableHeader label="VB" field="atBats" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="CA" field="runs" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="H" field="hits" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="2B" field="doubles" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="3B" field="triples" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="HR" field="homeRuns" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="CI" field="rbi" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="BB" field="walks" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="SO" field="strikeouts" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="GIDP" field="gidp" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="BR" field="stolenBases" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                      </>
                    )}
                    <SortableHeader label="AVG" field="avg" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="OBP" field="obp" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="SLG" field="slg" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="OPS" field="ops" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} highlight />
                    {showAdvancedCols && (
                      <>
                        <SortableHeader label="ISO" field="iso" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="BABIP" field="babip" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader
                          label="wOBA"
                          field="woba"
                          sortField={sortField}
                          sortAsc={sortAsc}
                          onSort={handleSort}
                          title="Promedio Ponderado en Base (wOBA, constantes LVBP 2025-2026)"
                        />
                        {BATTING_PLUS_COLUMNS.map((col) => (
                          <SortableHeader
                            key={col.key}
                            label={col.label}
                            field={col.key}
                            sortField={sortField}
                            sortAsc={sortAsc}
                            onSort={handleSort}
                            title={col.title}
                          />
                        ))}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#152042]">
                  {sortedBatting.map((player, idx) => {
                    const isCaracas = player.teamId === CARACAS_TEAM_ID;
                    const prev = compareEnabled
                      ? prevBattingLookup.byTeam.get(
                          `${player.playerId}-${player.teamId}`
                        ) ??
                        prevBattingLookup.byPlayer.get(player.playerId) ??
                        null
                      : null;
                    const hasPrev = prev !== null;
                    const currPa = getBatterPa(player);
                    const prevPa = prev ? getBatterPa(prev) : 0;

                    return (
                      <tr
                        key={`${player.playerId}-${player.teamId}`}
                        className={cn(
                          "transition-colors",
                          isCaracas
                            ? "bg-[#FDB827]/[0.08] border-l-4 border-l-[#FDB827] hover:bg-[#FDB827]/[0.14] text-slate-100 font-medium"
                            : idx % 2 === 0
                            ? "bg-[#090F24] hover:bg-[#131E3D]/70 text-slate-200"
                            : "bg-[#070B19] hover:bg-[#131E3D]/70 text-slate-200"
                        )}
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <PlayerHeadshot
                              playerId={player.playerId}
                              playerName={player.playerName}
                              teamLogo={player.teamLogo}
                              highlight={isCaracas}
                            />
                            {onSelectBatterForSplits ? (
                              <button
                                type="button"
                                onClick={() => onSelectBatterForSplits(player.playerId)}
                                title={`Ver splits de ${player.playerName}`}
                                className={cn(
                                  "font-semibold text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827] rounded whitespace-nowrap",
                                  isCaracas ? "text-[#FDB827]" : "text-slate-100"
                                )}
                              >
                                {player.playerName}
                              </button>
                            ) : (
                              <span
                                className={cn(
                                  "font-semibold whitespace-nowrap",
                                  isCaracas ? "text-[#FDB827]" : "text-slate-100"
                                )}
                              >
                                {player.playerName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <TeamBadge teamLogo={player.teamLogo} teamAbbr={player.teamAbbr} />
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono tabular-nums">{player.games}</td>
                        <StatValueCell
                          display={currPa}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(currPa, prevPa, true, 0) : undefined}
                          className="font-semibold text-slate-100"
                        />
                        {showTraditionalCols && (
                          <>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums">{player.atBats}</td>
                            <StatValueCell
                              display={player.runs}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(player.runs, prev.runs, true, 0) : undefined}
                            />
                            <StatValueCell
                              display={player.hits}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(player.hits, prev.hits, true, 0) : undefined}
                              className="font-bold text-slate-100"
                            />
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums">{player.doubles}</td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums">{player.triples}</td>
                            <StatValueCell
                              display={player.homeRuns}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(player.homeRuns, prev.homeRuns, true, 0) : undefined}
                              className="font-bold text-[#FDB827]"
                            />
                            <StatValueCell
                              display={player.rbi}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(player.rbi, prev.rbi, true, 0) : undefined}
                            />
                            <StatValueCell
                              display={player.walks}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(player.walks, prev.walks, true, 0) : undefined}
                            />
                            <StatValueCell
                              display={player.strikeouts}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(player.strikeouts, prev.strikeouts, false, 0) : undefined}
                              className="text-slate-300"
                            />
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-300">
                              {player.gidp ?? 0}
                            </td>
                            <StatValueCell
                              display={player.stolenBases}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(player.stolenBases, prev.stolenBases, true, 0) : undefined}
                              className="text-emerald-300"
                            />
                          </>
                        )}
                        <StatValueCell
                          display={formatRate3(player.avg)}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(player.avg, prev.avg, true, 3) : undefined}
                          className="font-bold text-slate-100 px-2.5"
                        />
                        <StatValueCell
                          display={formatRate3(player.obp)}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(player.obp, prev.obp, true, 3) : undefined}
                          className="text-sky-300 font-semibold px-2.5"
                        />
                        <StatValueCell
                          display={formatRate3(player.slg)}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(player.slg, prev.slg, true, 3) : undefined}
                          className="text-sky-300 font-semibold px-2.5"
                        />
                        <StatValueCell
                          display={formatRate3(player.ops)}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(player.ops, prev.ops, true, 3) : undefined}
                          className="font-black text-[#FDB827] bg-[#FDB827]/5 px-2.5"
                        />
                        {showAdvancedCols && (
                          <>
                            <StatValueCell
                              display={formatRate3(player.iso)}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(player.iso, prev.iso, true, 3) : undefined}
                              className="text-slate-300"
                            />
                            <StatValueCell
                              display={formatRate3(player.babip)}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(player.babip, prev.babip, true, 3) : undefined}
                              className="text-slate-300"
                            />
                            <StatValueCell
                              display={
                                typeof player.woba === "number" &&
                                Number.isFinite(player.woba) ? (
                                  formatRate3(player.woba)
                                ) : (
                                  <span className="text-slate-500">--</span>
                                )
                              }
                              compareEnabled={compareEnabled}
                              hasPrev={
                                prev !== null &&
                                typeof player.woba === "number" &&
                                Number.isFinite(player.woba) &&
                                typeof prev.woba === "number" &&
                                Number.isFinite(prev.woba)
                              }
                              delta={
                                prev !== null &&
                                typeof player.woba === "number" &&
                                Number.isFinite(player.woba) &&
                                typeof prev.woba === "number" &&
                                Number.isFinite(prev.woba)
                                  ? computeDelta(player.woba, prev.woba, true, 3)
                                  : undefined
                              }
                              className="text-sky-300 font-semibold px-2.5"
                            />
                            {BATTING_PLUS_COLUMNS.map((col) => {
                              const currVal = player[col.key];
                              const prevVal = prev !== null ? prev[col.key] : undefined;
                              const hasValidPair =
                                typeof currVal === "number" &&
                                Number.isFinite(currVal) &&
                                Math.round(currVal) > 0 &&
                                typeof prevVal === "number" &&
                                Number.isFinite(prevVal) &&
                                Math.round(prevVal) > 0;
                              return (
                                <StatValueCell
                                  key={col.key}
                                  display={<PlusStatBadge value={currVal} />}
                                  compareEnabled={compareEnabled}
                                  hasPrev={hasValidPair}
                                  delta={
                                    hasValidPair
                                      ? computeDelta(
                                          Math.round(currVal),
                                          Math.round(prevVal),
                                          true,
                                          0
                                        )
                                      : undefined
                                  }
                                />
                              );
                            })}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : groupData.group === "pitching" ? (
              <table
                className={cn(
                  "w-full text-left text-xs border-collapse",
                  columnView === "all" ? "min-w-[1140px]" : "min-w-[820px]"
                )}
              >
                <thead>
                  <tr className="bg-[#0D152B] border-b border-[#1E2B4D]">
                    <th className="py-3 px-3 text-center w-10 font-mono text-[11px] text-slate-300">
                      #
                    </th>
                    <SortableHeader
                      label="LANZADOR"
                      field="playerName"
                      sortField={sortField}
                      sortAsc={sortAsc}
                      onSort={handleSort}
                      align="left"
                      className="px-3"
                    />
                    <th className="py-3 px-2 text-center font-mono text-[11px] text-slate-300">
                      EQ
                    </th>
                    <SortableHeader label="JJ" field="games" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="JI" field="gamesStarted" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="G" field="wins" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} title="Juegos Ganados" />
                    <SortableHeader label="P" field="losses" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} title="Juegos Perdidos" />
                    <SortableHeader label="SV" field="saves" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} title="Juegos Salvados" />
                    <SortableHeader label="IP" field="inningsPitched" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    {showTraditionalCols && (
                      <>
                        <SortableHeader label="H" field="hits" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="C" field="runs" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} title="Carreras Permitidas" />
                        <SortableHeader label="CL" field="earnedRuns" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} title="Carreras Limpias" />
                        <SortableHeader label="BB" field="walks" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="SO" field="strikeouts" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="HR" field="homeRuns" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader label="GIDP" field="gidp" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} title="Doble Plays Inducidos" />
                      </>
                    )}
                    <SortableHeader label="ERA" field="era" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} highlight />
                    <SortableHeader label="WHIP" field="whip" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="K/9" field="kPer9" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="BB/9" field="bbPer9" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="K/BB" field="kToBb" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    {showAdvancedCols && (
                      <>
                        <SortableHeader
                          label="FIP"
                          field="fip"
                          sortField={sortField}
                          sortAsc={sortAsc}
                          onSort={handleSort}
                          title="Pitcheo Independiente de Fildeo (FIP, ajustado a ERA de la liga)"
                        />
                        {PITCHING_PLUS_COLUMNS.map((col) => (
                          <SortableHeader
                            key={col.key}
                            label={col.label}
                            field={col.key}
                            sortField={sortField}
                            sortAsc={sortAsc}
                            onSort={handleSort}
                            title={col.title}
                          />
                        ))}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#152042]">
                  {sortedPitching.map((pitcher, idx) => {
                    const isCaracas = pitcher.teamId === CARACAS_TEAM_ID;
                    const prev = compareEnabled
                      ? prevPitchingLookup.byTeam.get(
                          `${pitcher.playerId}-${pitcher.teamId}`
                        ) ??
                        prevPitchingLookup.byPlayer.get(pitcher.playerId) ??
                        null
                      : null;
                    const hasPrev = prev !== null;

                    return (
                      <tr
                        key={`${pitcher.playerId}-${pitcher.teamId}`}
                        className={cn(
                          "transition-colors",
                          isCaracas
                            ? "bg-[#FDB827]/[0.08] border-l-4 border-l-[#FDB827] hover:bg-[#FDB827]/[0.14] text-slate-100 font-medium"
                            : idx % 2 === 0
                            ? "bg-[#090F24] hover:bg-[#131E3D]/70 text-slate-200"
                            : "bg-[#070B19] hover:bg-[#131E3D]/70 text-slate-200"
                        )}
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <PlayerHeadshot
                              playerId={pitcher.playerId}
                              playerName={pitcher.playerName}
                              teamLogo={pitcher.teamLogo}
                              highlight={isCaracas}
                            />
                            {onSelectPitcherForSplits ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectPitcherForSplits(pitcher.playerId)
                                }
                                title={`Ver splits de ${pitcher.playerName}`}
                                className={cn(
                                  "font-semibold text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827] rounded whitespace-nowrap",
                                  isCaracas ? "text-[#FDB827]" : "text-slate-100"
                                )}
                              >
                                {pitcher.playerName}
                              </button>
                            ) : (
                              <span
                                className={cn(
                                  "font-semibold whitespace-nowrap",
                                  isCaracas ? "text-[#FDB827]" : "text-slate-100"
                                )}
                              >
                                {pitcher.playerName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <TeamBadge
                            teamLogo={pitcher.teamLogo}
                            teamAbbr={pitcher.teamAbbr}
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono tabular-nums">{pitcher.games}</td>
                        <td className="py-2.5 px-2 text-center font-mono tabular-nums">{pitcher.gamesStarted}</td>
                        <td className="py-2.5 px-2 text-center font-mono tabular-nums">{pitcher.wins ?? 0}</td>
                        <td className="py-2.5 px-2 text-center font-mono tabular-nums">{pitcher.losses ?? 0}</td>
                        <StatValueCell
                          display={pitcher.saves ?? 0}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={
                            hasPrev
                              ? computeDelta(pitcher.saves ?? 0, prev.saves ?? 0, true, 0)
                              : undefined
                          }
                          className="font-semibold text-slate-100"
                        />
                        <StatValueCell
                          display={pitcher.inningsDisplay}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={
                            hasPrev
                              ? computeDelta(
                                  pitcher.inningsPitched,
                                  prev.inningsPitched,
                                  true,
                                  1
                                )
                              : undefined
                          }
                          className="font-bold text-slate-100"
                        />
                        {showTraditionalCols && (
                          <>
                            <StatValueCell
                              display={pitcher.hits}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(pitcher.hits, prev.hits, false, 0) : undefined}
                            />
                            <StatValueCell
                              display={pitcher.runs}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(pitcher.runs, prev.runs, false, 0) : undefined}
                            />
                            <StatValueCell
                              display={pitcher.earnedRuns}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(pitcher.earnedRuns, prev.earnedRuns, false, 0) : undefined}
                            />
                            <StatValueCell
                              display={pitcher.walks}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(pitcher.walks, prev.walks, false, 0) : undefined}
                            />
                            <StatValueCell
                              display={pitcher.strikeouts}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(pitcher.strikeouts, prev.strikeouts, true, 0) : undefined}
                              className="font-bold text-[#FDB827]"
                            />
                            <StatValueCell
                              display={pitcher.homeRuns}
                              compareEnabled={compareEnabled}
                              hasPrev={hasPrev}
                              delta={hasPrev ? computeDelta(pitcher.homeRuns, prev.homeRuns, false, 0) : undefined}
                            />
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-300">
                              {pitcher.gidp ?? 0}
                            </td>
                          </>
                        )}
                        <StatValueCell
                          display={formatFixed(pitcher.era, 2)}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(pitcher.era, prev.era, false, 2) : undefined}
                          className="font-black text-[#FDB827] bg-[#FDB827]/5 px-2.5"
                        />
                        <StatValueCell
                          display={formatFixed(pitcher.whip, 2)}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(pitcher.whip, prev.whip, false, 2) : undefined}
                          className="text-sky-300 font-semibold px-2.5"
                        />
                        <StatValueCell
                          display={formatFixed(pitcher.kPer9, 1)}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(pitcher.kPer9, prev.kPer9, true, 1) : undefined}
                          className="text-slate-200"
                        />
                        <StatValueCell
                          display={formatFixed(pitcher.bbPer9, 1)}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(pitcher.bbPer9, prev.bbPer9, false, 1) : undefined}
                          className="text-slate-200"
                        />
                        <StatValueCell
                          display={formatFixed(pitcher.kToBb, 1)}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(pitcher.kToBb, prev.kToBb, true, 1) : undefined}
                          className="text-slate-200"
                        />
                        {showAdvancedCols && (
                          <>
                            <StatValueCell
                              display={
                                typeof pitcher.fip === "number" &&
                                Number.isFinite(pitcher.fip) ? (
                                  formatFixed(pitcher.fip, 2)
                                ) : (
                                  <span className="text-slate-500">--</span>
                                )
                              }
                              compareEnabled={compareEnabled}
                              hasPrev={
                                prev !== null &&
                                typeof pitcher.fip === "number" &&
                                Number.isFinite(pitcher.fip) &&
                                typeof prev.fip === "number" &&
                                Number.isFinite(prev.fip)
                              }
                              delta={
                                prev !== null &&
                                typeof pitcher.fip === "number" &&
                                Number.isFinite(pitcher.fip) &&
                                typeof prev.fip === "number" &&
                                Number.isFinite(prev.fip)
                                  ? computeDelta(pitcher.fip, prev.fip, false, 2)
                                  : undefined
                              }
                              className="text-sky-300 font-semibold px-2.5"
                            />
                            {PITCHING_PLUS_COLUMNS.map((col) => {
                              const currVal = pitcher[col.key];
                              const prevVal = prev !== null ? prev[col.key] : undefined;
                              const hasValidPair =
                                typeof currVal === "number" &&
                                Number.isFinite(currVal) &&
                                Math.round(currVal) > 0 &&
                                typeof prevVal === "number" &&
                                Number.isFinite(prevVal) &&
                                Math.round(prevVal) > 0;
                              return (
                                <StatValueCell
                                  key={col.key}
                                  display={<PlusStatBadge value={currVal} />}
                                  compareEnabled={compareEnabled}
                                  hasPrev={hasValidPair}
                                  delta={
                                    hasValidPair
                                      ? computeDelta(
                                          Math.round(currVal),
                                          Math.round(prevVal),
                                          true,
                                          0
                                        )
                                      : undefined
                                  }
                                />
                              );
                            })}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-[#0D152B] border-b border-[#1E2B4D]">
                    <th className="py-3 px-3 text-center w-10 font-mono text-[11px] text-slate-300">
                      #
                    </th>
                    <SortableHeader
                      label="JUGADOR"
                      field="playerName"
                      sortField={sortField}
                      sortAsc={sortAsc}
                      onSort={handleSort}
                      align="left"
                      className="px-3"
                    />
                    <th className="py-3 px-2 text-center font-mono text-[11px] text-slate-300">
                      EQ
                    </th>
                    <SortableHeader label="POS" field="position" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="JJ" field="games" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="JI" field="gamesStarted" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="INN" field="innings" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="PO" field="putouts" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="A" field="assists" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="E" field="errors" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="TC" field="totalChances" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} highlight />
                    <SortableHeader label="FPCT" field="fieldingPct" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="DP" field="doublePlays" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="RF/9" field="rangeFactorPer9" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="CS" field="caughtStealing" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="SB" field="stolenBases" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="CS%" field="caughtStealingPct" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                    <SortableHeader label="PB" field="passedBalls" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#152042]">
                  {sortedFielding.map((player, idx) => {
                    const isCaracas = player.teamId === CARACAS_TEAM_ID;
                    const isCatcher = player.position === "C";
                    const prev = compareEnabled
                      ? prevFieldingLookup.byPlayerPos.get(
                          `${player.playerId}-${player.position}`
                        ) ??
                        prevFieldingLookup.byPlayer.get(player.playerId) ??
                        null
                      : null;
                    const hasPrev = prev !== null;

                    return (
                      <tr
                        key={`${player.playerId}-${player.teamId}-${player.position}`}
                        className={cn(
                          "transition-colors",
                          isCaracas
                            ? "bg-[#FDB827]/[0.08] border-l-4 border-l-[#FDB827] hover:bg-[#FDB827]/[0.14] text-slate-100 font-medium"
                            : idx % 2 === 0
                            ? "bg-[#090F24] hover:bg-[#131E3D]/70 text-slate-200"
                            : "bg-[#070B19] hover:bg-[#131E3D]/70 text-slate-200"
                        )}
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <PlayerHeadshot
                              playerId={player.playerId}
                              playerName={player.playerName}
                              teamLogo={player.teamLogo}
                              highlight={isCaracas}
                            />
                            {onSelectFielderForSplits ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectFielderForSplits(player.playerId)
                                }
                                title={`Ver splits de ${player.playerName}`}
                                className={cn(
                                  "font-semibold text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827] rounded whitespace-nowrap",
                                  isCaracas ? "text-[#FDB827]" : "text-slate-100"
                                )}
                              >
                                {player.playerName}
                              </button>
                            ) : (
                              <span
                                className={cn(
                                  "font-semibold whitespace-nowrap",
                                  isCaracas ? "text-[#FDB827]" : "text-slate-100"
                                )}
                              >
                                {player.playerName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <TeamBadge
                            teamLogo={player.teamLogo}
                            teamAbbr={player.teamAbbr}
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-[#070B19] text-[#FDB827] text-[10px] font-mono font-bold border border-[#1E2B4D]">
                            {player.position}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono tabular-nums">{player.games}</td>
                        <td className="py-2.5 px-2 text-center font-mono tabular-nums">{player.gamesStarted ?? 0}</td>
                        <td className="py-2.5 px-2 text-center font-mono tabular-nums">{player.innings ?? "0.0"}</td>
                        <StatValueCell
                          display={player.putouts}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(player.putouts, prev.putouts, true, 0) : undefined}
                        />
                        <StatValueCell
                          display={player.assists}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(player.assists, prev.assists, true, 0) : undefined}
                        />
                        <StatValueCell
                          display={player.errors}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(player.errors, prev.errors, false, 0) : undefined}
                          className="text-rose-300 font-semibold"
                        />
                        <StatValueCell
                          display={player.totalChances}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(player.totalChances, prev.totalChances, true, 0) : undefined}
                          className="font-black text-[#FDB827] bg-[#FDB827]/5"
                        />
                        <StatValueCell
                          display={formatRate3(player.fieldingPct)}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(player.fieldingPct, prev.fieldingPct, true, 3) : undefined}
                          className="text-sky-300 font-bold px-2.5"
                        />
                        <StatValueCell
                          display={player.doublePlays}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(player.doublePlays, prev.doublePlays, true, 0) : undefined}
                        />
                        <StatValueCell
                          display={formatFixed(player.rangeFactorPer9, 2)}
                          compareEnabled={compareEnabled}
                          hasPrev={hasPrev}
                          delta={hasPrev ? computeDelta(player.rangeFactorPer9, prev.rangeFactorPer9, true, 2) : undefined}
                        />
                        <StatValueCell
                          display={isCatcher ? player.caughtStealing ?? 0 : "--"}
                          compareEnabled={compareEnabled && isCatcher}
                          hasPrev={hasPrev}
                          delta={
                            hasPrev && isCatcher
                              ? computeDelta(
                                  player.caughtStealing ?? 0,
                                  prev.caughtStealing ?? 0,
                                  true,
                                  0
                                )
                              : undefined
                          }
                          className={isCatcher ? "text-[#FDB827] font-semibold" : "text-slate-400"}
                        />
                        <StatValueCell
                          display={isCatcher ? player.stolenBases ?? 0 : "--"}
                          compareEnabled={compareEnabled && isCatcher}
                          hasPrev={hasPrev}
                          delta={
                            hasPrev && isCatcher
                              ? computeDelta(
                                  player.stolenBases ?? 0,
                                  prev.stolenBases ?? 0,
                                  false,
                                  0
                                )
                              : undefined
                          }
                          className={isCatcher ? "text-slate-200" : "text-slate-400"}
                        />
                        <StatValueCell
                          display={
                            isCatcher ? formatRate3(player.caughtStealingPct) : "--"
                          }
                          compareEnabled={compareEnabled && isCatcher}
                          hasPrev={hasPrev}
                          delta={
                            hasPrev && isCatcher
                              ? computeDelta(
                                  player.caughtStealingPct ?? 0,
                                  prev.caughtStealingPct ?? 0,
                                  true,
                                  3
                                )
                              : undefined
                          }
                          className={isCatcher ? "text-sky-300 font-semibold" : "text-slate-400"}
                        />
                        <StatValueCell
                          display={isCatcher ? player.passedBalls ?? 0 : "--"}
                          compareEnabled={compareEnabled && isCatcher}
                          hasPrev={hasPrev}
                          delta={
                            hasPrev && isCatcher
                              ? computeDelta(
                                  player.passedBalls ?? 0,
                                  prev.passedBalls ?? 0,
                                  false,
                                  0
                                )
                              : undefined
                          }
                          className={isCatcher ? "text-slate-200" : "text-slate-400"}
                        />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
