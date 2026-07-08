import { queryPg } from '@/lib/db-pg';
import {
  formatMissingSchema,
  REQUIRED_SCHEMA,
  REQUIRED_TABLES,
  SCHEMA_OUTDATED_MESSAGE,
} from '@/lib/schema-requirements';

export type SchemaCheckResult =
  | { ok: true }
  | { ok: false; missingTables: string[]; missingColumns: string[]; message: string };

const CACHE_TTL_MS = 60_000;
let cached: { checkedAt: number; result: SchemaCheckResult } | null = null;

export async function checkDatabaseSchema(force = false): Promise<SchemaCheckResult> {
  if (!force && cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const tableRows = await queryPg<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])`,
      [REQUIRED_TABLES as unknown as string[]]
    );
    const existingTables = new Set(tableRows.map((r) => r.table_name));
    const missingTables = REQUIRED_TABLES.filter((t) => !existingTables.has(t));

    const columnRows = await queryPg<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])`,
      [[...new Set(REQUIRED_SCHEMA.map((c) => c.table))]]
    );
    const existingColumns = new Set(
      columnRows.map((r) => `${r.table_name}.${r.column_name}`)
    );
    const missingColumns = REQUIRED_SCHEMA.filter(
      (c) => !existingColumns.has(`${c.table}.${c.column}`)
    ).map((c) => `${c.table}.${c.column}`);

    const result: SchemaCheckResult =
      missingTables.length === 0 && missingColumns.length === 0
        ? { ok: true }
        : {
            ok: false,
            missingTables: [...missingTables],
            missingColumns,
            message: formatMissingSchema(missingTables, missingColumns),
          };

    cached = { checkedAt: Date.now(), result };
    return result;
  } catch (error) {
    console.error('checkDatabaseSchema error:', error);
    const result: SchemaCheckResult = {
      ok: false,
      missingTables: [],
      missingColumns: [],
      message: SCHEMA_OUTDATED_MESSAGE,
    };
    cached = { checkedAt: Date.now(), result };
    return result;
  }
}

/** Devuelve mensaje de error si el esquema no está al día; null si OK. */
export async function getDatabaseSchemaError(): Promise<string | null> {
  const result = await checkDatabaseSchema();
  return result.ok ? null : result.message;
}

export function clearSchemaCheckCache(): void {
  cached = null;
}
