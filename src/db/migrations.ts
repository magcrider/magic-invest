import type { SQLiteDatabase } from 'expo-sqlite';

// Each migration is applied once and tracked in schema_migrations.
// NEVER modify an existing migration — add a new one instead.

const migrations: Record<number, string> = {
  1: `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version   INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cdt_positions (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      bank             TEXT    NOT NULL,
      amount           REAL    NOT NULL,
      rate             REAL    NOT NULL,
      term_days        INTEGER NOT NULL,
      start_date       TEXT    NOT NULL,
      end_date         TEXT    NOT NULL,
      capitalization   TEXT    NOT NULL DEFAULT 'maturity',
      withholding_rate REAL    NOT NULL DEFAULT 0.04,
      notes            TEXT,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS etf_positions (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker           TEXT    NOT NULL,
      name             TEXT    NOT NULL,
      shares           REAL    NOT NULL,
      average_cost_usd REAL    NOT NULL,
      ter              REAL    NOT NULL DEFAULT 0,
      currency         TEXT    NOT NULL DEFAULT 'USD',
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS eod_prices (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker      TEXT NOT NULL,
      date        TEXT NOT NULL,
      close_price REAL NOT NULL,
      currency    TEXT NOT NULL DEFAULT 'USD',
      UNIQUE(ticker, date)
    );

    CREATE TABLE IF NOT EXISTS cdt_rates (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      bank           TEXT NOT NULL,
      term_days      INTEGER NOT NULL,
      rate           REAL NOT NULL,
      effective_date TEXT NOT NULL,
      source         TEXT NOT NULL DEFAULT 'manual',
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS macro_rates (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      type           TEXT NOT NULL,
      value          REAL NOT NULL,
      effective_date TEXT NOT NULL,
      source         TEXT NOT NULL DEFAULT 'manual',
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inbox_events (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      type         TEXT NOT NULL,
      subtype      TEXT,
      title        TEXT NOT NULL,
      body         TEXT NOT NULL,
      asset_ref    TEXT,
      asset_type   TEXT,
      read_at      TEXT,
      dismissed_at TEXT,
      metadata     TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_config (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_eod_prices_ticker_date ON eod_prices(ticker, date);
    CREATE INDEX IF NOT EXISTS idx_cdt_rates_bank_term    ON cdt_rates(bank, term_days);
    CREATE INDEX IF NOT EXISTS idx_macro_rates_type       ON macro_rates(type, effective_date);
    CREATE INDEX IF NOT EXISTS idx_inbox_events_read      ON inbox_events(read_at, created_at);
  `,
};

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC'
  );
  const appliedVersions = new Set(applied.map((r) => r.version));

  for (const [versionStr, sql] of Object.entries(migrations)) {
    const version = Number(versionStr);
    if (appliedVersions.has(version)) continue;

    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.runAsync(
        'INSERT INTO schema_migrations (version) VALUES (?)',
        version
      );
    });
  }
}
