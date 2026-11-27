"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  PlayerSplitsProfile,
  PlayerBatterGameLog,
  PlayerPitcherGameLog,
  PlayerCareerSeasonEntry,
  PlayerCareerPostseasonEntry,
  PlayerLvbpCareerResult,
} from "@/types/player-splits";
import { BattingStats, PitchingStats } from "@/types/sports";
import { formatSeason, getTeam } from "@/lib/constants";
import {
  mergeRegularCareerSeasons,
  mergePostseasonCareerSeasons,
} from "@/lib/player-career-service";
import { BarChart3, Shield, CalendarDays, Trophy, Loader2 } from "lucide-react";

const clientCareerCache = new Map<string, PlayerLvbpCareerResult>();

interface PlayerGeneralStatsCardProps {
  profile: PlayerSplitsProfile;
}

type ColumnView = "all" | "traditional" | "advanced";
type GameLogLimit = "7" | "15" | "all";

interface TableRowItem<T> {
  key: string;
  label: string;
  badge?: string;
  isHighlight?: boolean;
  isCombined?: boolean;
  isTeamSplit?: boolean;
  stats: T;
}

const COLUMN_VIEW_OPTIONS: Array<{ id: ColumnView; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "traditional", label: "Tradicionales" },
  { id: "advanced", label: "Avanzadas & Stats+" },
];

const GAME_LOG_OPTIONS: Array<{ id: GameLogLimit; label: string }> = [
  { id: "7", label: "Últimos 7" },
  { id: "15", label: "Últimos 15" },
  { id: "all", label: "Todos" },
];

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
      className={`inline-flex items-center justify-center min-w-[2.25rem] px-1.5 py-0.5 rounded border text-[11px] font-mono tabular-nums ${getPlusBadgeClass(
        rounded
      )}`}
    >
      {rounded}
    </span>
  );
}

