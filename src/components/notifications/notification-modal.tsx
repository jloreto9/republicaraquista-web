'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Check, Loader2, Share2, X, AlertCircle } from 'lucide-react';
import {
  DEFAULT_PREFERENCES,
  getCurrentSubscription,
  getNotificationPermission,
  getStoredPreferences,
  isIosDevice,
  isPushNotificationSupported,
  isStandalonePwa,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-client';
import { TOPIC_LABELS, type NotificationTopic, type UserNotificationPreferences } from '@/types/push-notifications';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionChange?: (isSubscribed: boolean) => void;
}

export function NotificationModal({ isOpen, onClose, onSubscriptionChange }: NotificationModalProps) {
  const [supported, setSupported] = useState<boolean>(true);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<UserNotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const isSupp = isPushNotificationSupported();
    setSupported(isSupp);
    setIsIos(isIosDevice());
    setIsStandalone(isStandalonePwa());
    setPermission(getNotificationPermission());
    setPreferences(getStoredPreferences());

    if (isSupp) {
      getCurrentSubscription().then((sub) => {
        const active = Boolean(sub);
        setIsSubscribed(active);
        onSubscriptionChange?.(active);
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSubscriptionChange]);

  if (!isOpen) return null;

  const handleToggleTopic = (topic: NotificationTopic) => {
    setPreferences((prev) => ({
      ...prev,
      [topic]: !prev[topic],
    }));
  };

  const handleSaveOrSubscribe = async () => {
    setLoading(true);
    setStatusMessage(null);

    const result = await subscribeToPush(preferences, false);
    setLoading(false);

    if (result.success) {
      setIsSubscribed(true);
      setPermission('granted');
      onSubscriptionChange?.(true);
      setStatusMessage({ text: 'Preferencias actualizadas con éxito.', type: 'success' });
    } else {
      setStatusMessage({ text: result.error || 'No se pudieron activar las notificaciones.', type: 'error' });
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setStatusMessage(null);

    const result = await unsubscribeFromPush();
    setLoading(false);

    if (result.success) {
      setIsSubscribed(false);
      onSubscriptionChange?.(false);
      setStatusMessage({ text: 'Notificaciones desactivadas en este dispositivo.', type: 'info' });
    } else {
      setStatusMessage({ text: result.error || 'Error al desactivar.', type: 'error' });
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    setStatusMessage(null);

    const result = await subscribeToPush(preferences, true);
    setTesting(false);

    if (result.success) {
      setStatusMessage({ text: 'Notificación de prueba enviada al dispositivo.', type: 'success' });
    } else {
      setStatusMessage({ text: result.error || 'Error al enviar la prueba.', type: 'error' });
    }
  };

  const needsIosInstall = isIos && !isStandalone;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de ambientación caraquista */}
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-[#FDB827]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Encabezado fijo */}
        <div className="flex items-center justify-between border-b border-[#1E2B4D] px-5 py-3.5 bg-[#070B19]/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/30">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>Notificaciones</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    isSubscribed
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isSubscribed ? 'Activas' : 'Inactivas'}
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#131E3D] transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {/* Mensaje si navegador no soporta */}
          {!supported && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>Tu navegador no admite notificaciones push nativas. Usa Chrome, Edge o Safari actualizado.</span>
            </div>
          )}

          {/* Guía iOS */}
          {needsIosInstall && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#FDB827]/40 bg-[#FDB827]/10 p-3.5 text-xs text-slate-200">
              <Share2 className="h-4 w-4 shrink-0 text-[#FDB827] mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-[#FDB827]">Requisito en iPhone / iPad</p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Para recibir alertas en iOS, pulsa el botón <strong>Compartir</strong> en Safari y selecciona <strong>&quot;Agregar a pantalla de inicio&quot;</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Permiso bloqueado */}
          {permission === 'denied' && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>Las notificaciones están bloqueadas en tu navegador. Debes habilitarlas en el candado de la barra de direcciones.</span>
            </div>
          )}

          {/* Lista de Categorías */}
          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Selecciona qué alertas recibir
            </p>

            {(['game_status', 'news_roster', 'scoring_plays', 'extra_innings'] as NotificationTopic[]).map((topic) => {
              const info = TOPIC_LABELS[topic];
              const isChecked = preferences[topic];

              return (
                <label
                  key={topic}
                  className={`flex items-start justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'border-[#FDB827]/40 bg-[#131E3D]/60'
                      : 'border-[#1E2B4D] bg-[#070B19]/50 hover:bg-[#131E3D]/30'
                  }`}
                >
                  <div className="space-y-0.5 select-none pr-1">
                    <span className="text-xs font-bold text-slate-100">{info.title}</span>
                    <p className="text-[11px] text-slate-400 leading-snug">{info.description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleTopic(topic)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-[#070B19] text-[#FDB827] focus:ring-[#FDB827] focus:ring-offset-[#0D152B] cursor-pointer"
                  />
                </label>
              );
            })}
          </div>

          {/* Mensajes de resultado */}
          {statusMessage && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/60 text-rose-300 border border-rose-700/50'
                  : 'bg-slate-900 text-slate-300 border border-slate-700'
              }`}
            >
              {statusMessage.type === 'success' && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
              {statusMessage.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Pie de acción fijo */}
        <div className="flex items-center justify-between border-t border-[#1E2B4D] bg-[#070B19]/80 px-5 py-3 shrink-0">
          <div>
            {isSubscribed && (
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testing || loading}
                className="text-xs text-slate-400 hover:text-[#FDB827] underline underline-offset-4 disabled:opacity-50 transition-colors font-mono"
              >
                {testing ? 'Enviando...' : 'Enviar prueba'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSubscribed && (
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={loading}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors font-mono"
              >
                Desactivar
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveOrSubscribe}
              disabled={loading || !supported || permission === 'denied'}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#FDB827] text-[#070B19] hover:bg-[#FDB827]/90 disabled:opacity-50 transition-all shadow-md font-mono"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : isSubscribed ? (
                <span>Guardar cambios</span>
              ) : (
                <span>Activar notificaciones</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
