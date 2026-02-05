'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    // Evitamos que NextAuth haga un redirect interno, que rompe la Server Action
    const result = await signIn('credentials', {
      redirect: false,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    });

    // Si NextAuth devuelve error de credenciales
    if (result?.error) {
      if (result.error === 'CredentialsSignin') {
        return 'Credenciales inválidas.';
      }
      return 'Algo salió mal.';
    }

    // Login correcto: redirigimos manualmente al dashboard
    if (result?.ok) {
      redirect('/');
    }

    // Respuesta inesperada pero serializable
    return 'Algo salió mal.';
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Credenciales inválidas.';
        default:
          return 'Algo salió mal.';
      }
    }
    throw error;
  }
}
