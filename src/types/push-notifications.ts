// Tipos canónicos para Notificaciones Web Push en República Caraquista

export type NotificationTopic = 'game_status' | 'scoring_plays' | 'extra_innings' | 'news_roster';

export interface UserNotificationPreferences {
  game_status: boolean;
  scoring_plays: boolean;
  extra_innings: boolean;
  news_roster: boolean;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: PushSubscriptionKeys;
  topics?: NotificationTopic[];
  userAgent?: string;
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
  topics: NotificationTopic[];
  created_at: string;
  updated_at: string;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  topic: NotificationTopic;
  tag?: string;
}

export interface PushSendResult {
  success: boolean;
  sentCount: number;
  failureCount: number;
  cleanedCount: number;
  errors?: string[];
}

export const TOPIC_LABELS: Record<
  NotificationTopic,
  { title: string; description: string; defaultEnabled: boolean }
> = {
  game_status: {
    title: 'Inicio y resultado final',
    description: 'Lineup confirmado, inicio de juego (play ball) y pizarra final.',
    defaultEnabled: true,
  },
  scoring_plays: {
    title: 'Carreras y jonrones',
    description: 'Anotaciones y cuadrangulares durante el juego.',
    defaultEnabled: false,
  },
  extra_innings: {
    title: 'Extrainnings',
    description: 'Entradas extras y definiciones en el noveno inning.',
    defaultEnabled: false,
  },
  news_roster: {
    title: 'Noticias y roster',
    description: 'Artículos de La Cueva y cambios en el roster oficial.',
    defaultEnabled: true,
  },
};

export interface AppNotification {
  id: string;
  category: 'game' | 'news' | 'roster' | 'radio' | 'system';
  badge: string;
  badgeColor: 'gold' | 'emerald' | 'crimson' | 'blue' | 'slate';
  title: string;
  description: string;
  timestamp: string;
  relativeTime: string;
  actionUrl: string;
  actionLabel: string;
  unread?: boolean;
}
