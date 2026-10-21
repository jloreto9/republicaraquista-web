'use client';

import React, { useState } from 'react';
import { Bell, Send, CheckCircle2, AlertCircle, Loader2, Smartphone } from 'lucide-react';
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
      // Limpiar campos si fue exitoso
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
    <div className="rounded-2xl border border-slate-800 bg-[#0D152B] p-6 shadow-xl space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDB827]/10 text-[#FDB827]">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Envío de Notificaciones Web Push
            </h3>
            <p className="text-xs text-slate-400">
              Despacho manual de alertas a dispositivos con la PWA instalada o suscrita
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulario de Redacción */}
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
                else if (newTopic === 'game_status' || newTopic === 'scoring_plays' || newTopic === 'extra_innings') {
                  setUrl('/game-center');
                }
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-200 focus:border-[#FDB827] focus:outline-none"
            >
              {(['news_roster', 'game_status', 'scoring_plays', 'extra_innings'] as NotificationTopic[]).map((t) => (
                <option key={t} value={t} className="bg-slate-900 text-slate-200">
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
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-[#FDB827] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Mensaje descriptivo
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ej: Conoce las altas, bajas y la rotación abridora de los Leones del Caracas para esta semana."
              rows={3}
              maxLength={180}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-[#FDB827] focus:outline-none resize-none"
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
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-200 font-mono placeholder-slate-500 focus:border-[#FDB827] focus:outline-none"
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
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-[#FDB827] focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !title.trim() || !body.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FDB827] text-slate-950 text-xs font-semibold hover:bg-[#FDB827]/90 disabled:opacity-50 transition-colors shadow-sm"
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

        {/* Vista Previa en Pantalla de Bloqueo */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Smartphone className="h-4 w-4 text-[#FDB827]" />
            <span>Vista previa en dispositivo</span>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-inner space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-800/50 pb-2">
              <span className="font-semibold text-slate-400">República Caraquista</span>
              <span>Ahora</span>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#070B19] border border-[#FDB827]/40 flex items-center justify-center text-[#FDB827] text-xs font-bold shrink-0">
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

          {/* Resultado de Envío */}
          {result && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1.5 text-xs text-emerald-200">
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
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
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-2 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
