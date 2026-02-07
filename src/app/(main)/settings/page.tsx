import { auth } from "@/auth";
import { getBranding } from "@/actions/branding";
import { SettingsView } from "@/components/settings/SettingsView";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const companyLogo = await getBranding();

  return (
    <div className="max-w-2xl mx-auto w-full">
      <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
        Configuración
      </h1>
      <SettingsView currentLogo={companyLogo} />
    </div>
  );
}
