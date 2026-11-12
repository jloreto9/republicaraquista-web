import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { getBullpenAndLineups } from "@/lib/bullpen";
import {
  getDynamicBullpenAndLineups,
  getRequestedGameLineupAndStats,
} from "@/lib/game-feed-service";
import { getBullpenBudget } from "@/lib/bullpen-budget";
import { BullpenView } from "@/components/bullpen/bullpen-view";
import { getActiveSeason } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bullpen & Tracker de Alineaciones — República Caraquista",
  description:
    "Efectividad en herencia de corredores (IR/IRS) del cuerpo de relevistas y optimización del orden al bate 1-9 de Leones del Caracas.",
};

type ValidTab = "bullpen" | "budget" | "lineups";
type ValidLineupSubtab = "card" | "frequent" | "heatmap" | "player" | "optimizer";

const VALID_TABS = new Set<ValidTab>(["bullpen", "budget", "lineups"]);
const VALID_SUBTABS = new Set<ValidLineupSubtab>([
  "card",
  "frequent",
  "heatmap",
  "player",
  "optimizer",
]);

interface BullpenPageProps {
  searchParams?: Promise<{
    tab?: string;
    subtab?: string;
    gamePk?: string;
    teamId?: string;
  }>;
}

export default async function BullpenPage({ searchParams }: BullpenPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const initialTab =
    resolvedParams.tab && VALID_TABS.has(resolvedParams.tab as ValidTab)
      ? (resolvedParams.tab as ValidTab)
      : undefined;
  const initialLineupSubtab =
    resolvedParams.subtab &&
    VALID_SUBTABS.has(resolvedParams.subtab as ValidLineupSubtab)
      ? (resolvedParams.subtab as ValidLineupSubtab)
      : undefined;

  const parsedGamePk = resolvedParams.gamePk
    ? parseInt(resolvedParams.gamePk, 10)
    : NaN;
  const initialGamePk =
    Number.isFinite(parsedGamePk) && parsedGamePk > 0 ? parsedGamePk : undefined;

  const parsedTeamId = resolvedParams.teamId
    ? parseInt(resolvedParams.teamId, 10)
    : NaN;
  const initialTeamId =
    Number.isFinite(parsedTeamId) && parsedTeamId > 0 ? parsedTeamId : undefined;
  const resolvedTeamId = initialTeamId ?? 695;

  const activeSeason = await getActiveSeason();
  const [baseData, bullpenBudget, fallbackRequested] = await Promise.all([
    activeSeason >= 2026
      ? getDynamicBullpenAndLineups(activeSeason, {
          targetGamePk: initialGamePk,
          teamId: resolvedTeamId,
        })
      : Promise.resolve(getBullpenAndLineups(activeSeason, resolvedTeamId)),
    getBullpenBudget(activeSeason, resolvedTeamId),
    activeSeason < 2026 && initialGamePk
      ? getRequestedGameLineupAndStats(initialGamePk, activeSeason, resolvedTeamId)
      : Promise.resolve(null),
  ]);

  const data = {
    ...baseData,
    lineups: fallbackRequested
      ? {
          ...baseData.lineups,
          requestedLineup: fallbackRequested.requestedLineup,
          playerStatsMap: fallbackRequested.playerStatsMap,
        }
      : baseData.lineups,
    bullpenBudget,
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Bullpen & Lineups"
        subtitle="Herencia de Corredores (IR/IRS) • Dugout Scorecard 1-9 • Matriz de Alineaciones"
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-[1800px] w-full mx-auto">
        <BullpenView
          initialData={data}
          season={activeSeason}
          initialTab={initialTab}
          initialLineupSubtab={initialLineupSubtab}
          initialGamePk={initialGamePk}
          initialTeamId={initialTeamId}
        />
      </main>
    </div>
  );
}
