import { auth } from "@/auth";
import { getBranding } from "@/actions/branding";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { cn } from "@/lib/utils";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const companyLogo = await getBranding();

  // Si no está logueado, mostramos solo el contenido (login screen)
  if (!isLoggedIn) {
      return (
        <main className="flex items-center justify-center h-screen w-full">
            {children}
        </main>
      );
  }

  // Si está logueado, mostramos la App con Sidebar
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileNav user={session.user} companyLogo={companyLogo} />
      <div className="hidden md:flex">
        <Sidebar user={session.user as any} companyLogo={companyLogo} />
      </div>
      <main className="flex-1 p-4 md:p-8 overflow-auto w-full">
        {children}
      </main>
    </div>
  );
}