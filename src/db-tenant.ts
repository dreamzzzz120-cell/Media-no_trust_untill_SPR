import type postgres from 'postgres';

export async function withTenant<T>(
  sql: postgres.Sql,
  organizationId: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>
): Promise<T> {
  if (!organizationId) throw new Error('TENANT_REQUIRED');
  return await sql.begin(async tx => {
    await tx`SELECT set_config('app.organization_id', ${organizationId}, true)`;
    return await fn(tx);
  }) as T;
}
