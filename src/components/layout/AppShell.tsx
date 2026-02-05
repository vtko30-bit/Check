"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { cn } from "@/lib/utils";

export function AppShell({ 
  children, 
  user, 
  companyLogo 
}: { 
  children: React.ReactNode, 
  user: any, 
  companyLogo: any 
}) {
  const pathname = usePathname();
  
  // 1. DETECTAR SI ESTAMOS EN UNA NOTA FLOTANTE
  // Si la URL empieza por "/note/", significa que es la ventanita amarilla
  const isFloatingNote = pathname?.startsWith("/note/");

  // 2. SI ES NOTA, SOLO MOSTRAMOS EL CONTENIDO (Sin Sidebar, Sin Menú)
  if (isFloatingNote) {
    return (
      <main className="h-screen w-full bg-yellow-200 overflow-hidden">
        {children}
      </main>
    );
  }

  // 3. SI NO ES NOTA, MOSTRAMOS LA APP COMPLETA (Con Sidebar y Menú)
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Menú Móvil */}
      <MobileNav user={user} companyLogo={companyLogo} />
      
      {/* Barra Lateral de Escritorio */}
      <div className="hidden md:flex">
        <Sidebar user={user} companyLogo={companyLogo} />
      </div>
      
      {/* Contenido Principal */}
      <main className={cn("flex-1 p-4 md:p-8 overflow-auto w-full", !user && "flex items-center justify-center")}>
        {children}
      </main>
    </div>
  );
}