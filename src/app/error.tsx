'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error de aplicación:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-800">Algo salió mal</h1>
          <p className="text-sm text-slate-500">
            Ocurrió un error inesperado. Puedes reintentar o volver al inicio.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/">
              <Home className="w-4 h-4" />
              Ir al inicio
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
