'use client';

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { getCurrentSubscription, isPushNotificationSupported } from '@/lib/push-client';
import { NotificationModal } from './notification-modal';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supp = isPushNotificationSupported();
    setIsSupported(supp);

    if (supp) {
      getCurrentSubscription().then((sub) => {
        setIsSubscribed(Boolean(sub));
      });
    }
  }, []);

  if (!isSupported) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Configurar notificaciones"
        title="Configurar notificaciones"
        className={`relative flex items-center justify-center p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 border border-slate-800/80 transition-all ${className}`}
      >
        <Bell className="h-4 w-4" />
        {isSubscribed && (
          <span
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#FDB827] ring-2 ring-[#070B19]"
            title="Notificaciones activas"
          />
        )}
      </button>

      <NotificationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubscriptionChange={(active) => setIsSubscribed(active)}
      />
    </>
  );
}
