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
  }, [isOpen, onSubscriptionChange]);

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
      setStatusMessage({ text: 'Notificaciones y preferencias actualizadas correctamente.', type: 'success' });
    } else {
      setStatusMessage({ text: result.error || 'Error al guardar.', type: 'error' });
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
      setStatusMessage({ text: 'Notificaciones desactivadas.', type: 'info' });
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
      setStatusMessage({ text: 'Notificación de prueba enviada a este dispositivo.', type: 'success' });
    } else {
      setStatusMessage({ text: result.error || 'Fallo al enviar prueba.', type: 'error' });
    }
  };

  const needsIosInstall = isIos && !isStandalone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-[#0D152B] shadow-2xl text-slate-100">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDB827]/10 text-[#FDB827]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Notificaciones</h2>
              <p className="text-xs text-slate-400">Alertas de juegos, noticias y movimientos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Alerta de soporte */}
          {!supported && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>Tu navegador actual no admite notificaciones push nativas. Te sugerimos utilizar Chrome, Edge o Safari actualizado.</span>
            </div>
          )}

          {/* Guía para iOS */}
          {needsIosInstall && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
              <Share2 className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-300">Requisito en iPhone / iPad</p>
                <p className="text-slate-300">
                  En iOS, Apple requiere que la aplicación esté instalada en la pantalla de inicio para recibir notificaciones:
                </p>
                <ol className="list-decimal pl-4 space-y-0.5 text-slate-400 pt-1">
                  <li>Toca el botón <strong>Compartir</strong> en Safari.</li>
                  <li>Selecciona <strong>&quot;Agregar a pantalla de inicio&quot;</strong>.</li>
                  <li>Abre la app desde tu pantalla de inicio y activa aquí las notificaciones.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Permiso bloqueado */}
          {permission === 'denied' && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">Permisos bloqueados en el navegador</p>
                <p className="text-slate-300">
                  Tienes las notificaciones bloqueadas para este sitio. Habilítalas en los ajustes del navegador o en el icono de candado de la barra de direcciones.
                </p>
              </div>
            </div>
          )}

          {/* Estado de suscripción */}
          <div className="flex items-center justify-between rounded-xl bg-slate-900/60 border border-slate-800 p-4">
            <div>
              <span className="text-xs uppercase font-medium text-slate-400">Estado en este dispositivo</span>
              <p className="text-sm font-semibold text-white mt-0.5">
                {isSubscribed ? 'Notificaciones activas' : 'Notificaciones desactivadas'}
              </p>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                isSubscribed
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {isSubscribed ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          {/* Lista de Categorías */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Categorías de alertas
            </h3>

            {(['game_status', 'scoring_plays', 'extra_innings', 'news_roster'] as NotificationTopic[]).map((topic) => {
              const info = TOPIC_LABELS[topic];
              const isChecked = preferences[topic];

              return (
                <label
                  key={topic}
                  className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900/60 cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5 select-none pr-2">
                    <span className="text-sm font-medium text-slate-200">{info.title}</span>
                    <p className="text-xs text-slate-400 leading-relaxed">{info.description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleTopic(topic)}
                    className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800 text-[#FDB827] focus:ring-[#FDB827] focus:ring-offset-slate-900"
                  />
                </label>
              );
            })}
          </div>

          {/* Mensajes de retroalimentación */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : statusMessage.type === 'error'
                  ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {statusMessage.type === 'success' && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
              {statusMessage.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Pie de acción */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80 bg-slate-900/60 px-6 py-4">
          <div>
            {isSubscribed && (
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testing || loading}
                className="text-xs text-slate-400 hover:text-[#FDB827] underline underline-offset-4 disabled:opacity-50 transition-colors"
              >
                {testing ? 'Enviando prueba...' : 'Enviar prueba'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isSubscribed && (
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
              >
                Desactivar
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveOrSubscribe}
              disabled={loading || !supported || permission === 'denied'}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-[#FDB827] text-slate-950 hover:bg-[#FDB827]/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Procesando...</span>
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
