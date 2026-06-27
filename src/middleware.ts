import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './auth.config';
import { checkRateLimit, getClientIp } from './lib/rate-limit';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const ip = getClientIp(req.headers);

  if (path.startsWith('/api/auth')) {
    if (!checkRateLimit(`auth:${ip}`, 20, 60_000)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Espera un momento.' },
        { status: 429 }
      );
    }
  }

  if (
    path.startsWith('/api/db-check') ||
    path.startsWith('/api/seed') ||
    path.startsWith('/api/cron')
  ) {
    if (!checkRateLimit(`ops:${ip}`, 15, 60_000)) {
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 });
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|webmanifest)$).*)',
  ],
};
