'use client';

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentSubscription, isPushNotificationSupported } from '@/lib/push-client';
import { NotificationModal } from './notification-modal';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [notificationCount, setNotificationCount] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isPushNotificationSupported()) {
      getCurrentSubscription().then((sub) => {
        setIsSubscribed(Boolean(sub));
      });
    }

    // Consultar cantidad de notificaciones y alertas activas
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.notifications)) {
          setNotificationCount(data.notifications.length);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Notificaciones de la App"
        title="Centro de Notificaciones"
        className={cn(
          "relative flex items-center justify-center p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 border border-slate-800/80 transition-all",
          className
        )}
      >
        <Bell className="h-4 w-4" />
        {notificationCount > 0 ? (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#FDB827] text-[10px] font-bold font-mono text-[#070B19] ring-2 ring-[#070B19] shadow-sm animate-in zoom-in-75"
            title={`${notificationCount} alertas disponibles`}
          >
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        ) : isSubscribed ? (
          <span
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#FDB827] ring-2 ring-[#070B19]"
            title="Notificaciones push activas"
          />
        ) : null}
      </button>

      <NotificationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubscriptionChange={(active) => setIsSubscribed(active)}
      />
    </>
  );
}
