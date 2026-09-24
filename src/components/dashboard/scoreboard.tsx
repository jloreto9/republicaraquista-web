import Image from "next/image";
import { GameSummary } from "@/types/sports";
import { Calendar } from "lucide-react";

interface ScoreboardProps {
  games: GameSummary[];
}

export function Scoreboard({ games }: ScoreboardProps) {
  if (!games || games.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-slate-400 text-xs">
        No hay partidos recientes registrados para esta temporada.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#FDB827]" />
          Últimos Encuentros
        </h2>
        <span className="text-[11px] text-slate-400 font-mono">
          LVBP Temporada Oficial
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {games.map((game) => {
          const homeWon = game.homeScore > game.awayScore;
          const awayWon = game.awayScore > game.homeScore;

          return (
            <div
              key={game.id}
              className="p-3.5 rounded-xl bg-[#0D152B] border border-[#1E2B4D] hover:border-[#FDB827]/30 transition-all flex flex-col justify-between"
            >
              {/* Header: Fecha y Estado */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 pb-2 border-b border-[#1E2B4D]/60 font-mono">
                <span>{game.gameDate}</span>
                <span className="px-2 py-0.5 rounded bg-[#131E3D] text-slate-300 font-semibold text-[10px]">
                  {game.status}
                </span>
              </div>

              {/* Equipos y Marcador */}
              <div className="space-y-2">
                {/* Visitante */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 relative shrink-0">
                      <Image
                        src={game.awayTeamLogo}
                        alt={game.awayTeamName}
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        awayWon ? "text-slate-100 font-bold" : "text-slate-400"
                      }`}
                    >
                      {game.awayTeamName}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-mono font-bold ${
                      awayWon ? "text-[#FDB827]" : "text-slate-400"
                    }`}
                  >
                    {game.awayScore}
                  </span>
                </div>

                {/* Local */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 relative shrink-0">
                      <Image
                        src={game.homeTeamLogo}
                        alt={game.homeTeamName}
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        homeWon ? "text-slate-100 font-bold" : "text-slate-400"
                      }`}
                    >
                      {game.homeTeamName}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-mono font-bold ${
                      homeWon ? "text-[#FDB827]" : "text-slate-400"
                    }`}
                  >
                    {game.homeScore}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
