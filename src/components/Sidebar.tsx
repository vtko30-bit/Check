'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Calendar, Users, LogOut, Settings, CheckSquare, FolderKanban } from 'lucide-react';
import { NotificationCenter } from './layout/NotificationCenter';
import { ShareButton } from './ShareButton';
export function Sidebar({ user, companyLogo, groupedTasksCount = 0 }: { 
  user: { id: string; name?: string | null; email?: string | null; image?: string | null; role?: string },
  companyLogo?: string | null,
  groupedTasksCount?: number
}) {
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
    <div className="w-64 border-r bg-slate-50 h-screen sticky top-0 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        
        {/* --- NUEVA CABECERA CON EL NOMBRE 'CHECK' --- */}
        <div className="mb-6 px-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
               <CheckSquare className="w-6 h-6 text-primary" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">Check</span>
          </div>
          <NotificationCenter userId={user.id} align="left" />
        </div>

        {/* Logo de la Empresa */}
        <div className="mb-6 px-2">
          <div className="h-16 w-full max-w-[200px] rounded-xl flex items-center justify-center bg-white shadow-sm border border-slate-100 p-2 overflow-hidden">
            <img 
              src={companyLogo || "/check-logo.png"} 
              alt="Logo de Check" 
              className="max-h-12 max-w-full object-contain w-auto"
            />
          </div>
        </div>

        <div className="mb-8 px-2 py-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
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
              <Link key={link.href} href={link.href}>
                <span className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                  isActive ? "bg-white text-primary shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                )}>
                  <Icon className="w-4 h-4" />
                  {link.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-1">
        <div className="w-full">
          <ShareButton />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-red-600 hover:bg-red-50 w-full"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}