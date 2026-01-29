import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { auth } from "@/auth";
import { cn } from "@/lib/utils";
import { getBranding } from "@/actions/branding";
import { Inter, Caveat } from "next/font/google";
// 1. IMPORTAMOS EL PROVEEDOR (Asegúrate de haber creado este archivo antes)
import { ThemeProvider } from "@/components/NextThemeProvider"; 

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
    // 2. AGREGAMOS suppressHydrationWarning AQUÍ
    <html lang="es" suppressHydrationWarning>
      <body className={cn(
        // 3. AGREGAMOS dark:bg-slate-950 PARA QUE EL FONDO CAMBIE
        "antialiased flex flex-col md:flex-row min-h-screen bg-slate-50/50 dark:bg-slate-950 text-foreground",
        inter.className,
        caveat.variable
      )}>
        {/* 4. ENVOLVEMOS TODO EL CONTENIDO INTERNO CON EL THEMEPROVIDER */}
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {isLoggedIn && <MobileNav user={session.user as { id: string; name?: string; email?: string; image?: string }} companyLogo={companyLogo} />}
            {isLoggedIn && (
              <div className="hidden md:flex">
                <Sidebar user={session.user as { id: string; name?: string; email?: string; image?: string }} companyLogo={companyLogo} />
              </div>
            )}
            <main className={cn("flex-1 p-4 md:p-8 overflow-auto w-full", !isLoggedIn && "flex items-center justify-center")}>
              {children}
            </main>
        </ThemeProvider>
      </body>
    </html>
  );
}