import { NextRequest, NextResponse } from 'next/server';
import { deleteSubscription, saveSubscription, sendTestPush } from '@/lib/push-service';
import type { PushSubscriptionPayload } from '@/types/push-notifications';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, keys, topics, userAgent, sendTest } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Faltan parámetros de suscripción (endpoint, keys.p256dh, keys.auth)' },
        { status: 400 }
      );
    }

    const payload: PushSubscriptionPayload = {
      endpoint,
      keys,
      topics,
      userAgent: userAgent || req.headers.get('user-agent') || undefined,
    };

    const saveResult = await saveSubscription(payload);

    if (!saveResult.success) {
      return NextResponse.json({ error: saveResult.error }, { status: 500 });
    }

    let testSent = false;
    if (sendTest) {
      const testResult = await sendTestPush(payload);
      testSent = testResult.success;
    }

    return NextResponse.json({
      success: true,
      testSent,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint no especificado' }, { status: 400 });
    }

    const result = await deleteSubscription(endpoint);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
