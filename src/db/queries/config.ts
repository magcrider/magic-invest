import type { SQLiteDatabase } from 'expo-sqlite';
import type { AllocationBands, UserConfig } from '@/db/schema';
import { DEFAULT_ALLOCATION_BANDS } from '@/db/schema';

export async function getConfig(
  db: SQLiteDatabase,
  key: string
): Promise<string | null> {
  const row = await db.getFirstAsync<UserConfig>(
    'SELECT value FROM user_config WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setConfig(
  db: SQLiteDatabase,
  key: string,
  value: unknown
): Promise<void> {
  const json = JSON.stringify(value);
  await db.runAsync(
    `INSERT INTO user_config (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    json
  );
}

export async function isOnboardingComplete(db: SQLiteDatabase): Promise<boolean> {
  const value = await getConfig(db, 'onboarding_completed');
  return value === '"true"';
}

export async function completeOnboarding(db: SQLiteDatabase): Promise<void> {
  await setConfig(db, 'onboarding_completed', true);
}

export async function getAllocationBands(
  db: SQLiteDatabase
): Promise<AllocationBands> {
  const value = await getConfig(db, 'allocation_bands');
  if (!value) return DEFAULT_ALLOCATION_BANDS;
  return JSON.parse(value) as AllocationBands;
}

export async function setAllocationBands(
  db: SQLiteDatabase,
  bands: AllocationBands
): Promise<void> {
  await setConfig(db, 'allocation_bands', bands);
}
