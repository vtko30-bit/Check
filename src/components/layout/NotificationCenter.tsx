'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { Notification } from '@/types';
import { getNotifications, markAsRead, markAllAsRead } from '@/actions/notifications';
import { cn } from '@/lib/utils';

export function NotificationCenter({ userId, align = 'right' }: { userId: string, align?: 'left' | 'right' }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevUnreadCountRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getNotifications(userId);
      const safeData = data || [];
      setNotifications(safeData);
      setUnreadCount(safeData.filter(n => !n.isRead).length);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [userId]);

  useEffect(() => {
    const init = async () => {
      await fetchNotifications();
    };
    init();
    
    // Create audio once
    audioRef.current = new Audio('/notification.mp3');
    
    // Poll for new notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Play sound when unread count increases
  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
        audioRef.current?.play().catch(e => console.log("Audio play blocked:", e));
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead(userId);
    fetchNotifications();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors group"
      >
        <Bell className={cn(
          "w-5 h-5 transition-colors",
          unreadCount > 0 ? "text-primary fill-primary/10" : "text-slate-400 group-hover:text-slate-600"
        )} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount > 10 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className={cn(
            "absolute mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200",
            align === 'right' ? 'right-0' : 'left-0'
          )}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                Notificaciones
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                    {unreadCount} nuevas
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-slate-500 hover:text-primary font-semibold transition-colors"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-400">No tienes notificaciones aún</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={cn(
                        "p-4 flex gap-3 group transition-colors",
                        !n.isRead ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "mt-1 w-2 h-2 rounded-full shrink-0",
                        !n.isRead ? "bg-primary" : "bg-transparent"
                      )} />
                      <div className="flex-1 space-y-1">
                        <p className={cn(
                          "text-xs",
                          !n.isRead ? "text-slate-800 font-medium" : "text-slate-600"
                        )}>
                          {n.message}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {new Date(n.createdAt).toLocaleString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'short'
                          })}
                        </p>
                      </div>
                      {!n.isRead && (
                        <button 
                          onClick={() => handleMarkRead(n.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded shadow-sm text-slate-400 hover:text-primary transition-all self-center"
                          title="Marcar como leída"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
