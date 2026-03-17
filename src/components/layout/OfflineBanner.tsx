'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 mx-auto flex max-w-3xl items-center justify-center gap-3 rounded-b-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 px-4 py-2.5 text-xs md:text-sm font-medium text-white shadow-lg shadow-amber-500/40"
      aria-live="polite"
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/40 bg-white/10">
        <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden />
      </div>
      <span className="text-center">
        Sin conexión. Algunas acciones pueden no guardarse hasta que vuelvas a tener internet.
      </span>
    </div>
  );
}
