import type {
  NotificationTopic,
  PushSubscriptionPayload,
  UserNotificationPreferences,
} from '@/types/push-notifications';

const PREFS_STORAGE_KEY = 'republica_push_preferences_v1';

export const DEFAULT_PREFERENCES: UserNotificationPreferences = {
  game_status: true,
  scoring_plays: true,
  extra_innings: true,
  news_roster: true,
};

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isNavStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(isStandalone || isNavStandalone);
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
  return Notification.permission;
}

export function getStoredPreferences(): UserNotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveStoredPreferences(prefs: UserNotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.warn('No se pudo guardar preferencias push locales:', err);
  }
}

export function preferencesToTopics(prefs: UserNotificationPreferences): NotificationTopic[] {
  const topics: NotificationTopic[] = [];
  if (prefs.game_status) topics.push('game_status');
  if (prefs.scoring_plays) topics.push('scoring_plays');
  if (prefs.extra_innings) topics.push('extra_innings');
  if (prefs.news_roster) topics.push('news_roster');
  return topics;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn('Error al consultar suscripción push:', err);
    return null;
  }
}

export async function subscribeToPush(
  preferences: UserNotificationPreferences = DEFAULT_PREFERENCES,
  sendTest = false
): Promise<{ success: boolean; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Este navegador no admite notificaciones push.' };
  }

  try {
    // 1. Solicitar permiso al usuario
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permiso de notificaciones denegado por el usuario.' };
    }

    // 2. Obtener clave pública VAPID
    const keyRes = await fetch('/api/push/public-key');
    if (!keyRes.ok) {
      throw new Error('No se pudo obtener la clave pública del servidor.');
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      throw new Error('Clave pública VAPID vacía.');
    }

    // 3. Suscribir en el Service Worker
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      throw new Error('Suscripción generada con claves incompletas.');
    }

    const topics = preferencesToTopics(preferences);

    const payload: PushSubscriptionPayload = {
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
      topics,
      userAgent: navigator.userAgent,
    };

    // 4. Enviar a Supabase mediante la API
    const saveRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, sendTest }),
    });

    if (!saveRes.ok) {
      const errData = await saveRes.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al registrar suscripción en la base de datos.');
    }

    saveStoredPreferences(preferences);
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al activar notificaciones';
    return { success: false, error: errorMsg };
  }
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  try {
    const subscription = await getCurrentSubscription();
    if (subscription) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch((e) => console.warn('Error al borrar en backend:', e));

      await subscription.unsubscribe();
    }
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al desactivar';
    return { success: false, error: errorMsg };
  }
}
