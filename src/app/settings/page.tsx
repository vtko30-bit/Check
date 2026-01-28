import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SettingsView } from '@/components/settings/SettingsView';
import { getBranding } from '@/actions/branding';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  
  // Only admins can see the settings page
  const user = session?.user as { id: string; name: string; email: string; role: string } | undefined;
  if (!user || user.role !== 'admin') {
    redirect('/');
  }

  const currentLogo = await getBranding();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Configuración del Sistema</h1>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <SettingsView currentLogo={currentLogo} />
      </div>
    </div>
  );
}
