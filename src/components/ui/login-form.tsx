'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

const AUTH_ERRORS: Record<string, string> = {
  AccessDenied:
    'Tu correo de Google no está registrado en Check. Pide a un administrador que cree tu usuario con ese email.',
  InactiveAccount: 'Tu cuenta está desactivada. Contacta al administrador.',
  GoogleSignIn: 'No se pudo obtener el correo de Google. Intenta de nuevo.',
  OAuthSignin: 'Error al conectar con Google. Revisa la configuración.',
  OAuthCallback: 'Error en la respuesta de Google. Intenta de nuevo.',
  Configuration: 'Inicio con Google no configurado en el servidor.',
};

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginForm({
  googleAuthEnabled = false,
  authError,
}: {
  googleAuthEnabled?: boolean;
  authError?: string | null;
}) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(
    authError ? AUTH_ERRORS[authError] ?? 'No se pudo iniciar sesión.' : null
  );
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

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

  async function handleGoogleSignIn() {
    setGooglePending(true);
    setErrorMessage(null);
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch {
      setErrorMessage('Error al iniciar sesión con Google.');
      setGooglePending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      <div className="rounded-lg bg-white px-6 pb-6 pt-6">
        <h1 className="mb-3 text-2xl font-bold text-gray-900">Iniciar Sesión</h1>

        {googleAuthEnabled && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={pending || googlePending}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-200 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 transition-all"
            >
              <GoogleIcon />
              {googlePending ? 'Redirigiendo...' : 'Continuar con Google'}
            </button>
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">o con email</span>
              </div>
            </div>
          </>
        )}

        <div className="w-full">
          <div>
            <label
              className="mb-3 mt-1 block text-xs font-medium text-gray-900"
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
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
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
          disabled={pending || googlePending}
        >
          {pending ? 'Ingresando...' : 'Ingresar'}
        </button>
        <div
          className="flex h-8 items-end space-x-1"
          aria-live="polite"
          aria-atomic="true"
        >
          {errorMessage && (
            <p className="text-sm text-red-500" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
