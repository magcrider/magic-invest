import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  InboxEvent,
  InboxEventType,
  InboxEventSubtype,
  AssetType,
} from '@/db/schema';

export async function getUnreadEvents(
  db: SQLiteDatabase
): Promise<InboxEvent[]> {
  return db.getAllAsync<InboxEvent>(
    `SELECT * FROM inbox_events
     WHERE read_at IS NULL AND dismissed_at IS NULL
     ORDER BY created_at DESC`
  );
}

export async function getAllEvents(
  db: SQLiteDatabase,
  limit: number = 50
): Promise<InboxEvent[]> {
  return db.getAllAsync<InboxEvent>(
    `SELECT * FROM inbox_events
     WHERE dismissed_at IS NULL
     ORDER BY created_at DESC
     LIMIT ?`,
    limit
  );
}

export async function getEventsByAsset(
  db: SQLiteDatabase,
  assetRef: string,
  assetType: AssetType
): Promise<InboxEvent[]> {
  return db.getAllAsync<InboxEvent>(
    `SELECT * FROM inbox_events
     WHERE asset_ref = ? AND asset_type = ? AND dismissed_at IS NULL
     ORDER BY created_at DESC`,
    assetRef,
    assetType
  );
}

export async function getUnreadCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM inbox_events
     WHERE read_at IS NULL AND dismissed_at IS NULL`
  );
  return row?.count ?? 0;
}

export interface CreateInboxEventInput {
  type: InboxEventType;
  subtype?: InboxEventSubtype;
  title: string;
  body: string;
  asset_ref?: string;
  asset_type?: AssetType;
  metadata?: Record<string, unknown>;
}

export async function createInboxEvent(
  db: SQLiteDatabase,
  input: CreateInboxEventInput
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO inbox_events
       (type, subtype, title, body, asset_ref, asset_type, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.type,
    input.subtype ?? null,
    input.title,
    input.body,
    input.asset_ref ?? null,
    input.asset_type ?? null,
    input.metadata ? JSON.stringify(input.metadata) : null
  );
  return result.lastInsertRowId;
}

export async function markAsRead(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync(
    `UPDATE inbox_events SET read_at = datetime('now') WHERE id = ?`,
    id
  );
}

export async function markAllAsRead(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    `UPDATE inbox_events SET read_at = datetime('now') WHERE read_at IS NULL`
  );
}

export async function dismissEvent(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync(
    `UPDATE inbox_events SET dismissed_at = datetime('now') WHERE id = ?`,
    id
  );
}
