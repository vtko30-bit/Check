import { getDatabaseSchemaError } from '@/lib/db-schema';

/** Aviso visible cuando el esquema de BD no está al día. */
export async function DatabaseHealthBanner() {
  const error = await getDatabaseSchemaError();
  if (!error) return null;

  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <strong className="font-semibold">Base de datos desactualizada.</strong>{' '}
      {error}
    </div>
  );
}
