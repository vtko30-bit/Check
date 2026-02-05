import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Inter, Caveat } from "next/font/google";
import { ThemeProvider } from "@/components/NextThemeProvider"; 

// OJO: ¡Aquí NO importamos Sidebar ni MobileNav!

const inter = Inter({ subsets: ["latin"] });
const caveat = Caveat({ 
  subsets: ["latin"],
  variable: '--font-handwritten',
});

export const metadata: Metadata = {
  title: "Check",
  description: "Gestión de tareas minimalista",
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#14b8a6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn(
        "antialiased min-h-screen bg-slate-50/50 text-foreground",
        inter.className,
        caveat.variable
      )}>
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            forcedTheme="light"
            enableSystem={false}
            disableTransitionOnChange
        >
            {/* Aquí solo renderizamos los hijos. La barra lateral se encargará el otro layout. */}
            {children}
        </ThemeProvider>
      </body>
    </html>
  );
}