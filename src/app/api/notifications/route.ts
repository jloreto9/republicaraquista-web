import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/types/push-notifications';

export const dynamic = 'force-dynamic';

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Hace momentos';
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} dÃ­as`;
    return date.toLocaleDateString('es-VE', { month: 'short', day: 'numeric' });
  } catch {
    return 'Reciente';
  }
}

export async function GET() {
  const notifications: AppNotification[] = [];

  try {
    // 1. Obtener juego mÃ¡s reciente o en vivo de Leones del Caracas desde MLB Stats API
    try {
      const scheduleRes = await fetch(
        'https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=2026',
        {
          signal: AbortSignal.timeout(6000),
          next: { revalidate: 30 },
        }
      );

      if (scheduleRes.ok) {
        const schedJson = await scheduleRes.json();
        const caracasGames: Array<{
          date: string;
          gamePk: number;
          status: string;
          isLive: boolean;
          homeName: string;
          awayName: string;
          homeScore?: number;
          awayScore?: number;
          isHome: boolean;
        }> = [];

        for (const d of schedJson.dates || []) {
          for (const g of d.games || []) {
            const hId = g.teams?.home?.team?.id;
            const aId = g.teams?.away?.team?.id;
            if (hId === 695 || aId === 695) {
              const detailed = g.status?.detailedState || '';
              const isLive = ['In Progress', 'Live'].includes(detailed) || g.status?.codedGameState === 'I';
              const isFinished = ['Final', 'Game Over', 'Completed Early'].includes(detailed);

              if (isLive || isFinished) {
                caracasGames.push({
                  date: d.date,
                  gamePk: g.gamePk,
                  status: detailed,
                  isLive,
                  homeName: g.teams.home.team.name,
                  awayName: g.teams.away.team.name,
                  homeScore: g.teams.home.score,
                  awayScore: g.teams.away.score,
                  isHome: hId === 695,
                });
              }
            }
          }
        }

        // Tomar el juego mÃ¡s relevante (el en vivo si hay, o el Ãºltimo jugado)
        const activeGame = caracasGames.find((g) => g.isLive) || caracasGames[caracasGames.length - 1];

        if (activeGame) {
          const oppName = activeGame.isHome ? activeGame.awayName : activeGame.homeName;
          const carScore = activeGame.isHome ? activeGame.homeScore ?? 0 : activeGame.awayScore ?? 0;
          const oppScore = activeGame.isHome ? activeGame.awayScore ?? 0 : activeGame.homeScore ?? 0;
          const won = carScore > oppScore;

          if (activeGame.isLive) {
            notifications.push({
              id: `game-${activeGame.gamePk}-live`,
              category: 'game',
              badge: 'EN VIVO',
              badgeColor: 'emerald',
              title: `ðŸ”´ EN VIVO â€¢ Leones ${carScore} - ${oppScore} ${oppName}`,
              description: `Partido en desarrollo. Sigue el diamante interactivo, conteo de pitcheos y jugada a jugada oficial en tiempo real.`,
              timestamp: activeGame.date,
              relativeTime: 'Ahora',
              actionUrl: `/game-center?gamePk=${activeGame.gamePk}`,
              actionLabel: 'Ver Game Center',
              unread: true,
            });
          } else {
            notifications.push({
              id: `game-${activeGame.gamePk}-final`,
              category: 'game',
              badge: won ? 'VICTORIA' : 'FINAL',
              badgeColor: won ? 'gold' : 'slate',
              title: `Pizarra Final: Leones ${carScore} - ${oppScore} ${oppName}`,
              description: `Encuentro finalizado (${activeGame.date}). Consulta el boxscore oficial, lÃ­neas de bateo y actuaciones del cuerpo de relevistas.`,
              timestamp: activeGame.date,
              relativeTime: formatRelativeTime(activeGame.date),
              actionUrl: `/game-center?gamePk=${activeGame.gamePk}`,
              actionLabel: 'Ver Boxscore',
              unread: false,
            });
          }
        }
      }
    } catch (schedErr) {
      console.warn('No se pudo cargar juego para notificaciones:', schedErr);
    }

    // 2. Obtener Ãºltimas crÃ³nicas de NotiCueva desde Supabase
    if (supabase) {
      try {
        const { data: posts } = await supabase
          .from('noticueva_posts')
          .select('id, title, slug, content, author, created_at')
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(3);

        if (posts && posts.length > 0) {
          posts.forEach((p) => {
            const snippet = p.content
              ? p.content.replace(/<[^>]+>/g, '').slice(0, 120) + '...'
              : 'Nueva crÃ³nica de opiniÃ³n y anÃ¡lisis disponible en La Cueva.';

            notifications.push({
              id: `post-${p.id}`,
              category: 'news',
              badge: 'NOTICUEVA',
              badgeColor: 'blue',
              title: p.title || 'Nueva crÃ³nica en NotiCueva',
              description: `${snippet} (Por ${p.author || 'Gilberto MÃ©ndez'})`,
              timestamp: p.created_at,
              relativeTime: formatRelativeTime(p.created_at),
              actionUrl: `/noticueva`,
              actionLabel: 'Leer CrÃ³nica',
              unread: false,
            });
          });
        }
      } catch (postErr) {
        console.warn('No se pudieron cargar posts de NotiCueva para notificaciones:', postErr);
      }
    }

    // 3. NotificaciÃ³n permanente de Roster Oficial de la Semana
    notifications.push({
      id: 'roster-weekly-active',
      category: 'roster',
      badge: 'ROSTER OFICIAL',
      badgeColor: 'gold',
      title: 'NÃ³mina Semanal de 34 Activos Confirmada',
      description: 'Consulta los 34 jugadores autorizados por la LVBP, lanzadores abridores, cuerpo de relevistas y coaching staff de JosÃ© Alguacil.',
      timestamp: new Date().toISOString(),
      relativeTime: 'Semana Activa',
      actionUrl: '/roster',
      actionLabel: 'Ver Roster',
      unread: false,
    });

    // 4. NotificaciÃ³n del Circuito Radial La Mega 107.3 FM
    notifications.push({
      id: 'radio-circuit-active',
      category: 'radio',
      badge: 'CIRCUITO RADIAL',
      badgeColor: 'blue',
      title: 'TransmisiÃ³n Oficial en Vivo â€¢ La Mega 107.3 FM',
      description: 'Sintoniza la seÃ±al radial de UniÃ³n Radio y RepÃºblica Caraquista directamente desde el reproductor flotante sin interrumpir tu navegaciÃ³n.',
      timestamp: new Date().toISOString(),
      relativeTime: '24/7',
      actionUrl: '/game-center',
      actionLabel: 'Sintonizar SeÃ±al',
      unread: false,
    });

    return NextResponse.json(
      {
        success: true,
        notifications,
        count: notifications.length,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error('Error generando notificaciones de la app:', error);
    return NextResponse.json(
      {
        success: false,
        notifications: [],
        error: error instanceof Error ? error.message : 'Error al obtener notificaciones',
      },
      { status: 500 }
    );
  }
}
