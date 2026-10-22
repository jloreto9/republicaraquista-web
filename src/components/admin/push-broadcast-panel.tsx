'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { TOPIC_LABELS, type NotificationTopic, type PushSendResult } from '@/types/push-notifications';

interface PushBroadcastPanelProps {
  adminPassword?: string;
}

export function PushBroadcastPanel({ adminPassword = '' }: PushBroadcastPanelProps) {
  const [topic, setTopic] = useState<NotificationTopic>('news_roster');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/noticueva');
  const [password, setPassword] = useState(adminPassword);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<PushSendResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado de la tabla en Supabase
  const [dbStatus, setDbStatus] = useState<{
    loading: boolean;
    ready: boolean;
    tableExists: boolean;
    sqlMigration: string;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSql, setShowSql] = useState(false);

  const checkDb = async () => {
    try {
      setDbStatus((prev) => (prev ? { ...prev, loading: true } : { loading: true, ready: false, tableExists: false, sqlMigration: '' }));
      const res = await fetch('/api/push/status');
      const data = await res.json();
      setDbStatus({
        loading: false,
        ready: Boolean(data.ready),
        tableExists: Boolean(data.tableExists),
        sqlMigration: data.sqlMigration || '',
      });
    } catch {
      setDbStatus((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };

  useEffect(() => {
    checkDb();
  }, []);

  const handleCopySql = () => {
    if (!dbStatus?.sqlMigration) return;
    navigator.clipboard.writeText(dbStatus.sqlMigration);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setErrorMsg('El título y el mensaje son obligatorios.');
      return;
    }

    setSending(true);
    setResult(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': password || adminPassword,
        },
        body: JSON.stringify({
          topic,
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || '/noticueva',
          password: password || adminPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al despachar la notificación.');
      }

      setResult(data as PushSendResult);
      if (data.success) {
        setTitle('');
        setBody('');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#1E2B4D] bg-[#0D152B] p-5 sm:p-6 shadow-xl space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/30">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Envío de Notificaciones Web Push
            </h3>
            <p className="text-xs text-slate-400">
              Despacho manual de alertas a dispositivos suscritos
            </p>
          </div>
        </div>

        {dbStatus && (
          <button
            type="button"
            onClick={checkDb}
            disabled={dbStatus.loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-xs font-mono text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${dbStatus.loading ? 'animate-spin' : ''}`} />
            <span>{dbStatus.ready ? 'Supabase OK' : 'Verificar DB'}</span>
          </button>
        )}
      </div>

      {/* Alerta si la tabla no existe en Supabase */}
      {dbStatus && !dbStatus.ready && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 shadow-md space-y-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">
                Acción requerida: Inicializar tabla push_subscriptions en Supabase
              </p>
              <p className="text-slate-300 mt-1 leading-relaxed">
                Para guardar las suscripciones de los fanáticos, la tabla <code>push_subscriptions</code> debe ser creada en tu proyecto de Supabase.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopySql}
              className="px-3.5 py-1.5 rounded-xl bg-[#FDB827] hover:bg-[#FDB827]/90 text-[#070B19] font-bold text-xs font-mono flex items-center space-x-1.5 transition-transform active:scale-95"
            >
              {copiedSql ? (
                <>
                  <Check className="w-4 h-4 text-[#070B19]" />
                  <span>¡Script SQL Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>1-Click: Copiar Script SQL</span>
                </>
              )}
            </button>

            <a
              href="https://supabase.com/dashboard/project/zkocgiozxtoifzujujqg/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-slate-200 text-xs font-mono flex items-center space-x-1.5 transition-all"
            >
              <span>Abrir SQL Editor en Supabase</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#FDB827]" />
            </a>

            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              className="px-3 py-1.5 text-xs text-amber-300 underline font-mono"
            >
              {showSql ? 'Ocultar SQL' : 'Ver SQL'}
            </button>
          </div>

          {showSql && dbStatus.sqlMigration && (
            <pre className="mt-2 p-3 rounded-xl bg-[#070B19] border border-amber-700/40 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto">
              {dbStatus.sqlMigration}
            </pre>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulario */}
        <form onSubmit={handleSend} className="lg:col-span-7 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Categoría
            </label>
            <select
              value={topic}
              onChange={(e) => {
                const newTopic = e.target.value as NotificationTopic;
                setTopic(newTopic);
                if (newTopic === 'news_roster') setUrl('/noticueva');
                else setUrl('/game-center');
              }}
              className="w-full rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3.5 py-2.5 text-xs text-slate-200 focus:border-[#FDB827] focus:outline-none"
            >
              {(['news_roster', 'game_status', 'scoring_plays', 'extra_innings'] as NotificationTopic[]).map((t) => (
                <option key={t} value={t} className="bg-[#0D152B] text-slate-200">
                  {TOPIC_LABELS[t].title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Roster de la Semana 3 publicado"
              maxLength={70}
              className="w-full rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-[#FDB827] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Mensaje descriptivo
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ej: Conoce las altas, bajas y la rotación abridora de los Leones del Caracas."
              rows={3}
              maxLength={180}
              className="w-full rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-[#FDB827] focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Ruta de destino al pulsar
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/noticueva o /game-center"
              className="w-full rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3.5 py-2.5 text-xs text-slate-200 font-mono placeholder-slate-500 focus:border-[#FDB827] focus:outline-none"
            />
          </div>

          {!adminPassword && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Clave de administración
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Clave de NotiCueva"
                className="w-full rounded-xl border border-[#1E2B4D] bg-[#070B19] px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-[#FDB827] focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !title.trim() || !body.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FDB827] text-[#070B19] text-xs font-bold hover:bg-[#FDB827]/90 disabled:opacity-50 transition-all shadow-md font-mono"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Despachando alerta...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Despachar notificación</span>
              </>
            )}
          </button>
        </form>

        {/* Vista Previa */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            <Smartphone className="h-4 w-4 text-[#FDB827]" />
            <span>Vista previa en dispositivo</span>
          </div>

          <div className="rounded-2xl border border-[#1E2B4D] bg-[#070B19] p-4 shadow-inner space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-[#1E2B4D] pb-2 font-mono">
              <span className="font-semibold text-slate-300">República Caraquista</span>
              <span>Ahora</span>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#0D152B] border border-[#FDB827]/40 flex items-center justify-center text-[#FDB827] text-xs font-bold shrink-0 font-mono">
                CAR
              </div>
              <div className="space-y-1 select-none pr-1">
                <p className="text-xs font-bold text-white leading-snug">
                  {title.trim() || 'Título de la notificación'}
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {body.trim() || 'Aquí se mostrará el cuerpo del mensaje que recibirán los suscriptores.'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono pt-1">
                  Destino: {url.trim() || '/'}
                </p>
              </div>
            </div>
          </div>

          {result && (
            <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/40 p-3.5 space-y-1 text-xs text-emerald-200">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Despacho completado</span>
              </div>
              <p className="text-slate-300">
                Dispositivos alcanzados: <strong>{result.sentCount}</strong>
              </p>
              {result.cleanedCount > 0 && (
                <p className="text-slate-400">
                  Suscripciones inactivas depuradas: {result.cleanedCount}
                </p>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-rose-700/50 bg-rose-950/40 p-3.5 flex items-start gap-2 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
