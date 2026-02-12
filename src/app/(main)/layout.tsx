import { auth } from "@/auth";
import { getBranding } from "@/actions/branding";
import { getGroupedTasksCount } from "@/actions/task-groups";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { redirect } from "next/navigation"; // Para proteger rutas

export default async function MainAppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const companyLogo = await getBranding();
  const groupedTasksCount = await getGroupedTasksCount();

  // Si alguien intenta entrar aquí sin loguearse, fuera.
  if (!isLoggedIn) {
      // Opcional: redirect('/api/auth/signin');
      return (
        <main className="flex items-center justify-center h-screen w-full">
            {children} 
        </main>
      );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* AQUÍ SÍ ponemos las barras */}
      <MobileNav user={session.user} companyLogo={companyLogo} groupedTasksCount={groupedTasksCount} />
      
      <div className="hidden md:flex">
        <Sidebar user={session.user as any} companyLogo={companyLogo} groupedTasksCount={groupedTasksCount} />
      </div>
      
      <main className="flex-1 p-4 md:p-8 overflow-auto w-full bg-sky-100 dark:bg-sky-950/40">
        {children}
      </main>
    </div>
  );
}