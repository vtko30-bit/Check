'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { resetPassword } from '@/actions/auth-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Enlace inválido</h1>
        <p className="text-sm text-slate-600">
          Falta el token de recuperación. Solicita un nuevo enlace desde la página de recuperar contraseña.
        </p>
        <Link href="/forgot-password">
          <Button className="w-full">Solicitar nuevo enlace</Button>
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirm = formData.get('confirm') as string;
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await resetPassword(token, password);
      if (!result.success) {
        setError(result.error ?? 'Error al restablecer');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold text-emerald-700">¡Contraseña actualizada!</h1>
        <p className="text-sm text-slate-600">
          Tu contraseña se ha restablecido correctamente. Serás redirigido al inicio de sesión.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Nueva contraseña</h1>
      <p className="text-sm text-slate-600">
        Introduce tu nueva contraseña (mínimo 6 caracteres).
      </p>
      <div className="grid gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Confirmar contraseña</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          placeholder="••••••••"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Guardando...' : 'Restablecer contraseña'}
      </Button>
    </form>
  );
}
