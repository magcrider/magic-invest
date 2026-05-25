import type { SQLiteDatabase } from 'expo-sqlite';
import type { EodPrice } from '@/db/schema';

export async function getLatestPrice(
  db: SQLiteDatabase,
  ticker: string
): Promise<EodPrice | null> {
  return db.getFirstAsync<EodPrice>(
    `SELECT * FROM eod_prices WHERE ticker = ? ORDER BY date DESC LIMIT 1`,
    ticker.toUpperCase()
  );
}

export async function getPriceHistory(
  db: SQLiteDatabase,
  ticker: string,
  fromDate: string  // ISO YYYY-MM-DD
): Promise<EodPrice[]> {
  return db.getAllAsync<EodPrice>(
    `SELECT * FROM eod_prices
     WHERE ticker = ? AND date >= ?
     ORDER BY date ASC`,
    ticker.toUpperCase(),
    fromDate
  );
}

export async function upsertEodPrice(
  db: SQLiteDatabase,
  ticker: string,
  date: string,
  closePrice: number,
  currency: string = 'USD'
): Promise<void> {
  await db.runAsync(
    `INSERT INTO eod_prices (ticker, date, close_price, currency)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(ticker, date) DO UPDATE SET close_price = excluded.close_price`,
    ticker.toUpperCase(),
    date,
    closePrice,
    currency
  );
}

export async function upsertEodPriceBatch(
  db: SQLiteDatabase,
  prices: Array<{ ticker: string; date: string; close_price: number; currency?: string }>
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const p of prices) {
      await upsertEodPrice(db, p.ticker, p.date, p.close_price, p.currency);
    }
  });
}

// Returns true if we already have EOD data for this ticker today
export async function hasTodayPrice(
  db: SQLiteDatabase,
  ticker: string
): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM eod_prices
     WHERE ticker = ? AND date = date('now')`,
    ticker.toUpperCase()
  );
  return (row?.count ?? 0) > 0;
}
