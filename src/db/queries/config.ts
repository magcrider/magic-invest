import type { SQLiteDatabase } from 'expo-sqlite';
import type { AllocationBands, UserConfig } from '@/db/schema';
import { DEFAULT_ALLOCATION_BANDS } from '@/db/schema';
import type { RiskProfile } from '@/constants/risk-profile';
import { PROFILE_BANDS } from '@/constants/risk-profile';

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

export async function getRiskProfile(
  db: SQLiteDatabase
): Promise<RiskProfile | null> {
  const value = await getConfig(db, 'risk_profile');
  if (!value) return null;
  return JSON.parse(value) as RiskProfile;
}

export async function setRiskProfile(
  db: SQLiteDatabase,
  profile: RiskProfile,
): Promise<void> {
  await setConfig(db, 'risk_profile', profile);
  await setConfig(db, 'allocation_bands', PROFILE_BANDS[profile.label]);
}

export async function resetRiskProfile(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM user_config WHERE key = ?', 'risk_profile');
  await db.runAsync('DELETE FROM user_config WHERE key = ?', 'allocation_bands');
}
