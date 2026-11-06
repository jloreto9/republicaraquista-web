import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { NOTICUEVA_ADMIN_PASSWORD } from '@/lib/noticueva-service';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader =
    request.headers.get('x-admin-key') ||
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    '';
  const isAdmin = Boolean(
    NOTICUEVA_ADMIN_PASSWORD && authHeader.trim() === NOTICUEVA_ADMIN_PASSWORD
  );

  if (!supabase) {
    return NextResponse.json({
      supabaseConfigured: false,
      ready: false,
      tableExists: false,
      error: isAdmin ? 'Supabase no está inicializado.' : undefined,
    });
  }

  let tableExists = false;
  let tableError: string | null = null;

  try {
    const { error: pErr } = await supabase
      .from('push_subscriptions')
      .select('id')
      .limit(1);

    if (!pErr) {
      tableExists = true;
    } else if (isAdmin) {
      tableError = pErr.message;
    }
  } catch (err: unknown) {
    if (isAdmin) {
      tableError = err instanceof Error ? err.message : 'Error al verificar conexión';
    }
  }

  let sqlMigration = '';
  if (isAdmin) {
    try {
      const sqlPath = path.join(
        process.cwd(),
        'supabase',
        'migrations',
        '20261021_create_push_subscriptions.sql'
      );
      if (fs.existsSync(sqlPath)) {
        sqlMigration = fs.readFileSync(sqlPath, 'utf-8');
      }
    } catch {}
  }

  return NextResponse.json({
    supabaseConfigured: true,
    ready: tableExists,
    tableExists,
    tableError,
    sqlMigration,
  });
}
