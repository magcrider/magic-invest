import type { SQLiteDatabase } from 'expo-sqlite';
import type { EtfPosition } from '@/db/schema';

export async function getAllEtfs(db: SQLiteDatabase): Promise<EtfPosition[]> {
  return db.getAllAsync<EtfPosition>(
    'SELECT * FROM etf_positions ORDER BY ticker ASC'
  );
}

export async function getEtfById(
  db: SQLiteDatabase,
  id: number
): Promise<EtfPosition | null> {
  return db.getFirstAsync<EtfPosition>(
    'SELECT * FROM etf_positions WHERE id = ?',
    id
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
  total_invested_cop?: number | null;
  trm_at_purchase?: number | null;
  total_invested_usd?: number | null;
}

export async function createEtf(
  db: SQLiteDatabase,
  input: CreateEtfInput
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO etf_positions
       (ticker, name, shares, average_cost_usd, ter, currency,
        total_invested_cop, trm_at_purchase, total_invested_usd)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.ticker.toUpperCase(),
    input.name,
    input.shares,
    input.average_cost_usd,
    input.ter,
    input.currency ?? 'USD',
    input.total_invested_cop ?? null,
    input.trm_at_purchase ?? null,
    input.total_invested_usd ?? null
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
