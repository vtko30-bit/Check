import { LoginForm } from '@/components/ui/login-form';
import { getBranding } from '@/actions/branding';
import { isGoogleAuthConfigured } from '@/lib/auth-google';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const companyLogo = await getBranding();
  const { error } = await searchParams;

  return (
    <main className="flex items-center justify-center min-h-screen w-full bg-primary/25 px-4 py-8">
      <div className="relative w-full max-w-[380px] flex flex-col space-y-4">
        {/* App Branding (Small/Top) */}
        <div className="flex items-center justify-center gap-2 mb-2 opacity-60 hover:opacity-100 transition-opacity">
           <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-white text-[10px] font-bold">C</div>
           <span className="text-sm font-bold text-slate-800 tracking-tight">Check</span>
        </div>

        {/* Logo de la empresa */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white border border-slate-200 p-8 shadow-lg border-b-4 border-b-primary/10">
          <img 
            src={companyLogo || "/check-logo.png"} 
            alt="Logo" 
            className="w-20 h-20 object-contain"
          />
        </div>

        {/* Recuadro de credenciales - ancho contenido */}
        <div className="bg-primary/20 rounded-2xl border-2 border-primary/40 shadow-lg overflow-hidden">
          <LoginForm
            googleAuthEnabled={isGoogleAuthConfigured()}
            authError={error ?? null}
          />
        </div>
        
        <div className="text-center text-[10px] text-slate-400 font-medium">
            Demo: admin@check.com / 123456
            <br />
            <span className="text-slate-400">Usa correos reales para recuperar contraseña.</span>
        </div>
      </div>
    </main>
  );
}
