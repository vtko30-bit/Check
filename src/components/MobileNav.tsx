'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Calendar, Users, Menu, X, LogOut, Settings, CheckSquare, FolderKanban } from 'lucide-react';
import { NotificationCenter } from './layout/NotificationCenter';
import { ShareButton } from './ShareButton';

export function MobileNav({ user, companyLogo, groupedTasksCount = 0 }: { 
  user: { id: string; name?: string | null; email?: string | null; image?: string | null; role?: string },
  companyLogo?: string | null,
  groupedTasksCount?: number
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const groupsLabel = groupedTasksCount > 0 ? `Tareas Agrupadas (${groupedTasksCount})` : 'Tareas Agrupadas';
  const links = [
    { href: '/', label: 'Tareas', icon: LayoutDashboard },
    { href: '/groups', label: groupsLabel, icon: FolderKanban },
    { href: '/calendar', label: 'Calendario', icon: Calendar },
    ...((user.role === 'admin' || user.role === 'editor') ? [{ href: '/users', label: 'Usuarios', icon: Users }] : []),
    ...(user.role === 'admin' ? [{ href: '/settings', label: 'Configuración', icon: Settings }] : []),
  ];

  return (
    <div className="md:hidden border-b bg-white p-4 flex items-center justify-between sticky top-0 z-40">
      
      {/* --- LOGO EN BARRA CERRADA --- */}
      <div className="font-bold text-lg flex items-center gap-2">
        <div className="bg-primary/10 p-1 rounded-md">
           <CheckSquare className="w-5 h-5 text-primary" />
        </div>
        <span className="text-slate-800">Check</span>
      </div>
      
      <div className="flex items-center gap-1">
        <NotificationCenter userId={user.id} />
        <ShareButton compact />
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Drawer Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
          <div 
            className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-white p-4 shadow-xl transition-transform animate-in slide-in-from-left flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              
              {/* --- LOGO EN MENÚ ABIERTO --- */}
              <div className="font-bold text-xl flex items-center gap-2">
                <div className="bg-primary/10 p-1.5 rounded-lg">
                   <CheckSquare className="w-6 h-6 text-primary" />
                </div>
                <span className="text-slate-800">Check</span>
              </div>

              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Logo de la Empresa (Mobile) */}
            <div className="mb-6 px-1">
              <div className="h-16 w-full max-w-[200px] rounded-xl flex items-center justify-center bg-white shadow-sm border border-slate-100 p-2 overflow-hidden">
                <img 
                  src={companyLogo || "/check-logo.png"} 
                  alt="Logo de Check" 
                  className="max-h-12 max-w-full object-contain w-auto"
                />
              </div>
            </div>

            <div className="mb-8 p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                <span className="text-sm font-bold text-slate-800 truncate">{user.name}</span>
                <span className="text-[10px] text-slate-400 truncate">{user.email}</span>
              </div>
            </div>
            
            <nav className="space-y-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    onClick={() => setOpen(false)}
                  >
                    <span className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-md transition-colors text-sm font-medium mb-1",
                      isActive ? "bg-white text-primary shadow-sm border border-slate-100" : "text-slate-600 hover:bg-slate-50"
                    )}>
                      <Icon className="w-5 h-5" />
                      {link.label}
                    </span>
                  </Link>
                )
              })}
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-100 space-y-2">
                <div className="w-full">
                  <ShareButton />
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-sm font-bold text-red-600 hover:bg-red-50 w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Cerrar Sesión
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}