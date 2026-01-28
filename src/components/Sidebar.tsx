'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Calendar, Users, LogOut, Settings } from 'lucide-react';
import { handleSignOut } from '@/actions/auth';
import { NotificationCenter } from './layout/NotificationCenter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export function Sidebar({ user, companyLogo }: { 
  user: { id: string; name?: string | null; email?: string | null; image?: string | null; role?: string },
  companyLogo?: string | null
}) {
  const pathname = usePathname();
  const links = [
    { href: '/', label: 'Tareas', icon: LayoutDashboard },
    { href: '/calendar', label: 'Calendario', icon: Calendar },
    { href: '/users', label: 'Usuarios', icon: Users },
    ...(user.role === 'admin' ? [{ href: '/settings', label: 'Configuración', icon: Settings }] : []),
  ];

  return (
    <div className="w-64 border-r bg-slate-50 h-screen sticky top-0 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="mb-6 px-2 flex items-center justify-between">
          <div className="font-bold text-xl flex items-center gap-2">
            <span className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">T</span>
            TaskPro
          </div>
          <NotificationCenter userId={user.id} align="left" />
        </div>

        {/* Logo de la Empresa (Placeholder) */}
        <div className="mb-6 px-2">
          <div className="h-16 w-full rounded-xl flex items-center justify-center bg-white shadow-sm border border-slate-100 p-2">
            <div className="relative w-full h-full">
              <Image 
                src={companyLogo || "/logo.png"} 
                alt="Company Logo" 
                fill 
                className="object-contain" 
              />
            </div>
          </div>
        </div>

        <div className="mb-8 px-2 py-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <Avatar className="h-9 w-9 border-2 border-primary/10">
            <AvatarImage src={user.image || ''} />
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
              {user.name?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
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

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <button
          onClick={() => handleSignOut()}
          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-red-600 hover:bg-red-50 w-full"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
