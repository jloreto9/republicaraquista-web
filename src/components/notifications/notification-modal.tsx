'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Bell,
  Check,
  Loader2,
  Share2,
  X,
  AlertCircle,
  Trophy,
  Newspaper,
  Users,
  Radio,
  ExternalLink,
  Settings2,
  ListFilter,
} from 'lucide-react';
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
import {
  TOPIC_LABELS,
  type NotificationTopic,
  type UserNotificationPreferences,
  type AppNotification,
} from '@/types/push-notifications';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionChange?: (isSubscribed: boolean) => void;
}

export function NotificationModal({ isOpen, onClose, onSubscriptionChange }: NotificationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'settings'>('feed');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // Estados de Push
  const [supported, setSupported] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<UserNotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cargar notificaciones reales de la app
  const loadNotificationsFeed = useCallback(async () => {
    setLoadingFeed(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.notifications)) {
          setNotifications(json.notifications);
        }
      }
    } catch (err) {
      console.warn('Error al cargar feed de notificaciones:', err);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    loadNotificationsFeed();

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
  }, [isOpen, onClose, onSubscriptionChange, loadNotificationsFeed]);

  if (!mounted || !isOpen) return null;

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

  const getCategoryIcon = (category: AppNotification['category']) => {
    switch (category) {
      case 'game':
        return <Trophy className="h-4 w-4 text-[#FDB827]" />;
      case 'news':
        return <Newspaper className="h-4 w-4 text-sky-400" />;
      case 'roster':
        return <Users className="h-4 w-4 text-emerald-400" />;
      case 'radio':
        return <Radio className="h-4 w-4 text-amber-400" />;
      default:
        return <Bell className="h-4 w-4 text-slate-300" />;
    }
  };

  const getBadgeClasses = (color: AppNotification['badgeColor']) => {
    switch (color) {
      case 'gold':
        return 'bg-[#FDB827]/15 text-[#FDB827] border-[#FDB827]/30';
      case 'emerald':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'crimson':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'blue':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-lg max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-[#0D152B] border-t sm:border border-[#1E2B4D] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-150 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Manija táctil en móvil */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[#070B19]/70 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Encabezado Principal */}
        <div className="flex items-center justify-between border-b border-[#1E2B4D] px-5 py-3.5 bg-[#070B19]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/30">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>Notificaciones de la App</span>
                {notifications.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/40 font-bold">
                    {notifications.length}
                  </span>
                )}
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

        {/* Pestañas de Navegación del Modal */}
        <div className="flex items-center border-b border-[#1E2B4D] bg-[#070B19]/50 px-5 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all font-sans ${
              activeTab === 'feed'
                ? 'border-[#FDB827] text-[#FDB827] bg-[#0D152B]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#131E3D]/30'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>Alertas y Novedades</span>
            {notifications.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#1E2B4D] text-slate-200">
                {notifications.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all font-sans ${
              activeTab === 'settings'
                ? 'border-[#FDB827] text-[#FDB827] bg-[#0D152B]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#131E3D]/30'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Alertas Push (Móvil / PC)</span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                isSubscribed
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {isSubscribed ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {/* ── PESTAÑA 1: FEED DE NOTIFICACIONES ── */}
          {activeTab === 'feed' && (
            <div className="space-y-3">
              {loadingFeed ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-3 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-[#FDB827]" />
                  <p className="text-xs font-mono">Cargando notificaciones oficiales...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                  <div className="p-3 rounded-2xl bg-[#070B19] border border-[#1E2B4D] text-[#FDB827]">
                    <Bell className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-200">No hay alertas en este momento</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    Las novedades de partidos en vivo, resultados y artículos de NotiCueva aparecerán aquí automáticamente.
                  </p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[#070B19]/80 border border-[#1E2B4D] hover:border-[#FDB827]/40 transition-all space-y-2 group shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[#0D152B] border border-[#1E2B4D]">
                          {getCategoryIcon(item.category)}
                        </div>
                        <span
                          className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-md border ${getBadgeClasses(
                            item.badgeColor
                          )}`}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.relativeTime}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-slate-100 group-hover:text-[#FDB827] transition-colors leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-1 flex items-center justify-end">
                      <Link
                        href={item.actionUrl}
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E2B4D]/60 hover:bg-[#FDB827] text-slate-200 hover:text-[#070B19] text-[11px] font-bold font-mono transition-all border border-[#1E2B4D]"
                      >
                        <span>{item.actionLabel}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── PESTAÑA 2: CONFIGURACIÓN PUSH ── */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              {!supported && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>Tu navegador no admite notificaciones push nativas. Usa Chrome, Edge o Safari actualizado.</span>
                </div>
              )}

              {needsIosInstall && (
                <div className="flex items-start gap-2.5 rounded-xl border border-[#FDB827]/40 bg-[#FDB827]/10 p-3.5 text-xs text-slate-200">
                  <Share2 className="h-4 w-4 shrink-0 text-[#FDB827] mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-[#FDB827]">Requisito en iPhone / iPad</p>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Para recibir alertas en iOS, pulsa <strong>Compartir</strong> en Safari y selecciona <strong>&quot;Agregar a pantalla de inicio&quot;</strong>.
                    </p>
                  </div>
                </div>
              )}

              {permission === 'denied' && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>Las notificaciones están bloqueadas en tu navegador. Debes habilitarlas en el candado de la barra de direcciones.</span>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Selecciona qué alertas recibir en tu dispositivo
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
          )}
        </div>

        {/* Pie de acción (Contextual por pestaña) */}
        <div className="flex items-center justify-between border-t border-[#1E2B4D] bg-[#070B19]/80 px-5 py-3 shrink-0">
          {activeTab === 'feed' ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-mono text-slate-400">
                Se actualiza automáticamente
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#FDB827] hover:bg-[#FDB827]/10 rounded-xl transition-colors font-mono font-bold"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>Configurar Alertas Push</span>
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
