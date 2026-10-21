import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/push-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    return NextResponse.json(
      { error: 'Clave pública VAPID no configurada en el servidor' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    publicKey,
  });
}
