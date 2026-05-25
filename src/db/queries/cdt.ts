import type { SQLiteDatabase } from 'expo-sqlite';
import type { CdtPosition, CdtCapitalization } from '@/db/schema';

export async function getAllCdts(db: SQLiteDatabase): Promise<CdtPosition[]> {
  return db.getAllAsync<CdtPosition>(
    'SELECT * FROM cdt_positions ORDER BY end_date ASC'
  );
}

export async function getCdtById(
  db: SQLiteDatabase,
  id: number
): Promise<CdtPosition | null> {
  return db.getFirstAsync<CdtPosition>(
    'SELECT * FROM cdt_positions WHERE id = ?',
    id
  );
}

export interface CreateCdtInput {
  bank: string;
  amount: number;
  rate: number;
  term_days: number;
  start_date: string;
  end_date: string;
  capitalization?: CdtCapitalization;
  withholding_rate?: number;
  notes?: string;
}

export async function createCdt(
  db: SQLiteDatabase,
  input: CreateCdtInput
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO cdt_positions
       (bank, amount, rate, term_days, start_date, end_date,
        capitalization, withholding_rate, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.bank,
    input.amount,
    input.rate,
    input.term_days,
    input.start_date,
    input.end_date,
    input.capitalization ?? 'maturity',
    input.withholding_rate ?? 0.04,
    input.notes ?? null
  );
  return result.lastInsertRowId;
}

export async function updateCdt(
  db: SQLiteDatabase,
  id: number,
  input: Partial<CreateCdtInput>
): Promise<void> {
  const fields = Object.entries(input)
    .map(([k]) => `${k} = ?`)
    .join(', ');
  const values = Object.values(input);
  await db.runAsync(
    `UPDATE cdt_positions SET ${fields}, updated_at = datetime('now') WHERE id = ?`,
    ...values,
    id
  );
}

export async function deleteCdt(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM cdt_positions WHERE id = ?', id);
}

// Returns CDTs maturing within the next N days
export async function getCdtsMaturingSoon(
  db: SQLiteDatabase,
  withinDays: number = 30
): Promise<CdtPosition[]> {
  return db.getAllAsync<CdtPosition>(
    `SELECT * FROM cdt_positions
     WHERE end_date <= date('now', '+' || ? || ' days')
       AND end_date >= date('now')
     ORDER BY end_date ASC`,
    withinDays
  );
}
