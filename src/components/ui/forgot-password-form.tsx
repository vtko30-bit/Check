'use client';

import { useState, type FormEvent } from 'react';
import { requestPasswordReset } from '@/actions/auth-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const result = await requestPasswordReset(formData);
      if (!result.success) {
        setError(result.error ?? 'Error al enviar');
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Revisa tu correo</h1>
        <p className="text-sm text-slate-600">
          Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.
          Revisa también la carpeta de spam.
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Recuperar contraseña</h1>
      <p className="text-sm text-slate-600">
        Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
      </p>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="tu@ejemplo.com"
          required
          autoComplete="email"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar enlace'}
      </Button>
    </form>
  );
}
