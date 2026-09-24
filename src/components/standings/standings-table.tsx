import Image from "next/image";
import { TeamStanding } from "@/types/sports";
import { Trophy } from "lucide-react";

interface StandingsTableProps {
  standings: TeamStanding[];
  showPythagorean?: boolean;
}

export function StandingsTable({
  standings,
  showPythagorean = true,
}: StandingsTableProps) {
  if (!standings || standings.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-slate-400 text-xs">
        No se encontraron registros de tabla de posiciones.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] overflow-hidden">
      <div className="p-4 border-b border-[#1E2B4D] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-[#FDB827]" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Tabla de Posiciones Oficial
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Top 5 avanzan al Round Robin
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#070B19]/60 text-slate-400 font-mono border-b border-[#1E2B4D] text-[11px]">
              <th className="py-3 px-4 font-semibold text-center w-12">POS</th>
              <th className="py-3 px-4 font-semibold">EQUIPO</th>
              <th className="py-3 px-3 font-semibold text-center">JJ</th>
              <th className="py-3 px-3 font-semibold text-center text-slate-200">G</th>
              <th className="py-3 px-3 font-semibold text-center text-slate-200">P</th>
              <th className="py-3 px-3 font-semibold text-center text-[#FDB827]">PCT</th>
              <th className="py-3 px-3 font-semibold text-center">DIF</th>
              <th className="py-3 px-3 font-semibold text-center">CA</th>
              <th className="py-3 px-3 font-semibold text-center">CP</th>
              <th className="py-3 px-3 font-semibold text-center">+/-</th>
              <th className="py-3 px-3 font-semibold text-center">CASA</th>
              <th className="py-3 px-3 font-semibold text-center">VISITA</th>
              <th className="py-3 px-3 font-semibold text-center">RACHA</th>
              <th className="py-3 px-3 font-semibold text-center">L10</th>
              {showPythagorean && (
                <>
                  <th className="py-3 px-3 font-semibold text-center text-sky-400">
                    xPCT
                  </th>
                  <th className="py-3 px-3 font-semibold text-center text-sky-400">
                    xW-xL
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2B4D]/50">
            {standings.map((team, idx) => {
              const isCaracas = team.teamId === 695;
              const isClassified = idx < 5;

              return (
                <tr
                  key={team.teamId}
                  className={`transition-colors font-mono ${
                    isCaracas
                      ? "bg-[#002D62]/30 hover:bg-[#002D62]/45 font-semibold text-slate-100"
                      : "hover:bg-[#131E3D]/50 text-slate-300"
                  }`}
                >
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold ${
                        isClassified
                          ? "bg-[#1E2B4D] text-[#FDB827]"
                          : "text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans font-semibold">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 relative shrink-0">
                        <Image
                          src={team.logoUrl}
                          alt={team.teamName}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      </div>
                      <span className={isCaracas ? "text-[#FDB827]" : "text-slate-100"}>
                        {team.teamName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">{team.gamesPlayed}</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-100">
                    {team.wins}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300">
                    {team.losses}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-[#FDB827]">
                    {team.pct.toFixed(3).replace(/^0+/, "")}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300">
                    {team.gamesBack}
                  </td>
                  <td className="py-3 px-3 text-center">{team.runsScored}</td>
                  <td className="py-3 px-3 text-center">{team.runsAllowed}</td>
                  <td
                    className={`py-3 px-3 text-center font-semibold ${
                      team.runDifferential > 0
                        ? "text-emerald-400"
                        : team.runDifferential < 0
                        ? "text-rose-400"
                        : "text-slate-400"
                    }`}
                  >
                    {team.runDifferential > 0
                      ? `+${team.runDifferential}`
                      : team.runDifferential}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300">
                    {team.homeRecord}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300">
                    {team.awayRecord}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        team.streak.startsWith("G")
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                          : "bg-rose-950/80 text-rose-400 border border-rose-800/40"
                      }`}
                    >
                      {team.streak}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300">
                    {team.last10}
                  </td>
                  {showPythagorean && (
                    <>
                      <td className="py-3 px-3 text-center text-sky-400 font-semibold">
                        {team.pythagoreanPct.toFixed(3).replace(/^0+/, "")}
                      </td>
                      <td className="py-3 px-3 text-center text-sky-300">
                        {team.expectedWins}-{team.expectedLosses}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
