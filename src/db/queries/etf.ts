import type { SQLiteDatabase } from 'expo-sqlite';
import type { EtfPosition } from '@/db/schema';

export async function getAllEtfs(db: SQLiteDatabase): Promise<EtfPosition[]> {
  return db.getAllAsync<EtfPosition>(
    'SELECT * FROM etf_positions ORDER BY ticker ASC'
  );
}

export async function getEtfByTicker(
  db: SQLiteDatabase,
  ticker: string
): Promise<EtfPosition | null> {
  return db.getFirstAsync<EtfPosition>(
    'SELECT * FROM etf_positions WHERE ticker = ?',
    ticker.toUpperCase()
  );
}

export interface CreateEtfInput {
  ticker: string;
  name: string;
  shares: number;
  average_cost_usd: number;
  ter: number;
  currency?: string;
}

export async function createEtf(
  db: SQLiteDatabase,
  input: CreateEtfInput
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO etf_positions (ticker, name, shares, average_cost_usd, ter, currency)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.ticker.toUpperCase(),
    input.name,
    input.shares,
    input.average_cost_usd,
    input.ter,
    input.currency ?? 'USD'
  );
  return result.lastInsertRowId;
}

export async function updateEtf(
  db: SQLiteDatabase,
  id: number,
  input: Partial<CreateEtfInput>
): Promise<void> {
  const fields = Object.entries(input)
    .map(([k]) => `${k} = ?`)
    .join(', ');
  const values = Object.values(input);
  await db.runAsync(
    `UPDATE etf_positions SET ${fields}, updated_at = datetime('now') WHERE id = ?`,
    ...values,
    id
  );
}

export async function deleteEtf(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM etf_positions WHERE id = ?', id);
}
