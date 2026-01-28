import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { auth } from "@/auth";
import { cn } from "@/lib/utils";
import { getBranding } from "@/actions/branding";
import { Inter, Caveat } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const caveat = Caveat({ 
  subsets: ["latin"],
  variable: '--font-handwritten',
});

export const metadata: Metadata = {
  title: "Gestor de Tareas Pro",
  description: "Gestión de tareas productivas",
  manifest: '/manifest.webmanifest',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
  themeColor: '#14b8a6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TaskPro',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const companyLogo = await getBranding();

  return (
    <html lang="es">
      <body className={cn(
        "antialiased flex flex-col md:flex-row min-h-screen bg-slate-50/50 text-foreground",
        inter.className,
        caveat.variable
      )}>
        {isLoggedIn && <MobileNav user={session.user as { id: string; name?: string; email?: string; image?: string }} companyLogo={companyLogo} />}
        {isLoggedIn && (
          <div className="hidden md:flex">
            <Sidebar user={session.user as { id: string; name?: string; email?: string; image?: string }} companyLogo={companyLogo} />
          </div>
        )}
        <main className={cn("flex-1 p-4 md:p-8 overflow-auto w-full", !isLoggedIn && "flex items-center justify-center")}>
          {children}
        </main>
      </body>
    </html>
  );
}
