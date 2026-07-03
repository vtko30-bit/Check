import type { User } from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { authConfig } from './auth.config';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  applyDbUserToAuthUser,
  findOrCreateGoogleUser,
  findUserByEmail,
  isGoogleAuthConfigured,
  isPostgresConfigured,
} from '@/lib/auth-google';

async function getUser(email: string) {
  try {
    const user = await sql`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

const providers: NextAuthConfig['providers'] = [
  Credentials({
    async authorize(credentials) {
      const parsedCredentials = z
        .object({ email: z.string().email(), password: z.string().min(6) })
        .safeParse(credentials);

      if (parsedCredentials.success) {
        const { email, password } = parsedCredentials.data;
        const user = await getUser(email);
        if (!user) return null;
        if (user.is_active === false) return null;
        if (!user.password) return null;

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (passwordsMatch) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.avatar_url ?? null,
            can_view_all_tasks: user.can_view_all_tasks === true,
          } as User;
        }
      }

      return null;
    },
  }),
];

if (isGoogleAuthConfigured()) {
  providers.unshift(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  trustHost: true,
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return true;

      try {
        if (!isPostgresConfigured()) {
          console.error('Google signIn: POSTGRES_URL no configurada');
          return '/login?error=DbError';
        }

        const email = user.email?.trim().toLowerCase();
        if (!email) return '/login?error=GoogleSignIn';

        const result = await findOrCreateGoogleUser(email, user.name, user.image);
        if (!result.ok) {
          if (result.reason === 'inactive') {
            return '/login?error=InactiveAccount';
          }
          return '/login?error=DbError';
        }

        applyDbUserToAuthUser(user, result.user);
        return true;
      } catch (error) {
        console.error('Google signIn error:', error);
        return '/login?error=DbError';
      }
    },
    async jwt({ token, user, account }) {
      if (user?.id && user?.role) {
        token.id = user.id;
        token.role = user.role;
        token.canViewAllTasks = user.can_view_all_tasks === true;
      } else if (account?.provider === 'google' && user?.email) {
        const dbUser = await findUserByEmail(user.email.trim().toLowerCase());
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.canViewAllTasks = dbUser.can_view_all_tasks;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? '';
        session.user.role = (token.role as string) ?? 'viewer';
        session.user.canViewAllTasks = token.canViewAllTasks === true;
      }
      return session;
    },
  },
});
