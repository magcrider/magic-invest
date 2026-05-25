import type { SQLiteDatabase } from 'expo-sqlite';
import type { CdtRate, MacroRate, MacroRateType, RateSource } from '@/db/schema';

// --- CDT Rates ---

export async function getLatestCdtRate(
  db: SQLiteDatabase,
  bank: string,
  termDays: number
): Promise<CdtRate | null> {
  return db.getFirstAsync<CdtRate>(
    `SELECT * FROM cdt_rates
     WHERE bank = ? AND term_days = ?
     ORDER BY effective_date DESC LIMIT 1`,
    bank,
    termDays
  );
}

export async function insertCdtRate(
  db: SQLiteDatabase,
  bank: string,
  termDays: number,
  rate: number,
  effectiveDate: string,
  source: RateSource = 'manual'
): Promise<void> {
  await db.runAsync(
    `INSERT INTO cdt_rates (bank, term_days, rate, effective_date, source)
     VALUES (?, ?, ?, ?, ?)`,
    bank,
    termDays,
    rate,
    effectiveDate,
    source
  );
}

// Average CDT rate across configured banks for a given term
export async function getAverageCdtRate(
  db: SQLiteDatabase,
  termDays: number
): Promise<number | null> {
  const row = await db.getFirstAsync<{ avg_rate: number | null }>(
    `SELECT AVG(rate) as avg_rate FROM (
       SELECT bank, rate FROM cdt_rates
       WHERE term_days = ?
       GROUP BY bank
       HAVING effective_date = MAX(effective_date)
     )`,
    termDays
  );
  return row?.avg_rate ?? null;
}

// --- Macro Rates ---

export async function getLatestMacroRate(
  db: SQLiteDatabase,
  type: MacroRateType
): Promise<MacroRate | null> {
  return db.getFirstAsync<MacroRate>(
    `SELECT * FROM macro_rates
     WHERE type = ?
     ORDER BY effective_date DESC LIMIT 1`,
    type
  );
}

export async function insertMacroRate(
  db: SQLiteDatabase,
  type: MacroRateType,
  value: number,
  effectiveDate: string,
  source: RateSource = 'manual'
): Promise<void> {
  await db.runAsync(
    `INSERT INTO macro_rates (type, value, effective_date, source)
     VALUES (?, ?, ?, ?)`,
    type,
    value,
    effectiveDate,
    source
  );
}

export async function getMacroRateHistory(
  db: SQLiteDatabase,
  type: MacroRateType,
  fromDate: string
): Promise<MacroRate[]> {
  return db.getAllAsync<MacroRate>(
    `SELECT * FROM macro_rates
     WHERE type = ? AND effective_date >= ?
     ORDER BY effective_date ASC`,
    type,
    fromDate
  );
}
