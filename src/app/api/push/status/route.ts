import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabase) {
    return NextResponse.json({
      supabaseConfigured: false,
      ready: false,
      tableExists: false,
      error: 'Supabase no está inicializado.',
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
    } else {
      tableError = pErr.message;
    }
  } catch (err: unknown) {
    tableError = err instanceof Error ? err.message : 'Error al verificar conexión';
  }

  let sqlMigration = '';
  try {
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20261021_create_push_subscriptions.sql');
    if (fs.existsSync(sqlPath)) {
      sqlMigration = fs.readFileSync(sqlPath, 'utf-8');
    }
  } catch {}

  return NextResponse.json({
    supabaseConfigured: true,
    ready: tableExists,
    tableExists,
    tableError,
    sqlMigration,
  });
}
