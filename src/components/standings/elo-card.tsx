import Image from "next/image";
import { TeamStanding } from "@/types/sports";
import { Zap } from "lucide-react";

interface EloCardProps {
  standings: TeamStanding[];
}

export function EloCard({ standings }: EloCardProps) {
  const sortedByElo = [...standings].sort((a, b) => b.eloRating - a.eloRating);
  const maxElo = Math.max(...standings.map((s) => s.eloRating), 1600);
  const minElo = Math.min(...standings.map((s) => s.eloRating), 1400);

  return (
    <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-[#FDB827]" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Power Rankings ELO
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Base Dinámica (1500 Promedio)
        </span>
      </div>

      <div className="space-y-3">
        {sortedByElo.map((team, idx) => {
          const isCaracas = team.teamId === 695;
          const percentage = Math.round(
            ((team.eloRating - minElo) / (maxElo - minElo || 1)) * 100
          );

          return (
            <div
              key={team.teamId}
              className={`p-3 rounded-lg border transition-all ${
                isCaracas
                  ? "bg-[#002D62]/30 border-[#FDB827]/40"
                  : "bg-[#070B19]/50 border-[#1E2B4D]/60"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`w-4 text-center font-bold text-[11px] ${
                      idx === 0 ? "text-[#FDB827]" : "text-slate-400"
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div className="w-5 h-5 relative shrink-0">
                    <Image
                      src={team.logoUrl}
                      alt={team.teamName}
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </div>
                  <span
                    className={`font-sans font-semibold ${
                      isCaracas ? "text-[#FDB827]" : "text-slate-200"
                    }`}
                  >
                    {team.teamName}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-slate-400 text-[11px]">
                    {team.wins}-{team.losses}
                  </span>
                  <span
                    className={`font-bold font-mono ${
                      isCaracas ? "text-[#FDB827]" : "text-slate-100"
                    }`}
                  >
                    {team.eloRating}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-[#1E2B4D] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCaracas ? "bg-[#FDB827]" : "bg-sky-500"
                  }`}
                  style={{ width: `${Math.max(percentage, 15)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
