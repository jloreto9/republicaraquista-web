import { NextRequest, NextResponse } from 'next/server';
import { sendPushToTopic } from '@/lib/push-service';
import type { NotificationTopic, PushPayload } from '@/types/push-notifications';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest, bodyPassword?: string): boolean {
  const adminPassword = process.env.NOTICUEVA_ADMIN_PASSWORD;
  const cronSecret = process.env.CRON_SECRET;

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const xAdminKey = req.headers.get('x-admin-key') || '';

  if (cronSecret && token === cronSecret) return true;
  if (adminPassword && (token === adminPassword || xAdminKey === adminPassword || bodyPassword === adminPassword)) {
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, title, body: messageBody, url, icon, badge, tag, password } = body;

    if (!isAuthorized(req, password)) {
      return NextResponse.json({ error: 'No autorizado para enviar notificaciones' }, { status: 401 });
    }

    if (!title || !messageBody) {
      return NextResponse.json({ error: 'Título y mensaje son obligatorios' }, { status: 400 });
    }

    const validTopics: NotificationTopic[] = ['game_status', 'scoring_plays', 'extra_innings', 'news_roster'];
    const selectedTopic: NotificationTopic = validTopics.includes(topic) ? topic : 'news_roster';

    const payload: PushPayload = {
      title,
      body: messageBody,
      url: url || '/game-center',
      icon: icon || '/icon-512.png',
      badge: badge || '/favicon.ico',
      topic: selectedTopic,
      tag: tag || `caraquista-${selectedTopic}-${Date.now()}`,
    };

    const result = await sendPushToTopic(payload);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno al despachar notificación';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
