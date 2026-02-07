'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
 
export function LoginForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setErrorMessage('Credenciales inválidas.');
        return;
      }

      router.push('/');
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage(
        err instanceof Error && err.message === 'Failed to fetch'
          ? 'No se pudo conectar con el servidor. Verifica que la app esté corriendo y la base de datos configurada.'
          : 'Error al iniciar sesión. Intenta de nuevo.'
      );
    } finally {
      setPending(false);
    }
  }
 
  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      <div className="rounded-lg bg-white px-6 pb-6 pt-6">
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Iniciar Sesión
        </h1>
        <div className="w-full">
          <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-3 text-sm outline-2 placeholder:text-gray-500"
                id="email"
                type="email"
                name="email"
                placeholder="Ingresa tu email"
                required
              />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <label
                className="block text-xs font-medium text-gray-900"
                htmlFor="password"
              >
                Contraseña
              </label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-3 text-sm outline-2 placeholder:text-gray-500"
                id="password"
                type="password"
                name="password"
                placeholder="Ingresa tu contraseña"
                required
                minLength={6}
              />
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:opacity-90 focus:outline-none disabled:bg-slate-300 transition-all shadow-teal-200/50"
          disabled={pending}
        >
          {pending ? 'Ingresando...' : 'Ingresar'}
        </button>
        <div
          className="flex h-8 items-end space-x-1"
          aria-live="polite"
          aria-atomic="true"
        >
          {errorMessage && (
            <p className="text-sm text-red-500" role="alert">{errorMessage}</p>
          )}
        </div>
      </div>
    </form>
  );
}
