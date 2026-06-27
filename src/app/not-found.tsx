import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <FileQuestion className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-800">Página no encontrada</h1>
          <p className="text-sm text-slate-500">
            La ruta que buscas no existe o fue movida.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/">
            <Home className="w-4 h-4" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    </div>
  );
}
