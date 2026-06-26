/**
 * Autorización Bearer para endpoints operativos (/api/cron, /api/seed, etc.).
 * Falla cerrado si falta el secret configurado.
 */
export function isBearerAuthorized(request: Request, envVar: string): boolean {
  const secret = process.env[envVar];
  if (!secret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}
