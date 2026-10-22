import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase';
import type {
  PushPayload,
  PushSendResult,
  PushSubscriptionPayload,
  PushSubscriptionRecord,
} from '@/types/push-notifications';

const DEFAULT_VAPID_PUBLIC_KEY = 'BOVrzoz9H0kQioJd9IfN6oL2Oh4NmBSzHD-yWOvQrHH4pmoKO_2YVmhpl-m0P9CTyy41UPzjnIjeC-fAZ59aLw0';
const DEFAULT_VAPID_PRIVATE_KEY = 'VfA2hwoqvHOWCKh3EjIqFh5_jKCsqPTokz86wMSc-Xk';

const vapidPublicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY).trim();
const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY).trim();
const vapidSubject = (process.env.VAPID_SUBJECT || 'mailto:contacto@republicaraquista.com').trim();

let vapidConfigured = false;

function ensureVapidConfig(): boolean {
  if (vapidConfigured) return true;
  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    vapidConfigured = true;
    return true;
  }
  return false;
}

export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

/**
 * Guarda o actualiza una suscripción Push en Supabase
 * Utiliza estrategia resiliente de inserción con fallback a actualización
 * para evitar bloqueos de RLS con cláusulas ON CONFLICT de PostgREST.
 */
export async function saveSubscription(payload: PushSubscriptionPayload): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Supabase no está configurado en el servidor' };
  }

  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
    return { success: false, error: 'Datos de suscripción incompletos' };
  }

  const topics = payload.topics && payload.topics.length > 0 
    ? payload.topics 
    : ['game_status', 'news_roster'];

  const record = {
    endpoint: payload.endpoint,
    p256dh: payload.keys.p256dh,
    auth: payload.keys.auth,
    user_agent: payload.userAgent || null,
    topics,
    updated_at: new Date().toISOString(),
  };

  // 1. Intentar inserción directa
  const { error: insertError } = await supabaseAdmin
    .from('push_subscriptions')
    .insert(record);

  if (!insertError) {
    return { success: true };
  }

  // 2. Si el endpoint ya existe (conflicto de clave única 23505), actualizar el registro
  if (
    insertError.code === '23505' ||
    insertError.message?.includes('duplicate key') ||
    insertError.message?.includes('already exists')
  ) {
    const { error: updateError } = await supabaseAdmin
      .from('push_subscriptions')
      .update({
        p256dh: record.p256dh,
        auth: record.auth,
        topics: record.topics,
        user_agent: record.user_agent,
        updated_at: record.updated_at,
      })
      .eq('endpoint', payload.endpoint);

    if (!updateError) {
      return { success: true };
    }

    console.error('Error al actualizar suscripción existente en Supabase:', updateError);
    return { success: false, error: updateError.message };
  }

  if (insertError.code === 'PGRST205' || insertError.message?.includes('Could not find the table')) {
    return {
      success: false,
      error: 'La tabla push_subscriptions no existe en Supabase.',
    };
  }

  console.error('Error al guardar suscripción push en Supabase:', insertError);
  return { success: false, error: insertError.message };
}

/**
 * Elimina una suscripción de Supabase
 */
export async function deleteSubscription(endpoint: string): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Supabase no está configurado' };
  }

  const { error } = await supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Despacha una notificación Web Push a todos los suscriptores activos del tópico
 */
export async function sendPushToTopic(payload: PushPayload): Promise<PushSendResult> {
  if (!ensureVapidConfig()) {
    return {
      success: false,
      sentCount: 0,
      failureCount: 0,
      cleanedCount: 0,
      errors: ['Claves VAPID no configuradas en el entorno del servidor'],
    };
  }

  if (!supabaseAdmin) {
    return {
      success: false,
      sentCount: 0,
      failureCount: 0,
      cleanedCount: 0,
      errors: ['Supabase no está disponible'],
    };
  }

  // Consultar suscripciones que tengan activo el tópico seleccionado
  const { data, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .contains('topics', [payload.topic]);

  if (error) {
    console.error('Error al consultar suscripciones por tópico:', error);
    return {
      success: false,
      sentCount: 0,
      failureCount: 0,
      cleanedCount: 0,
      errors: [error.message],
    };
  }

  const subscriptions = (data || []) as PushSubscriptionRecord[];

  if (subscriptions.length === 0) {
    return {
      success: true,
      sentCount: 0,
      failureCount: 0,
      cleanedCount: 0,
    };
  }

  const jsonPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icon-512.png',
    badge: payload.badge || '/favicon.ico',
    url: payload.url || '/game-center',
    tag: payload.tag || `caraquista-${payload.topic}-${Date.now()}`,
    topic: payload.topic,
  });

  const expiredEndpoints: string[] = [];
  const errors: string[] = [];
  let sentCount = 0;
  let failureCount = 0;

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      return webpush.sendNotification(pushConfig, jsonPayload, {
        TTL: 86400,
        urgency: 'high',
      });
    })
  );

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      sentCount++;
    } else {
      failureCount++;
      const reason = result.reason as { statusCode?: number; message?: string };
      if (reason && (reason.statusCode === 404 || reason.statusCode === 410)) {
        expiredEndpoints.push(subscriptions[idx].endpoint);
      } else if (reason?.message) {
        errors.push(reason.message);
      }
    }
  });

  // Limpieza automática de endpoints caducados
  let cleanedCount = 0;
  if (expiredEndpoints.length > 0) {
    const { error: cleanError } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints);

    if (!cleanError) {
      cleanedCount = expiredEndpoints.length;
    }
  }

  return {
    success: failureCount === 0 || sentCount > 0,
    sentCount,
    failureCount,
    cleanedCount,
    errors: errors.slice(0, 5),
  };
}

/**
 * Envía una notificación de prueba a una única suscripción
 */
export async function sendTestPush(subscription: PushSubscriptionPayload): Promise<{ success: boolean; error?: string }> {
  if (!ensureVapidConfig()) {
    return { success: false, error: 'Claves VAPID no configuradas' };
  }

  const pushConfig = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };

  const payload = JSON.stringify({
    title: 'Notificaciones activadas',
    body: 'Recibirás las alertas de República Caraquista en este dispositivo.',
    icon: '/icon-512.png',
    badge: '/favicon.ico',
    url: '/game-center',
    tag: 'test-notification',
  });

  try {
    await webpush.sendNotification(pushConfig, payload, { TTL: 60 });
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido al enviar prueba';
    return { success: false, error: errorMsg };
  }
}
