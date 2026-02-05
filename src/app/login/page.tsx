import { LoginForm } from '@/components/ui/login-form';
import Image from 'next/image';
import { getBranding } from '@/actions/branding';
 
export default async function LoginPage() {
  const companyLogo = await getBranding();
  return (
    <main className="flex items-center justify-center md:h-screen bg-slate-50/50">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-4 p-4 md:-mt-32">
        {/* App Branding (Small/Top) */}
        <div className="flex items-center justify-center gap-2 mb-2 opacity-60 hover:opacity-100 transition-opacity">
           <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-white text-[10px] font-bold">C</div>
           <span className="text-sm font-bold text-slate-800 tracking-tight">Check</span>
        </div>

        {/* Dedicated Company Logo Section (solo logo) */}
        <div className="flex w-full flex-col items-center justify-center rounded-2xl bg-white border border-slate-200 p-10 shadow-xl border-b-4 border-b-primary/10">
          <div className="relative w-24 h-24">
             <Image 
               src={companyLogo || "/logo.png"} 
               alt="Tu Empresa Logo" 
               fill 
               className="object-contain"
               priority
             />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <LoginForm />
        </div>
        
        <div className="text-center text-[10px] text-slate-400 font-medium">
            Demo: admin@check.com / 123456
        </div>
      </div>
    </main>
  );
}