function ColumnViewToggle({
  columnView,
  onChange,
  ariaLabel,
}: {
  columnView: ColumnView;
  onChange: (next: ColumnView) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 bg-[#0D152B] p-1 rounded-lg border border-[#1E2B4D]"
    >
      {COLUMN_VIEW_OPTIONS.map((option) => {
        const active = columnView === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              active
                ? "bg-[#FDB827] text-[#070B19] font-bold"
                : "text-slate-300 hover:text-slate-100 hover:bg-[#131E3D]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PlusStatsLegend() {
  return (
    <div className="px-4 py-2 bg-[#070B19]/40 border-b border-[#1E2B4D]/70 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
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
  );
}

function formatRate3(val?: number): string {
  if (typeof val !== "number" || !Number.isFinite(val)) return ".000";
  if (val >= 1.0) return val.toFixed(3);
  return val.toFixed(3).replace(/^0(?=\.)/, "");
}

function ipDecimalToOuts(ipDecimal: number, inningsDisplay?: string): number {
  if (inningsDisplay && inningsDisplay.includes(".")) {
    const [wholeStr, fracStr] = inningsDisplay.split(".");
    const whole = parseInt(wholeStr, 10) || 0;
    const rem = parseInt(fracStr, 10) || 0;
    return whole * 3 + Math.min(2, Math.max(0, rem));
  }
  if (!Number.isFinite(ipDecimal) || ipDecimal <= 0) return 0;
  const whole = Math.floor(ipDecimal + 1e-6);
  const frac = ipDecimal - whole;
  const outs =
    frac >= 0.55
      ? 2
      : frac >= 0.25
      ? 1
      : Math.abs(frac - 0.2) < 0.04
      ? 2
      : Math.abs(frac - 0.1) < 0.04
      ? 1
      : 0;
  return whole * 3 + outs;
}

function outsToDisplay(outs: number): string {
  const safe = Math.max(0, Math.round(outs));
  return `${Math.floor(safe / 3)}.${safe % 3}`;
}

function weightedAverageIfComplete(
  items: Array<{ value?: number; weight: number }>,
  expectedCount: number
): number | undefined {
  if (expectedCount <= 0 || items.length !== expectedCount) {
    return undefined;
  }
  let num = 0;
  let den = 0;
  for (const item of items) {
    if (
      typeof item.value !== "number" ||
      !Number.isFinite(item.value) ||
      item.value <= 0 ||
      item.weight <= 0
    ) {
      return undefined;
    }
    num += item.value * item.weight;
    den += item.weight;
  }
  return den > 0 ? num / den : undefined;
}

function computeTotalBatting(
  seasons: Array<PlayerCareerSeasonEntry<BattingStats>>
): BattingStats | null {
  const countable = seasons.filter((s) => !s.isTeamSplit);
  if (countable.length === 0) return null;

  let games = 0;
  let plateAppearances = 0;
  let atBats = 0;
  let runs = 0;
  let hits = 0;
  let doubles = 0;
  let triples = 0;
  let homeRuns = 0;
  let rbi = 0;
  let walks = 0;
  let strikeouts = 0;
  let stolenBases = 0;
  let caughtStealing = 0;
  let gidp = 0;
  let hbp = 0;
  let sf = 0;
  let sh = 0;

  const wobaItems: Array<{ value?: number; weight: number }> = [];
  const avgPlusItems: Array<{ value?: number; weight: number }> = [];
  const obpPlusItems: Array<{ value?: number; weight: number }> = [];
  const slgPlusItems: Array<{ value?: number; weight: number }> = [];
  const opsPlusItems: Array<{ value?: number; weight: number }> = [];
  const wobaPlusItems: Array<{ value?: number; weight: number }> = [];
  const wrcPlusItems: Array<{ value?: number; weight: number }> = [];

  for (const { stats } of countable) {
    const pa =
      stats.plateAppearances ??
      stats.pa ??
      stats.atBats + stats.walks + (stats.hbp ?? 0) + (stats.sf ?? 0) + (stats.sh ?? 0);
    games += stats.games || 0;
    plateAppearances += pa;
    atBats += stats.atBats || 0;
    runs += stats.runs || 0;
    hits += stats.hits || 0;
    doubles += stats.doubles || 0;
    triples += stats.triples || 0;
    homeRuns += stats.homeRuns || 0;
    rbi += stats.rbi || 0;
    walks += stats.walks || 0;
    strikeouts += stats.strikeouts || 0;
    stolenBases += stats.stolenBases || 0;
    caughtStealing += stats.caughtStealing || 0;
    gidp += stats.gidp || 0;
    hbp += stats.hbp || 0;
    sf += stats.sf || 0;
    sh += stats.sh || 0;

    wobaItems.push({ value: stats.woba, weight: pa });
    avgPlusItems.push({ value: stats.avgPlus, weight: pa });
    obpPlusItems.push({ value: stats.obpPlus, weight: pa });
    slgPlusItems.push({ value: stats.slgPlus, weight: pa });
    opsPlusItems.push({ value: stats.opsPlus, weight: pa });
    wobaPlusItems.push({ value: stats.wobaPlus, weight: pa });
    wrcPlusItems.push({ value: stats.wrcPlus, weight: pa });
  }

  const avg = atBats > 0 ? hits / atBats : 0;
  const obpDen = atBats + walks + hbp + sf;
  const obp = obpDen > 0 ? (hits + walks + hbp) / obpDen : 0;
  const singles = Math.max(0, hits - doubles - triples - homeRuns);
  const tb = singles + doubles * 2 + triples * 3 + homeRuns * 4;
  const slg = atBats > 0 ? tb / atBats : 0;
  const ops = obp + slg;
  const iso = slg - avg;
  const babipDen = atBats - strikeouts - homeRuns + sf;
  const babip = babipDen > 0 ? (hits - homeRuns) / babipDen : 0;

  const first = countable[0].stats;
  return {
    ...first,
    teamAbbr: "LVBP",
    games,
    plateAppearances,
    atBats,
    runs,
    hits,
    doubles,
    triples,
    homeRuns,
    rbi,
    walks,
    strikeouts,
    stolenBases,
    caughtStealing,
    gidp,
    hbp,
    sf,
    sh,
    avg,
    obp,
    slg,
    ops,
    iso,
    babip,
    woba: weightedAverageIfComplete(wobaItems, countable.length),
    avgPlus: weightedAverageIfComplete(avgPlusItems, countable.length),
    obpPlus: weightedAverageIfComplete(obpPlusItems, countable.length),
    slgPlus: weightedAverageIfComplete(slgPlusItems, countable.length),
    opsPlus: weightedAverageIfComplete(opsPlusItems, countable.length),
    wobaPlus: weightedAverageIfComplete(wobaPlusItems, countable.length),
    wrcPlus: weightedAverageIfComplete(wrcPlusItems, countable.length),
  };
}

function computeTotalPitching(
  seasons: Array<PlayerCareerSeasonEntry<PitchingStats>>
): PitchingStats | null {
  const countable = seasons.filter((s) => !s.isTeamSplit);
  if (countable.length === 0) return null;

  let games = 0;
  let gamesStarted = 0;
  let totalOuts = 0;
  let hits = 0;
  let runs = 0;
  let earnedRuns = 0;
  let walks = 0;
  let strikeouts = 0;
  let homeRuns = 0;
  let gidp = 0;
  let wins = 0;
  let losses = 0;
  let saves = 0;

  const fipItems: Array<{ value?: number; weight: number }> = [];
  const eraPlusItems: Array<{ value?: number; weight: number }> = [];
  const whipPlusItems: Array<{ value?: number; weight: number }> = [];
  const fipPlusItems: Array<{ value?: number; weight: number }> = [];

  for (const { stats } of countable) {
    const outs = ipDecimalToOuts(stats.inningsPitched, stats.inningsDisplay);
    games += stats.games || 0;
    gamesStarted += stats.gamesStarted || 0;
    totalOuts += outs;
    hits += stats.hits || 0;
    runs += stats.runs || 0;
    earnedRuns += stats.earnedRuns || 0;
    walks += stats.walks || 0;
    strikeouts += stats.strikeouts || 0;
    homeRuns += stats.homeRuns || 0;
    gidp += stats.gidp || 0;
    wins += stats.wins || 0;
    losses += stats.losses || 0;
    saves += stats.saves || 0;

    fipItems.push({ value: stats.fip, weight: outs });
    eraPlusItems.push({ value: stats.eraPlus, weight: outs });
    whipPlusItems.push({ value: stats.whipPlus, weight: outs });
    fipPlusItems.push({ value: stats.fipPlus, weight: outs });
  }

  const era = totalOuts > 0 ? (earnedRuns * 27) / totalOuts : 0;
  const whip = totalOuts > 0 ? ((walks + hits) * 3) / totalOuts : 0;
  const kPer9 = totalOuts > 0 ? (strikeouts * 27) / totalOuts : 0;
  const bbPer9 = totalOuts > 0 ? (walks * 27) / totalOuts : 0;
  const kToBb = walks > 0 ? strikeouts / walks : strikeouts;

  const first = countable[0].stats;
  return {
    ...first,
    teamAbbr: "LVBP",
    games,
    gamesStarted,
    inningsPitched: totalOuts / 3,
    inningsDisplay: outsToDisplay(totalOuts),
    hits,
    runs,
    earnedRuns,
    walks,
    strikeouts,
    homeRuns,
    gidp,
    wins,
    losses,
    saves,
    era,
    whip,
    kPer9,
    bbPer9,
    kToBb,
    fip: weightedAverageIfComplete(fipItems, countable.length),
    eraPlus: weightedAverageIfComplete(eraPlusItems, countable.length),
    whipPlus: weightedAverageIfComplete(whipPlusItems, countable.length),
    fipPlus: weightedAverageIfComplete(fipPlusItems, countable.length),
  };
}

function buildSeasonRowKey(
  entry: {
    season: number;
    isCombined?: boolean;
    isTeamSplit?: boolean;
    stats: { teamId: number };
  },
  phase?: string
): string {
  const suffix = entry.isCombined
    ? "combined"
    : entry.isTeamSplit
    ? `split-${entry.stats.teamId}`
    : String(entry.stats.teamId);
  return phase ? `${entry.season}-${phase}-${suffix}` : `${entry.season}-${suffix}`;
}

function getSeasonRowLabel(entry: {
  season: number;
  isTeamSplit?: boolean;
  stats: { teamId: number; teamName?: string };
}): string {
  if (entry.isTeamSplit) {
    return entry.stats.teamName || getTeam(entry.stats.teamId).name || "Club";
  }
  return formatSeason(entry.season);
}

function SeasonLabelCell({
  label,
  badge,
  isTeamSplit,
}: {
  label: string;
  badge?: string;
  isTeamSplit?: boolean;
}) {
  return (
    <td className="py-2.5 px-3 font-sans font-bold text-slate-100 whitespace-nowrap">
      {isTeamSplit ? (
        <span className="pl-3 text-slate-400 font-normal">↳ {label}</span>
      ) : (
        <span>{label}</span>
      )}
      {badge && !isTeamSplit && (
        <span className="ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FDB827]/15 text-[#FDB827] border border-[#FDB827]/30">
          {badge}
        </span>
      )}
    </td>
  );
}

function SeasonTeamCell({
  teamId,
  teamAbbr,
  isCombined,
  isTeamSplit,
}: {
  teamId: number;
  teamAbbr?: string;
  isCombined?: boolean;
  isTeamSplit?: boolean;
}) {
  const resolvedAbbr = teamAbbr || getTeam(teamId).abbreviation;
  return (
    <td
      className={`py-2.5 px-2 text-center ${
        isTeamSplit ? "text-slate-400" : "text-slate-300 font-semibold"
      }`}
    >
      {isCombined ? (
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[#FDB827]/15 text-[#FDB827] border border-[#FDB827]/30 text-[10px] font-mono font-bold">
          {resolvedAbbr}
        </span>
      ) : (
        resolvedAbbr
      )}
    </td>
  );
}

function BattingSeasonTable({
  rows,
  totalRow,
  totalLabel,
  columnView,
  firstColumnHeader,
}: {
  rows: Array<TableRowItem<BattingStats>>;
  totalRow: BattingStats | null;
  totalLabel: string;
  columnView: ColumnView;
  firstColumnHeader: string;
}) {
  const showTraditional = columnView === "all" || columnView === "traditional";
  const showAdvanced = columnView === "all" || columnView === "advanced";

  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full text-left text-xs ${
          columnView === "all" ? "min-w-[1140px]" : "min-w-[740px]"
        }`}
      >
        <thead>
          <tr className="bg-[#070B19]/50 text-slate-400 font-mono border-b border-[#1E2B4D] text-[10px]">
            <th className="py-2.5 px-3 font-semibold">{firstColumnHeader}</th>
            <th className="py-2.5 px-2 text-center">EQ</th>
            <th className="py-2.5 px-2 text-center">JJ</th>
            <th className="py-2.5 px-2 text-center font-semibold text-slate-200">AP</th>
            {showTraditional && (
              <>
                <th className="py-2.5 px-2 text-center">VB</th>
                <th className="py-2.5 px-2 text-center">CA</th>
                <th className="py-2.5 px-2 text-center font-bold text-slate-200">H</th>
                <th className="py-2.5 px-2 text-center">2B</th>
                <th className="py-2.5 px-2 text-center">3B</th>
                <th className="py-2.5 px-2 text-center font-bold text-[#FDB827]">HR</th>
                <th className="py-2.5 px-2 text-center">CI</th>
                <th className="py-2.5 px-2 text-center">BB</th>
                <th className="py-2.5 px-2 text-center">SO</th>
                <th className="py-2.5 px-2 text-center">BR</th>
              </>
            )}
            <th className="py-2.5 px-2 text-center font-semibold text-slate-100">AVG</th>
            <th className="py-2.5 px-2 text-center text-sky-400 font-semibold">OBP</th>
            <th className="py-2.5 px-2 text-center text-sky-400 font-semibold">SLG</th>
            <th className="py-2.5 px-2.5 text-center font-bold text-[#FDB827]">OPS</th>
            {showAdvanced && (
              <>
                <th className="py-2.5 px-2 text-center">ISO</th>
                <th className="py-2.5 px-2 text-center">BABIP</th>
                <th className="py-2.5 px-2 text-center text-sky-300 font-semibold">wOBA</th>
                <th className="py-2.5 px-2 text-center">AVG+</th>
                <th className="py-2.5 px-2 text-center">OBP+</th>
                <th className="py-2.5 px-2 text-center">SLG+</th>
                <th className="py-2.5 px-2 text-center">OPS+</th>
                <th className="py-2.5 px-2 text-center">wOBA+</th>
                <th className="py-2.5 px-2 text-center">wRC+</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E2B4D]/60 font-mono text-[11px]">
          {rows.map(({ key, label, badge, isHighlight, isCombined, isTeamSplit, stats }) => {
            const pa =
              stats.plateAppearances ??
              stats.pa ??
              stats.atBats + stats.walks + (stats.hbp ?? 0) + (stats.sf ?? 0);
            return (
              <tr
                key={key}
                className={`hover:bg-[#131E3D]/50 transition-colors ${
                  isTeamSplit
                    ? "bg-[#070B19]/30 text-slate-400"
                    : isHighlight
                    ? "bg-[#002D62]/20"
                    : ""
                }`}
              >
                <SeasonLabelCell label={label} badge={badge} isTeamSplit={isTeamSplit} />
                <SeasonTeamCell
                  teamId={stats.teamId}
                  teamAbbr={stats.teamAbbr}
                  isCombined={isCombined}
                  isTeamSplit={isTeamSplit}
                />
                <td className="py-2.5 px-2 text-center text-slate-300">{stats.games}</td>
                <td className="py-2.5 px-2 text-center font-semibold text-slate-100">{pa}</td>
                {showTraditional && (
                  <>
                    <td className="py-2.5 px-2 text-center text-slate-300">{stats.atBats}</td>
                    <td className="py-2.5 px-2 text-center text-slate-400">{stats.runs}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-100">{stats.hits}</td>
                    <td className="py-2.5 px-2 text-center text-slate-400">{stats.doubles}</td>
                    <td className="py-2.5 px-2 text-center text-slate-400">{stats.triples}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">{stats.homeRuns}</td>
                    <td className="py-2.5 px-2 text-center text-slate-200">{stats.rbi}</td>
                    <td className="py-2.5 px-2 text-center text-slate-400">{stats.walks}</td>
                    <td className="py-2.5 px-2 text-center text-slate-400">{stats.strikeouts}</td>
                    <td className="py-2.5 px-2 text-center text-emerald-400">{stats.stolenBases}</td>
                  </>
                )}
                <td className="py-2.5 px-2 text-center font-bold text-slate-100">{formatRate3(stats.avg)}</td>
                <td className="py-2.5 px-2 text-center text-sky-400 font-semibold">{formatRate3(stats.obp)}</td>
                <td className="py-2.5 px-2 text-center text-sky-400 font-semibold">{formatRate3(stats.slg)}</td>
                <td className="py-2.5 px-2.5 text-center font-bold text-[#FDB827]">{formatRate3(stats.ops)}</td>
                {showAdvanced && (
                  <>
                    <td className="py-2.5 px-2 text-center text-slate-300">{formatRate3(stats.iso)}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{formatRate3(stats.babip)}</td>
                    <td className="py-2.5 px-2 text-center font-semibold text-sky-300">
                      {typeof stats.woba === "number" ? formatRate3(stats.woba) : "--"}
                    </td>
                    <td className="py-2.5 px-2 text-center"><PlusStatBadge value={stats.avgPlus} /></td>
                    <td className="py-2.5 px-2 text-center"><PlusStatBadge value={stats.obpPlus} /></td>
                    <td className="py-2.5 px-2 text-center"><PlusStatBadge value={stats.slgPlus} /></td>
                    <td className="py-2.5 px-2 text-center"><PlusStatBadge value={stats.opsPlus} /></td>
                    <td className="py-2.5 px-2 text-center"><PlusStatBadge value={stats.wobaPlus} /></td>
                    <td className="py-2.5 px-2 text-center"><PlusStatBadge value={stats.wrcPlus} /></td>
                  </>
                )}
              </tr>
            );
          })}

          {totalRow && (
            <tr className="bg-[#070B19]/80 font-bold border-t-2 border-[#1E2B4D]">
              <td className="py-2.5 px-3 font-sans text-[#FDB827] whitespace-nowrap">
                {totalLabel}
              </td>
              <td className="py-2.5 px-2 text-center text-slate-400">LVBP</td>
              <td className="py-2.5 px-2 text-center text-slate-200">{totalRow.games}</td>
              <td className="py-2.5 px-2 text-center text-slate-100">{totalRow.plateAppearances}</td>
              {showTraditional && (
                <>
                  <td className="py-2.5 px-2 text-center text-slate-200">{totalRow.atBats}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{totalRow.runs}</td>
                  <td className="py-2.5 px-2 text-center text-slate-100">{totalRow.hits}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{totalRow.doubles}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{totalRow.triples}</td>
                  <td className="py-2.5 px-2 text-center text-[#FDB827]">{totalRow.homeRuns}</td>
                  <td className="py-2.5 px-2 text-center text-slate-200">{totalRow.rbi}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{totalRow.walks}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{totalRow.strikeouts}</td>
                  <td className="py-2.5 px-2 text-center text-emerald-400">{totalRow.stolenBases}</td>
                </>
              )}
              <td className="py-2.5 px-2 text-center text-slate-100">{formatRate3(totalRow.avg)}</td>
              <td className="py-2.5 px-2 text-center text-sky-400">{formatRate3(totalRow.obp)}</td>
              <td className="py-2.5 px-2 text-center text-sky-400">{formatRate3(totalRow.slg)}</td>
              <td className="py-2.5 px-2.5 text-center text-[#FDB827]">{formatRate3(totalRow.ops)}</td>
              {showAdvanced && (
                <>
                  <td className="py-2.5 px-2 text-center text-slate-200">{formatRate3(totalRow.iso)}</td>
                  <td className="py-2.5 px-2 text-center text-slate-200">{formatRate3(totalRow.babip)}</td>
                  <td className="py-2.5 px-2 text-center text-sky-300">
                    {typeof totalRow.woba === "number" ? formatRate3(totalRow.woba) : "--"}
                  </td>
                  <td className="py-2.5 px-2 text-center"><PlusStatBadge value={totalRow.avgPlus} /></td>
                  <td className="py-2.5 px-2 text-center"><PlusStatBadge value={totalRow.obpPlus} /></td>
                  <td className="py-2.5 px-2 text-center"><PlusStatBadge value={totalRow.slgPlus} /></td>
                  <td className="py-2.5 px-2 text-center"><PlusStatBadge value={totalRow.opsPlus} /></td>
                  <td className="py-2.5 px-2 text-center"><PlusStatBadge value={totalRow.wobaPlus} /></td>
                  <td className="py-2.5 px-2 text-center"><PlusStatBadge value={totalRow.wrcPlus} /></td>
                </>
              )}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PitchingSeasonTable({
  rows,
  totalRow,
  totalLabel,
  columnView,
  firstColumnHeader,
}: {
  rows: Array<TableRowItem<PitchingStats>>;
  totalRow: PitchingStats | null;
  totalLabel: string;
  columnView: ColumnView;
  firstColumnHeader: string;
}) {
  const showTraditional = columnView === "all" || columnView === "traditional";
  const showAdvanced = columnView === "all" || columnView === "advanced";

  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full text-left text-xs ${
          columnView === "all" ? "min-w-[1040px]" : "min-w-[720px]"
        }`}
      >
        <thead>
          <tr className="bg-[#070B19]/50 text-slate-400 font-mono border-b border-[#1E2B4D] text-[10px]">
            <th className="py-2.5 px-3 font-semibold">{firstColumnHeader}</th>
            <th className="py-2.5 px-2 text-center">EQ</th>
            <th className="py-2.5 px-2 text-center">JJ</th>
            <th className="py-2.5 px-2 text-center">JI</th>
            <th className="py-2.5 px-2 text-center font-bold text-slate-100">IP</th>
            {showTraditional && (
              <>
                <th className="py-2.5 px-2 text-center">H</th>
                <th className="py-2.5 px-2 text-center">C</th>
                <th className="py-2.5 px-2 text-center">CL</th>
                <th className="py-2.5 px-2 text-center">BB</th>
                <th className="py-2.5 px-2 text-center font-bold text-[#FDB827]">SO</th>
                <th className="py-2.5 px-2 text-center">HR</th>
              </>
            )}
            <th className="py-2.5 px-2.5 text-center font-bold text-[#FDB827]">ERA</th>
            <th className="py-2.5 px-2 text-center text-sky-400 font-semibold">WHIP</th>
            <th className="py-2.5 px-2 text-center">K/9</th>
            <th className="py-2.5 px-2 text-center">BB/9</th>
            <th className="py-2.5 px-2 text-center">K/BB</th>
            {showAdvanced && (
              <>
                <th className="py-2.5 px-2 text-center text-sky-300 font-semibold">FIP</th>
                <th className="py-2.5 px-2 text-center">ERA+</th>
                <th className="py-2.5 px-2 text-center">WHIP+</th>
                <th className="py-2.5 px-2 text-center">FIP+</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E2B4D]/60 font-mono text-[11px]">
          {rows.map(({ key, label, badge, isHighlight, isCombined, isTeamSplit, stats }) => (
            <tr
              key={key}
              className={`hover:bg-[#131E3D]/50 transition-colors ${
                isTeamSplit
                  ? "bg-[#070B19]/30 text-slate-400"
                  : isHighlight
                  ? "bg-[#002D62]/20"
                  : ""
              }`}
            >
              <SeasonLabelCell label={label} badge={badge} isTeamSplit={isTeamSplit} />
              <SeasonTeamCell
                teamId={stats.teamId}
                teamAbbr={stats.teamAbbr}
                isCombined={isCombined}
                isTeamSplit={isTeamSplit}
              />
              <td className="py-2.5 px-2 text-center text-slate-300">{stats.games}</td>
              <td className="py-2.5 px-2 text-center text-slate-300">{stats.gamesStarted}</td>
              <td className="py-2.5 px-2 text-center font-bold text-slate-100">{stats.inningsDisplay}</td>
              {showTraditional && (
                <>
                  <td className="py-2.5 px-2 text-center text-slate-300">{stats.hits}</td>
                  <td className="py-2.5 px-2 text-center text-slate-400">{stats.runs}</td>
                  <td className="py-2.5 px-2 text-center text-slate-400">{stats.earnedRuns}</td>
                  <td className="py-2.5 px-2 text-center text-slate-400">{stats.walks}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">{stats.strikeouts}</td>
                  <td className="py-2.5 px-2 text-center text-slate-400">{stats.homeRuns}</td>
                </>
              )}
              <td className="py-2.5 px-2.5 text-center font-bold text-[#FDB827]">{stats.era.toFixed(2)}</td>
              <td className="py-2.5 px-2 text-center text-sky-400 font-semibold">{stats.whip.toFixed(2)}</td>
              <td className="py-2.5 px-2 text-center text-slate-300">{stats.kPer9.toFixed(1)}</td>
              <td className="py-2.5 px-2 text-center text-slate-300">{stats.bbPer9.toFixed(1)}</td>
              <td className="py-2.5 px-2 text-center text-slate-300">{stats.kToBb.toFixed(1)}</td>
              {showAdvanced && (
                <>
                  <td className="py-2.5 px-2 text-center font-semibold text-sky-300">
                    {typeof stats.fip === "number" && Number.isFinite(stats.fip)
                      ? stats.fip.toFixed(2)
                      : "--"}
                  </td>
                  <td className="py-2.5 px-2 text-center"><PlusStatBadge value={stats.eraPlus} /></td>
                  <td className="py-2.5 px-2 text-center"><PlusStatBadge value={stats.whipPlus} /></td>
                  <td className="py-2.5 px-2 text-center"><PlusStatBadge value={stats.fipPlus} /></td>
                </>
              )}
            </tr>
          ))}

          {totalRow && (
            <tr className="bg-[#070B19]/80 font-bold border-t-2 border-[#1E2B4D]">
              <td className="py-2.5 px-3 font-sans text-[#FDB827] whitespace-nowrap">
                {totalLabel}
              </td>
              <td className="py-2.5 px-2 text-center text-slate-400">LVBP</td>
              <td className="py-2.5 px-2 text-center text-slate-200">{totalRow.games}</td>
              <td className="py-2.5 px-2 text-center text-slate-200">{totalRow.gamesStarted}</td>
              <td className="py-2.5 px-2 text-center text-slate-100">{totalRow.inningsDisplay}</td>
              {showTraditional && (
                <>
                  <td className="py-2.5 px-2 text-center text-slate-200">{totalRow.hits}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{totalRow.runs}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{totalRow.earnedRuns}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{totalRow.walks}</td>
                  <td className="py-2.5 px-2 text-center text-[#FDB827]">{totalRow.strikeouts}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{totalRow.homeRuns}</td>
                </>
              )}
              <td className="py-2.5 px-2.5 text-center text-[#FDB827]">{totalRow.era.toFixed(2)}</td>
              <td className="py-2.5 px-2 text-center text-sky-400">{totalRow.whip.toFixed(2)}</td>
              <td className="py-2.5 px-2 text-center text-slate-200">{totalRow.kPer9.toFixed(1)}</td>
              <td className="py-2.5 px-2 text-center text-slate-200">{totalRow.bbPer9.toFixed(1)}</td>
              <td className="py-2.5 px-2 text-center text-slate-200">{totalRow.kToBb.toFixed(1)}</td>
              {showAdvanced && (
                <>
                  <td className="py-2.5 px-2 text-center text-sky-300">
                    {typeof totalRow.fip === "number" && Number.isFinite(totalRow.fip)
                      ? totalRow.fip.toFixed(2)
                      : "--"}
                  </td>
                  <td className="py-2.5 px-2 text-center"><PlusStatBadge value={totalRow.eraPlus} /></td>
                  <td className="py-2.5 px-2 text-center"><PlusStatBadge value={totalRow.whipPlus} /></td>
                  <td className="py-2.5 px-2 text-center"><PlusStatBadge value={totalRow.fipPlus} /></td>
                </>
              )}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatGameDate(dateStr: string): string {
  if (!dateStr) return "-";
  const clean = dateStr.slice(0, 10);
  const parts = clean.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
}

export function PlayerGeneralStatsCard({ profile }: PlayerGeneralStatsCardProps) {
  const [columnView, setColumnView] = useState<ColumnView>("all");
  const [gameLogLimit, setGameLogLimit] = useState<GameLogLimit>("7");

  const careerKey = `${profile.playerId}-${profile.type}`;
  const isValidPlayerId = Number.isInteger(profile.playerId) && profile.playerId > 0;
  const [careerState, setCareerState] = useState<{
    key: string;
    data: PlayerLvbpCareerResult | null;
    doneKey: string | null;
  }>(() => {
    const cached = clientCareerCache.get(careerKey) ?? null;
    return {
      key: careerKey,
      data: cached,
      doneKey: cached ? careerKey : null,
    };
  });

  useEffect(() => {
    if (!isValidPlayerId) return;
    if (clientCareerCache.has(careerKey)) return;

    const controller = new AbortController();
    fetch(`/api/stats/player-career?player_id=${profile.playerId}&type=${profile.type}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as PlayerLvbpCareerResult;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        if (payload) {
          clientCareerCache.set(careerKey, payload);
        }
        setCareerState({
          key: careerKey,
          data: payload,
          doneKey: careerKey,
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCareerState({
          key: careerKey,
          data: null,
          doneKey: careerKey,
        });
      });

    return () => {
      controller.abort();
    };
  }, [careerKey, isValidPlayerId, profile.playerId, profile.type]);

  const cachedCareer = clientCareerCache.get(careerKey) ?? null;
  const careerData =
    cachedCareer ?? (careerState.key === careerKey ? careerState.data : null);
  const loadingCareer =
    isValidPlayerId && !cachedCareer && careerState.doneKey !== careerKey;

  const general = profile.general;
  const isPitcher = profile.type === "pitcher";
  const showAdvanced = columnView === "all" || columnView === "advanced";

  const battingSeasons: Array<PlayerCareerSeasonEntry<BattingStats>> = useMemo(
    () =>
      mergeRegularCareerSeasons(
        general?.seasonsBatting ?? [],
        careerData?.regularBatting ?? []
      ),
    [general?.seasonsBatting, careerData?.regularBatting]
  );

  const pitchingSeasons: Array<PlayerCareerSeasonEntry<PitchingStats>> = useMemo(
    () =>
      mergeRegularCareerSeasons(
        general?.seasonsPitching ?? [],
        careerData?.regularPitching ?? []
      ),
    [general?.seasonsPitching, careerData?.regularPitching]
  );

  const postseasonBatting: Array<PlayerCareerPostseasonEntry<BattingStats>> = useMemo(
    () =>
      mergePostseasonCareerSeasons(
        general?.postseasonBatting ?? [],
        careerData?.postseasonBatting ?? []
      ),
    [general?.postseasonBatting, careerData?.postseasonBatting]
  );

  const postseasonPitching: Array<PlayerCareerPostseasonEntry<PitchingStats>> = useMemo(
    () =>
      mergePostseasonCareerSeasons(
        general?.postseasonPitching ?? [],
        careerData?.postseasonPitching ?? []
      ),
    [general?.postseasonPitching, careerData?.postseasonPitching]
  );

  const countableBatting = useMemo(
    () => battingSeasons.filter((s) => !s.isTeamSplit),
    [battingSeasons]
  );
  const countablePitching = useMemo(
    () => pitchingSeasons.filter((s) => !s.isTeamSplit),
    [pitchingSeasons]
  );
  const countablePostBatting = useMemo(
    () => postseasonBatting.filter((s) => !s.isTeamSplit),
    [postseasonBatting]
  );
  const countablePostPitching = useMemo(
    () => postseasonPitching.filter((s) => !s.isTeamSplit),
    [postseasonPitching]
  );

  const distinctRegularBattingSeasons = useMemo(
    () => new Set(countableBatting.map((s) => s.season)).size,
    [countableBatting]
  );
  const distinctRegularPitchingSeasons = useMemo(
    () => new Set(countablePitching.map((s) => s.season)).size,
    [countablePitching]
  );
  const distinctPostBattingSeasons = useMemo(
    () => new Set(countablePostBatting.map((s) => s.season)).size,
    [countablePostBatting]
  );
  const distinctPostPitchingSeasons = useMemo(
    () => new Set(countablePostPitching.map((s) => s.season)).size,
    [countablePostPitching]
  );

  const totalBatting = useMemo(
    () =>
      distinctRegularBattingSeasons > 1 || countableBatting.length > 1
        ? computeTotalBatting(battingSeasons)
        : null,
    [battingSeasons, countableBatting.length, distinctRegularBattingSeasons]
  );

  const totalPitching = useMemo(
    () =>
      distinctRegularPitchingSeasons > 1 || countablePitching.length > 1
        ? computeTotalPitching(pitchingSeasons)
        : null,
    [pitchingSeasons, countablePitching.length, distinctRegularPitchingSeasons]
  );

  const careerSummaryBatting = useMemo(
    () => totalBatting ?? computeTotalBatting(battingSeasons),
    [totalBatting, battingSeasons]
  );

  const careerSummaryPitching = useMemo(
    () => totalPitching ?? computeTotalPitching(pitchingSeasons),
    [totalPitching, pitchingSeasons]
  );

  const totalPostseasonBatting = useMemo(
    () =>
      distinctPostBattingSeasons > 1 || countablePostBatting.length > 1
        ? computeTotalBatting(postseasonBatting)
        : null,
    [postseasonBatting, countablePostBatting.length, distinctPostBattingSeasons]
  );

  const totalPostseasonPitching = useMemo(
    () =>
      distinctPostPitchingSeasons > 1 || countablePostPitching.length > 1
        ? computeTotalPitching(postseasonPitching)
        : null,
    [postseasonPitching, countablePostPitching.length, distinctPostPitchingSeasons]
  );

  const visibleBatterLogs: PlayerBatterGameLog[] = useMemo(() => {
    const logs = general?.batterGameLogs ?? [];
    if (gameLogLimit === "all") return logs;
    return logs.slice(0, Number(gameLogLimit));
  }, [general?.batterGameLogs, gameLogLimit]);

  const visiblePitcherLogs: PlayerPitcherGameLog[] = useMemo(() => {
    const logs = general?.pitcherGameLogs ?? [];
    if (gameLogLimit === "all") return logs;
    return logs.slice(0, Number(gameLogLimit));
  }, [general?.pitcherGameLogs, gameLogLimit]);

  const fieldingRows = general?.fielding ?? [];

  if (!general) return null;

  const hasSeasonRows = isPitcher
    ? pitchingSeasons.length > 0
    : battingSeasons.length > 0;
  const hasPostseasonRows = isPitcher
    ? postseasonPitching.length > 0
    : postseasonBatting.length > 0;
  const hasGameLogs = isPitcher
    ? (general.pitcherGameLogs?.length ?? 0) > 0
    : (general.batterGameLogs?.length ?? 0) > 0;

  if (!hasSeasonRows && !hasPostseasonRows && fieldingRows.length === 0 && !hasGameLogs) {
    if (!loadingCareer) return null;
    return (
      <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] px-4 py-3 flex items-center gap-2 text-xs font-mono text-slate-300">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FDB827]" />
        <span>Cargando historial LVBP...</span>
      </div>
    );
  }

  const distinctRegularSeasons = isPitcher
    ? distinctRegularPitchingSeasons
    : distinctRegularBattingSeasons;
  const distinctPostSeasons = isPitcher
    ? distinctPostPitchingSeasons
    : distinctPostBattingSeasons;

  return (
    <div className="space-y-4">
      {/* a) Estadísticas Generales por Temporada (Temporada Regular) */}
      {hasSeasonRows && (
        <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-[#070B19]/80 border-b border-[#1E2B4D] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#FDB827] shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                  Estadísticas Generales por Temporada
                </h3>
                <p className="text-[11px] text-slate-400">
                  Temporada Regular LVBP (Historial completo) • Métricas tradicionales, avanzadas e índices ajustados
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {loadingCareer && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#131E3D] border border-[#1E2B4D] text-[11px] font-mono text-slate-300">
                  <Loader2 className="w-3 h-3 animate-spin text-[#FDB827]" />
                  Cargando historial LVBP...
                </span>
              )}
              <ColumnViewToggle
                columnView={columnView}
                onChange={setColumnView}
                ariaLabel="Vista de columnas generales"
              />
            </div>
          </div>

          {!isPitcher && careerSummaryBatting && (
            <div className="px-4 py-2 bg-[#0A1124] border-b border-[#1E2B4D]/80 text-[11px] font-mono text-slate-300">
              <span className="text-[#FDB827] font-semibold">
                De por vida LVBP ({distinctRegularSeasons} temp.)
              </span>
              {" • "}
              {careerSummaryBatting.games} JJ • {careerSummaryBatting.hits} H •{" "}
              {careerSummaryBatting.homeRuns} HR • {careerSummaryBatting.rbi} CI •{" "}
              {formatRate3(careerSummaryBatting.avg)} AVG •{" "}
              {formatRate3(careerSummaryBatting.ops)} OPS
            </div>
          )}

          {isPitcher && careerSummaryPitching && (
            <div className="px-4 py-2 bg-[#0A1124] border-b border-[#1E2B4D]/80 text-[11px] font-mono text-slate-300">
              <span className="text-[#FDB827] font-semibold">
                De por vida LVBP ({distinctRegularSeasons} temp.)
              </span>
              {" • "}
              {careerSummaryPitching.games} JJ • {careerSummaryPitching.inningsDisplay} IP •{" "}
              {careerSummaryPitching.strikeouts} SO •{" "}
              {careerSummaryPitching.era.toFixed(2)} ERA •{" "}
              {careerSummaryPitching.whip.toFixed(2)} WHIP
            </div>
          )}

          {showAdvanced && <PlusStatsLegend />}

          {!isPitcher ? (
            <BattingSeasonTable
              rows={battingSeasons.map((entry) => ({
                key: buildSeasonRowKey(entry),
                label: getSeasonRowLabel(entry),
                badge:
                  !entry.isTeamSplit && entry.season === profile.season
                    ? "Activa"
                    : undefined,
                isHighlight: !entry.isTeamSplit && entry.season === profile.season,
                isCombined: entry.isCombined,
                isTeamSplit: entry.isTeamSplit,
                stats: entry.stats,
              }))}
              totalRow={totalBatting}
              totalLabel={`Total de por vida LVBP (${distinctRegularSeasons} temp.)`}
              columnView={columnView}
              firstColumnHeader="TEMPORADA"
            />
          ) : (
            <PitchingSeasonTable
              rows={pitchingSeasons.map((entry) => ({
                key: buildSeasonRowKey(entry),
                label: getSeasonRowLabel(entry),
                badge:
                  !entry.isTeamSplit && entry.season === profile.season
                    ? "Activa"
                    : undefined,
                isHighlight: !entry.isTeamSplit && entry.season === profile.season,
                isCombined: entry.isCombined,
                isTeamSplit: entry.isTeamSplit,
                stats: entry.stats,
              }))}
              totalRow={totalPitching}
              totalLabel={`Total de por vida LVBP (${distinctRegularSeasons} temp.)`}
              columnView={columnView}
              firstColumnHeader="TEMPORADA"
            />
          )}
        </div>
      )}

      {/* a2) Postemporada LVBP */}
      {hasPostseasonRows && (
        <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-[#070B19]/80 border-b border-[#1E2B4D] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#FDB827] shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                  Postemporada LVBP
                </h3>
                <p className="text-[11px] text-slate-400">
                  Desempeño por fase (Comodín, Round Robin y Serie Final)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <ColumnViewToggle
                columnView={columnView}
                onChange={setColumnView}
                ariaLabel="Vista de columnas de postemporada"
              />
            </div>
          </div>

          {!hasSeasonRows && showAdvanced && <PlusStatsLegend />}

          {!isPitcher ? (
            <BattingSeasonTable
              rows={postseasonBatting.map((entry) => ({
                key: buildSeasonRowKey(entry, entry.phase),
                label: getSeasonRowLabel(entry),
                badge: entry.isTeamSplit ? undefined : entry.phaseLabel,
                isHighlight: !entry.isTeamSplit && entry.season === profile.season,
                isCombined: entry.isCombined,
                isTeamSplit: entry.isTeamSplit,
                stats: entry.stats,
              }))}
              totalRow={totalPostseasonBatting}
              totalLabel={`Total Postemporada LVBP (${distinctPostSeasons} temp.)`}
              columnView={columnView}
              firstColumnHeader="TEMP. / FASE"
            />
          ) : (
            <PitchingSeasonTable
              rows={postseasonPitching.map((entry) => ({
                key: buildSeasonRowKey(entry, entry.phase),
                label: getSeasonRowLabel(entry),
                badge: entry.isTeamSplit ? undefined : entry.phaseLabel,
                isHighlight: !entry.isTeamSplit && entry.season === profile.season,
                isCombined: entry.isCombined,
                isTeamSplit: entry.isTeamSplit,
                stats: entry.stats,
              }))}
              totalRow={totalPostseasonPitching}
              totalLabel={`Total Postemporada LVBP (${distinctPostSeasons} temp.)`}
              columnView={columnView}
              firstColumnHeader="TEMP. / FASE"
            />
          )}
        </div>
      )}

      {/* b) Resumen Defensivo */}
      {fieldingRows.length > 0 && (
        <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-[#070B19]/80 border-b border-[#1E2B4D] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#FDB827] shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                  Resumen Defensivo ({formatSeason(profile.season)})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Desglose por posición cubierta en el campo
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-[#131E3D] text-[#FDB827] px-2 py-0.5 rounded-full border border-[#1E2B4D]">
              {fieldingRows.length} {fieldingRows.length === 1 ? "posición" : "posiciones"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[680px]">
              <thead>
                <tr className="bg-[#070B19]/50 text-slate-400 font-mono border-b border-[#1E2B4D] text-[10px]">
                  <th className="py-2 px-3 font-semibold">POS</th>
                  <th className="py-2 px-2 text-center">EQ</th>
                  <th className="py-2 px-2 text-center">JJ</th>
                  <th className="py-2 px-2 text-center">JI</th>
                  <th className="py-2 px-2 text-center">INN</th>
                  <th className="py-2 px-2 text-center">PO</th>
                  <th className="py-2 px-2 text-center">A</th>
                  <th className="py-2 px-2 text-center">E</th>
                  <th className="py-2 px-2 text-center">TC</th>
                  <th className="py-2 px-2 text-center">DP</th>
                  <th className="py-2 px-2 text-center text-[#FDB827] font-bold">FLD%</th>
                  <th className="py-2 px-2 text-center">RF/9</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2B4D]/60 font-mono text-[11px]">
                {fieldingRows.map((f, idx) => (
                  <tr
                    key={`${f.position}-${f.teamId}-${idx}`}
                    className="hover:bg-[#131E3D]/50 transition-colors"
                  >
                    <td className="py-2 px-3 font-bold text-[#FDB827]">{f.position}</td>
                    <td className="py-2 px-2 text-center text-slate-300">
                      {f.teamAbbr || getTeam(f.teamId).abbreviation}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-300">{f.games}</td>
                    <td className="py-2 px-2 text-center text-slate-400">{f.gamesStarted ?? "-"}</td>
                    <td className="py-2 px-2 text-center text-slate-200">{f.innings ?? "-"}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{f.putouts}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{f.assists}</td>
                    <td className="py-2 px-2 text-center text-rose-400">{f.errors}</td>
                    <td className="py-2 px-2 text-center text-slate-200 font-semibold">{f.totalChances}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{f.doublePlays}</td>
                    <td className="py-2 px-2 text-center font-bold text-[#FDB827]">
                      {Number.isFinite(f.fieldingPct) ? f.fieldingPct.toFixed(3) : ".000"}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-300">
                      {typeof f.rangeFactorPer9 === "number" && Number.isFinite(f.rangeFactorPer9)
                        ? f.rangeFactorPer9.toFixed(2)
                        : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* c) Game Log (Bitácora de Juegos) */}
      {hasGameLogs && (
        <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-[#070B19]/80 border-b border-[#1E2B4D] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#FDB827] shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                  Bitácora de Juegos ({formatSeason(profile.season)})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Registro juego a juego ordenado del más reciente al más antiguo
                </p>
              </div>
            </div>

            <div
              role="group"
              aria-label="Cantidad de juegos en bitácora"
              className="inline-flex items-center gap-1 bg-[#0D152B] p-1 rounded-lg border border-[#1E2B4D] self-start sm:self-auto"
            >
              {GAME_LOG_OPTIONS.map((opt) => {
                const active = gameLogLimit === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setGameLogLimit(opt.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      active
                        ? "bg-[#FDB827] text-[#070B19] font-bold"
                        : "text-slate-300 hover:text-slate-100 hover:bg-[#131E3D]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            {!isPitcher ? (
              <table className="w-full text-left text-xs min-w-[780px]">
                <thead>
                  <tr className="bg-[#070B19]/50 text-slate-400 font-mono border-b border-[#1E2B4D] text-[10px]">
                    <th className="py-2 px-3 font-semibold">FECHA</th>
                    <th className="py-2 px-2">RIVAL</th>
                    <th className="py-2 px-2 text-center">RESULTADO</th>
                    <th className="py-2 px-2 text-center">VB</th>
                    <th className="py-2 px-2 text-center">CA</th>
                    <th className="py-2 px-2 text-center font-bold text-slate-200">H</th>
                    <th className="py-2 px-2 text-center">2B</th>
                    <th className="py-2 px-2 text-center">3B</th>
                    <th className="py-2 px-2 text-center text-[#FDB827]">HR</th>
                    <th className="py-2 px-2 text-center">CI</th>
                    <th className="py-2 px-2 text-center">BB</th>
                    <th className="py-2 px-2 text-center">SO</th>
                    <th className="py-2 px-2 text-center">BR</th>
                    <th className="py-2 px-2.5 text-center font-semibold text-slate-100">AVG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2B4D]/60 font-mono text-[11px]">
                  {visibleBatterLogs.map((g) => (
                    <tr key={g.gameId} className="hover:bg-[#131E3D]/50 transition-colors">
                      <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                        {formatGameDate(g.date)}
                      </td>
                      <td className="py-2 px-2 font-sans text-slate-200 whitespace-nowrap">
                        <span className="text-slate-400 font-mono mr-1">
                          {g.isHome ? "vs" : "@"}
                        </span>
                        <span className="font-semibold">{g.opponentAbbr}</span>
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            g.result === "G"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          <span>{g.result}</span>
                          <span className="font-normal opacity-90">{g.score}</span>
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center text-slate-300">{g.ab}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{g.r}</td>
                      <td className="py-2 px-2 text-center font-bold text-slate-100">{g.h}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{g.doubles}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{g.triples}</td>
                      <td className="py-2 px-2 text-center font-bold text-[#FDB827]">{g.hr}</td>
                      <td className="py-2 px-2 text-center text-slate-200">{g.rbi}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{g.bb}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{g.so}</td>
                      <td className="py-2 px-2 text-center text-emerald-400">{g.sb}</td>
                      <td className="py-2 px-2.5 text-center font-semibold text-slate-100">{g.avg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs min-w-[740px]">
                <thead>
                  <tr className="bg-[#070B19]/50 text-slate-400 font-mono border-b border-[#1E2B4D] text-[10px]">
                    <th className="py-2 px-3 font-semibold">FECHA</th>
                    <th className="py-2 px-2">RIVAL</th>
                    <th className="py-2 px-2 text-center">RESULTADO</th>
                    <th className="py-2 px-2 text-center">ROL</th>
                    <th className="py-2 px-2 text-center font-bold text-slate-100">IP</th>
                    <th className="py-2 px-2 text-center">H</th>
                    <th className="py-2 px-2 text-center">C</th>
                    <th className="py-2 px-2 text-center">CL</th>
                    <th className="py-2 px-2 text-center">BB</th>
                    <th className="py-2 px-2 text-center font-bold text-[#FDB827]">SO</th>
                    <th className="py-2 px-2 text-center">HR</th>
                    <th className="py-2 px-2.5 text-center font-bold text-[#FDB827]">ERA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2B4D]/60 font-mono text-[11px]">
                  {visiblePitcherLogs.map((g) => (
                    <tr key={g.gameId} className="hover:bg-[#131E3D]/50 transition-colors">
                      <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                        {formatGameDate(g.date)}
                      </td>
                      <td className="py-2 px-2 font-sans text-slate-200 whitespace-nowrap">
                        <span className="text-slate-400 font-mono mr-1">
                          {g.isHome ? "vs" : "@"}
                        </span>
                        <span className="font-semibold">{g.opponentAbbr}</span>
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            g.result === "G"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          <span>{g.result}</span>
                          <span className="font-normal opacity-90">{g.score}</span>
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-[#070B19] border border-[#1E2B4D] text-[10px] text-slate-300">
                          {g.isStart ? "SP" : "RP"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-100">{g.ipDisplay}</td>
                      <td className="py-2 px-2 text-center text-slate-300">{g.h}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{g.r}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{g.er}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{g.bb}</td>
                      <td className="py-2 px-2 text-center font-bold text-[#FDB827]">{g.so}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{g.hr}</td>
                      <td className="py-2 px-2.5 text-center font-semibold text-[#FDB827]">
                        {g.eraGame}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
