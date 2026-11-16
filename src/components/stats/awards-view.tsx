"use client";

import { useMemo, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Award, Crown, ShieldCheck, Trophy, Zap } from "lucide-react";
import { BattingStats, PitchingStats } from "@/types/sports";
import {
  AwardPillarBreakdown,
  MvpCandidate,
  PitcherOfYearCandidate,
  calculateMvpRace,
  calculatePitcherOfYearRace,
} from "@/lib/awards-engine";
import { getMlbFallbackHeadshotUrl, getTeam } from "@/lib/constants";

const CARACAS_TEAM_ID = 695;

interface AwardsViewProps {
  battingStats: BattingStats[];
  pitchingStats: PitchingStats[];
  teamGamesMap: Record<number, number>;
  teamWinPctMap: Record<number, number>;
  maxGames: number;
  selectedTeam: string | number;
  onSelectBatterForSplits?: (playerId: number) => void;
  onSelectPitcherForSplits?: (playerId: number) => void;
}

function formatRate3(val: number): string {
  const fixed = val.toFixed(3);
  return val < 1 && val >= 0 ? fixed.replace(/^0/, "") : fixed;
}

function CandidateAvatar({
  playerId,
  playerName,
  playerAvatar,
  teamLogo,
  size = 48,
  highlight = false,
}: {
  playerId: number;
  playerName: string;
  playerAvatar: string;
  teamLogo: string;
  size?: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full overflow-hidden bg-[#070B19] relative shrink-0 border ${
        highlight ? "border-[#FDB827]/70" : "border-[#1E2B4D]"
      }`}
    >
      <Image
        src={playerAvatar}
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
          } else if (target.src !== teamLogo) {
            target.src = teamLogo;
          }
        }}
      />
    </div>
  );
}

function PillarBars({
  pillars,
}: {
  pillars: [AwardPillarBreakdown, AwardPillarBreakdown, AwardPillarBreakdown];
}) {
  return (
    <div className="space-y-2 pt-3 border-t border-[#1E2B4D]/80">
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
        <span>Desglose de puntuación</span>
        <span className="text-slate-400">Escala 0–100 pts</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {pillars.map((pillar) => {
          const pct =
            pillar.maxScore > 0
              ? Math.max(0, Math.min(100, (pillar.score / pillar.maxScore) * 100))
              : 0;
          return (
            <div key={pillar.label} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 truncate pr-2">{pillar.label}</span>
                <span className="font-mono font-bold text-[#FDB827] shrink-0">
                  {pillar.score.toFixed(1)}/{pillar.maxScore}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#070B19] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#FDB827] transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatMetricCell({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#070B19]/75 px-2.5 py-2 rounded-lg">
      <div className="text-[10px] font-mono text-slate-400 uppercase">{label}</div>
      <div
        className={`text-sm font-mono font-bold mt-0.5 ${
          accent ? "text-[#FDB827]" : "text-slate-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function AwardHeroCard({
  overallRank,
  totalScore,
  teamWinPct,
  leaderBadges,
  pillars,
  player,
  nameNode,
  metrics,
  onSelectSplits,
}: {
  overallRank: number;
  totalScore: number;
  teamWinPct: number;
  leaderBadges: string[];
  pillars: [AwardPillarBreakdown, AwardPillarBreakdown, AwardPillarBreakdown];
  player: {
    playerId: number;
    playerName: string;
    playerAvatar: string;
    teamId: number;
    teamName: string;
    teamAbbr: string;
    teamLogo: string;
  };
  nameNode?: ReactNode;
  metrics: Array<{ label: string; value: string; accent?: boolean }>;
  onSelectSplits?: (playerId: number) => void;
}) {
  const isCaracas = player.teamId === CARACAS_TEAM_ID;

  return (
    <div
      className={`p-4 sm:p-5 rounded-xl border space-y-4 ${
        isCaracas
          ? "bg-[#002D62]/30 border-[#FDB827]/50"
          : "bg-[#0D152B] border-[#1E2B4D]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CandidateAvatar
            playerId={player.playerId}
            playerName={player.playerName}
            playerAvatar={player.playerAvatar}
            teamLogo={player.teamLogo}
            size={56}
            highlight={isCaracas}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#FDB827]">
                <Crown className="w-3.5 h-3.5" />
                <span>#{overallRank} LVBP</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                <Image
                  src={player.teamLogo}
                  alt={player.teamAbbr}
                  width={16}
                  height={16}
                  className="object-contain"
                />
                <span className="font-semibold">{player.teamName}</span>
                <span className="font-mono text-slate-400">
                  ({(teamWinPct * 100).toFixed(0)}% V)
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {nameNode || (
                <h3
                  className={`text-lg font-bold truncate ${
                    isCaracas ? "text-[#FDB827]" : "text-slate-100"
                  }`}
                >
                  {player.playerName}
                </h3>
              )}
              {onSelectSplits && (
                <button
                  type="button"
                  onClick={() => onSelectSplits(player.playerId)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#070B19] hover:bg-[#FDB827] text-slate-300 hover:text-[#070B19] border border-[#1E2B4D] transition-colors"
                >
                  <Zap className="w-2.5 h-2.5" />
                  <span>Splits</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-2xl font-mono font-extrabold text-[#FDB827] leading-none">
            {totalScore.toFixed(1)}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">PUNTOS</div>
        </div>
      </div>

      {leaderBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {leaderBadges.map((badge) => (
            <span
              key={badge}
              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-[#1E2B4D] text-[#FDB827]"
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {metrics.map((m) => (
          <StatMetricCell
            key={m.label}
            label={m.label}
            value={m.value}
            accent={m.accent}
          />
        ))}
      </div>

      <PillarBars pillars={pillars} />
    </div>
  );
}

function CaracasCallout({
  playerId,
  playerName,
  playerAvatar,
  teamLogo,
  overallRank,
  score,
  leaderScore,
  summaryLine,
}: {
  playerId: number;
  playerName: string;
  playerAvatar: string;
  teamLogo: string;
  overallRank: number;
  score: number;
  leaderScore: number;
  summaryLine: string;
}) {
  const diff = Math.max(0, leaderScore - score);
  return (
    <div className="p-3.5 rounded-xl bg-[#002D62]/25 border border-[#FDB827]/40 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <CandidateAvatar
          playerId={playerId}
          playerName={playerName}
          playerAvatar={playerAvatar}
          teamLogo={teamLogo}
          size={40}
          highlight
        />
        <div className="min-w-0">
          <div className="text-[10px] font-mono font-bold text-[#FDB827] uppercase tracking-wider">
            Referente Caraquista en la Carrera • #{overallRank} en LVBP
          </div>
          <div className="text-sm font-bold text-slate-100 truncate">{playerName}</div>
          <div className="text-[11px] font-mono text-slate-300 truncate">{summaryLine}</div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-base font-mono font-bold text-[#FDB827]">
          {score.toFixed(1)} pts
        </div>
        <div className="text-[10px] font-mono text-slate-300">-{diff.toFixed(1)} del #1</div>
      </div>
    </div>
  );
}

function ScoreCell({ score, maxLeaderScore }: { score: number; maxLeaderScore: number }) {
  const widthPct =
    maxLeaderScore > 0 ? Math.max(6, Math.min(100, (score / maxLeaderScore) * 100)) : 50;
  return (
    <div className="inline-flex flex-col items-end gap-1 min-w-[54px]">
      <span className="font-bold text-[#FDB827] leading-none">{score.toFixed(1)}</span>
      <div className="w-12 h-1 rounded-full bg-[#070B19] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#FDB827]/85"
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

function buildMvpMetrics(candidate: MvpCandidate) {
  const { player } = candidate;
  return [
    { label: "AVG", value: formatRate3(player.avg) },
    { label: "OBP", value: formatRate3(player.obp) },
    { label: "SLG", value: formatRate3(player.slg) },
    { label: "OPS", value: formatRate3(player.ops), accent: true },
    { label: "HR", value: `${player.homeRuns}` },
    { label: "CI", value: `${player.rbi}` },
    { label: "wOBA", value: formatRate3(candidate.woba) },
    { label: "wRC+", value: `${candidate.wrcPlus}`, accent: true },
  ];
}

function buildPitcherMetrics(candidate: PitcherOfYearCandidate) {
  const { player } = candidate;
  return [
    { label: "G-P", value: `${candidate.wins}-${candidate.losses}` },
    { label: "ERA", value: player.era.toFixed(2), accent: true },
    { label: "FIP", value: candidate.fip.toFixed(2) },
    { label: "WHIP", value: player.whip.toFixed(2) },
    { label: "IP", value: player.inningsDisplay },
    { label: "SO", value: `${player.strikeouts}`, accent: true },
    { label: "K/9", value: player.kPer9.toFixed(2) },
    { label: "K/BB", value: player.kToBb.toFixed(2) },
  ];
}

export function AwardsView({
  battingStats,
  pitchingStats,
  teamGamesMap,
  teamWinPctMap,
  maxGames,
  selectedTeam,
  onSelectBatterForSplits,
  onSelectPitcherForSplits,
}: AwardsViewProps) {
  const raceOptions = useMemo(
    () => ({ teamGamesMap, teamWinPctMap, maxGames }),
    [teamGamesMap, teamWinPctMap, maxGames]
  );

  const mvpRace = useMemo(
    () => calculateMvpRace(battingStats, raceOptions),
    [battingStats, raceOptions]
  );

  const pitcherRace = useMemo(
    () => calculatePitcherOfYearRace(pitchingStats, raceOptions),
    [pitchingStats, raceOptions]
  );

  const isFilteredByTeam = selectedTeam !== "all";
  const selectedTeamObj = isFilteredByTeam ? getTeam(Number(selectedTeam)) : null;

  const displayedMvp = useMemo(() => {
    if (!isFilteredByTeam) return mvpRace.candidates;
    return mvpRace.candidates.filter((c) => c.player.teamId === Number(selectedTeam));
  }, [mvpRace.candidates, isFilteredByTeam, selectedTeam]);

  const displayedPitchers = useMemo(() => {
    if (!isFilteredByTeam) return pitcherRace.candidates;
    return pitcherRace.candidates.filter((c) => c.player.teamId === Number(selectedTeam));
  }, [pitcherRace.candidates, isFilteredByTeam, selectedTeam]);

  const bestCaracasMvp = useMemo(
    () => mvpRace.candidates.find((c) => c.player.teamId === CARACAS_TEAM_ID),
    [mvpRace.candidates]
  );
  const bestCaracasPitcher = useMemo(
    () => pitcherRace.candidates.find((c) => c.player.teamId === CARACAS_TEAM_ID),
    [pitcherRace.candidates]
  );

  const mvpLeader = displayedMvp[0];
  const mvpChasers = displayedMvp.slice(1, 10);

  const pitcherLeader = displayedPitchers[0];
  const pitcherChasers = displayedPitchers.slice(1, 10);

  return (
    <div className="space-y-6">
      {/* Encabezado contextual y criterios de elegibilidad */}
      <div className="p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Trophy className="w-5 h-5 text-[#FDB827] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-100">
              Proyección en Vivo de Premios Individuales LVBP
              {selectedTeamObj ? ` — ${selectedTeamObj.name}` : ""}
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Evaluación ponderada contra toda la liga combinando impacto ofensivo/dominio en el
              montículo, producción tradicional de Triple Corona y aporte al récord colectivo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#070B19] text-slate-200 border border-[#1E2B4D]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FDB827]" />
            <span>
              MVP: ≥ {mvpRace.minPaReference} AP ({mvpRace.activeMultiplier.toFixed(1)} AP/J)
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#070B19] text-slate-200 border border-[#1E2B4D]">
            <Award className="w-3.5 h-3.5 text-[#FDB827]" />
            <span>
              Pitcher: ≥ {pitcherRace.minIpReference.toFixed(1)} IP (
              {pitcherRace.activeMultiplier.toFixed(1)} IP/J)
            </span>
          </span>
        </div>
      </div>

      {/* Dos columnas lado a lado: MVP (Izquierda) y Pitcher del Año (Derecha) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Columna 1: Jugador Más Valioso */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-2">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Jugador Más Valioso
              </h3>
              <p className="text-xs text-slate-300">
                Premio &quot;Víctor Davalillo&quot; • {mvpRace.candidates.length} candidatos elegibles
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              lgwOBA {formatRate3(mvpRace.environment.lgWoba)}
            </span>
          </div>

          {!mvpLeader ? (
            <div className="p-8 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-slate-300 text-xs">
              No hay bateadores que cumplan los requisitos con los filtros seleccionados.
            </div>
          ) : (
            <>
              <AwardHeroCard
                overallRank={mvpLeader.overallRank}
                totalScore={mvpLeader.totalScore}
                teamWinPct={mvpLeader.teamWinPct}
                leaderBadges={mvpLeader.leaderBadges}
                pillars={mvpLeader.pillars}
                player={mvpLeader.player}
                metrics={buildMvpMetrics(mvpLeader)}
                onSelectSplits={onSelectBatterForSplits}
              />

              {!isFilteredByTeam &&
                bestCaracasMvp &&
                bestCaracasMvp.overallRank > 1 && (
                  <CaracasCallout
                    playerId={bestCaracasMvp.player.playerId}
                    playerName={bestCaracasMvp.player.playerName}
                    playerAvatar={bestCaracasMvp.player.playerAvatar}
                    teamLogo={bestCaracasMvp.player.teamLogo}
                    overallRank={bestCaracasMvp.overallRank}
                    score={bestCaracasMvp.totalScore}
                    leaderScore={mvpLeader.totalScore}
                    summaryLine={`AVG ${formatRate3(bestCaracasMvp.player.avg)} • OPS ${formatRate3(bestCaracasMvp.player.ops)} • ${bestCaracasMvp.player.homeRuns} HR • ${bestCaracasMvp.player.rbi} CI • wRC+ ${bestCaracasMvp.wrcPlus}`}
                  />
                )}

              {mvpChasers.length > 0 && (
                <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#070B19]/70 border-b border-[#1E2B4D] flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-slate-200">
                      PERSEGUIDORES AL MVP
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Ranking LVBP
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 font-mono border-b border-[#1E2B4D]/70 text-[10px]">
                          <th className="py-2.5 px-3 text-center">POS</th>
                          <th className="py-2.5 px-3">JUGADOR</th>
                          <th className="py-2.5 px-2 text-center">EQ</th>
                          <th className="py-2.5 px-2 text-center">AVG</th>
                          <th className="py-2.5 px-2 text-center">OPS</th>
                          <th className="py-2.5 px-2 text-center">HR</th>
                          <th className="py-2.5 px-2 text-center">CI</th>
                          <th className="py-2.5 px-2 text-center">wRC+</th>
                          <th className="py-2.5 px-3 text-right">PTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E2B4D]/50 font-mono">
                        {mvpChasers.map((c) => {
                          const isCaracas = c.player.teamId === CARACAS_TEAM_ID;
                          return (
                            <tr
                              key={`${c.player.playerId}-${c.player.teamId}`}
                              className={
                                isCaracas
                                  ? "bg-[#002D62]/30 hover:bg-[#002D62]/45 text-slate-100"
                                  : "hover:bg-[#131E3D]/50 text-slate-300"
                              }
                            >
                              <td className="py-2.5 px-3 text-center font-bold text-slate-300">
                                #{c.overallRank}
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                <div className="flex items-center gap-2.5">
                                  <CandidateAvatar
                                    playerId={c.player.playerId}
                                    playerName={c.player.playerName}
                                    playerAvatar={c.player.playerAvatar}
                                    teamLogo={c.player.teamLogo}
                                    size={28}
                                    highlight={isCaracas}
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`font-semibold truncate ${
                                          isCaracas ? "text-[#FDB827]" : "text-slate-100"
                                        }`}
                                      >
                                        {c.player.playerName}
                                      </span>
                                      {onSelectBatterForSplits && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onSelectBatterForSplits(c.player.playerId)
                                          }
                                          title={`Ver splits de ${c.player.playerName}`}
                                          className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono bg-[#070B19] hover:bg-[#FDB827] text-slate-300 hover:text-[#070B19] border border-[#1E2B4D] transition-colors shrink-0"
                                        >
                                          <Zap className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </div>
                                    {c.leaderBadges.length > 0 && (
                                      <div className="text-[10px] font-mono text-[#FDB827] truncate">
                                        {c.leaderBadges.slice(0, 2).join(" • ")}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span className="text-[10px] font-bold text-slate-300">
                                  {c.player.teamAbbr}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                {formatRate3(c.player.avg)}
                              </td>
                              <td className="py-2.5 px-2 text-center text-sky-300 font-semibold">
                                {formatRate3(c.player.ops)}
                              </td>
                              <td className="py-2.5 px-2 text-center">{c.player.homeRuns}</td>
                              <td className="py-2.5 px-2 text-center">{c.player.rbi}</td>
                              <td className="py-2.5 px-2 text-center">{c.wrcPlus}</td>
                              <td className="py-2.5 px-3 text-right">
                                <ScoreCell
                                  score={c.totalScore}
                                  maxLeaderScore={mvpLeader.totalScore}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Columna 2: Pitcher del Año */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-2">
            <div>
              <h3 className="text-base font-bold text-slate-100">Pitcher del Año</h3>
              <p className="text-xs text-slate-300">
                Premio &quot;Carrao Bracho&quot; • {pitcherRace.candidates.length} candidatos
                elegibles
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              ERA Liga {pitcherRace.environment.lgEra.toFixed(2)}
            </span>
          </div>

          {!pitcherLeader ? (
            <div className="p-8 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-slate-300 text-xs">
              No hay lanzadores que cumplan los requisitos con los filtros seleccionados.
            </div>
          ) : (
            <>
              <AwardHeroCard
                overallRank={pitcherLeader.overallRank}
                totalScore={pitcherLeader.totalScore}
                teamWinPct={pitcherLeader.teamWinPct}
                leaderBadges={pitcherLeader.leaderBadges}
                pillars={pitcherLeader.pillars}
                player={pitcherLeader.player}
                nameNode={
                  <Link
                    href="/pitching"
                    className={`text-lg font-bold truncate hover:underline ${
                      pitcherLeader.player.teamId === CARACAS_TEAM_ID
                        ? "text-[#FDB827]"
                        : "text-slate-100"
                    }`}
                  >
                    {pitcherLeader.player.playerName}
                  </Link>
                }
                metrics={buildPitcherMetrics(pitcherLeader)}
                onSelectSplits={onSelectPitcherForSplits}
              />

              {!isFilteredByTeam &&
                bestCaracasPitcher &&
                bestCaracasPitcher.overallRank > 1 && (
                  <CaracasCallout
                    playerId={bestCaracasPitcher.player.playerId}
                    playerName={bestCaracasPitcher.player.playerName}
                    playerAvatar={bestCaracasPitcher.player.playerAvatar}
                    teamLogo={bestCaracasPitcher.player.teamLogo}
                    overallRank={bestCaracasPitcher.overallRank}
                    score={bestCaracasPitcher.totalScore}
                    leaderScore={pitcherLeader.totalScore}
                    summaryLine={`${bestCaracasPitcher.wins}-${bestCaracasPitcher.losses} • ERA ${bestCaracasPitcher.player.era.toFixed(2)} • FIP ${bestCaracasPitcher.fip.toFixed(2)} • WHIP ${bestCaracasPitcher.player.whip.toFixed(2)} • ${bestCaracasPitcher.player.strikeouts} SO`}
                  />
                )}

              {pitcherChasers.length > 0 && (
                <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#070B19]/70 border-b border-[#1E2B4D] flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-slate-200">
                      PERSEGUIDORES AL PITCHER DEL AÑO
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Ranking LVBP
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 font-mono border-b border-[#1E2B4D]/70 text-[10px]">
                          <th className="py-2.5 px-3 text-center">POS</th>
                          <th className="py-2.5 px-3">LANZADOR</th>
                          <th className="py-2.5 px-2 text-center">EQ</th>
                          <th className="py-2.5 px-2 text-center">G-P</th>
                          <th className="py-2.5 px-2 text-center">IP</th>
                          <th className="py-2.5 px-2 text-center">ERA</th>
                          <th className="py-2.5 px-2 text-center">FIP</th>
                          <th className="py-2.5 px-2 text-center">SO</th>
                          <th className="py-2.5 px-3 text-right">PTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E2B4D]/50 font-mono">
                        {pitcherChasers.map((c) => {
                          const isCaracas = c.player.teamId === CARACAS_TEAM_ID;
                          return (
                            <tr
                              key={`${c.player.playerId}-${c.player.teamId}`}
                              className={
                                isCaracas
                                  ? "bg-[#002D62]/30 hover:bg-[#002D62]/45 text-slate-100"
                                  : "hover:bg-[#131E3D]/50 text-slate-300"
                              }
                            >
                              <td className="py-2.5 px-3 text-center font-bold text-slate-300">
                                #{c.overallRank}
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                <div className="flex items-center gap-2.5">
                                  <CandidateAvatar
                                    playerId={c.player.playerId}
                                    playerName={c.player.playerName}
                                    playerAvatar={c.player.playerAvatar}
                                    teamLogo={c.player.teamLogo}
                                    size={28}
                                    highlight={isCaracas}
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <Link
                                        href="/pitching"
                                        className={`font-semibold truncate hover:underline ${
                                          isCaracas ? "text-[#FDB827]" : "text-slate-100"
                                        }`}
                                      >
                                        {c.player.playerName}
                                      </Link>
                                      {onSelectPitcherForSplits && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onSelectPitcherForSplits(c.player.playerId)
                                          }
                                          title={`Ver splits de ${c.player.playerName}`}
                                          className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono bg-[#070B19] hover:bg-[#FDB827] text-slate-300 hover:text-[#070B19] border border-[#1E2B4D] transition-colors shrink-0"
                                        >
                                          <Zap className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </div>
                                    {c.leaderBadges.length > 0 && (
                                      <div className="text-[10px] font-mono text-[#FDB827] truncate">
                                        {c.leaderBadges.slice(0, 2).join(" • ")}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span className="text-[10px] font-bold text-slate-300">
                                  {c.player.teamAbbr}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                {c.wins}-{c.losses}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                {c.player.inningsDisplay}
                              </td>
                              <td className="py-2.5 px-2 text-center text-sky-300 font-semibold">
                                {c.player.era.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-2 text-center">{c.fip.toFixed(2)}</td>
                              <td className="py-2.5 px-2 text-center">{c.player.strikeouts}</td>
                              <td className="py-2.5 px-3 text-right">
                                <ScoreCell
                                  score={c.totalScore}
                                  maxLeaderScore={pitcherLeader.totalScore}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
