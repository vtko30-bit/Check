import { auth } from "@/auth";
import { getBranding } from "@/actions/branding";
import { getGroupedTasksCount } from "@/actions/task-groups";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { redirect } from "next/navigation"; // Para proteger rutas

export default async function MainAppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const [companyLogo, groupedTasksCount] = await Promise.all([
    getBranding(),
    getGroupedTasksCount(),
  ]);

  if (!isLoggedIn) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* AQUÍ SÍ ponemos las barras */}
      <MobileNav user={session.user} companyLogo={companyLogo} groupedTasksCount={groupedTasksCount} />
      
      <div className="hidden md:flex">
        <Sidebar user={session.user} companyLogo={companyLogo} groupedTasksCount={groupedTasksCount} />
      </div>
      
      <main className="flex-1 flex flex-col overflow-auto w-full bg-sky-100 dark:bg-sky-950/40">
        <OfflineBanner />
        <div className="flex-1 p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}