import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/ui/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <main className="flex items-center justify-center min-h-screen w-full bg-slate-50/50 px-4 py-8">
      <div className="relative w-full max-w-[380px] flex flex-col space-y-4">
        <div className="flex items-center justify-center gap-2 mb-2 opacity-60">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-white text-[10px] font-bold">C</div>
          <span className="text-sm font-bold text-slate-800 tracking-tight">Check</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <ForgotPasswordForm />
        </div>

        <p className="text-center text-sm text-slate-500">
          <Link href="/login" className="text-primary hover:underline font-medium">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
