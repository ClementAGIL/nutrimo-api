// Storage of the app's JSON backups, keeping only the most recent ones per device.
import { sql } from '../db/client.js';

/** Daily automatic backups: one month of history per device is plenty. */
const KEEP_PER_DEVICE = 30;

export interface BackupInfo {
  id: number;
  device: string;
  createdAt: Date;
  size: number;
}

export async function saveBackup(device: string, json: string): Promise<BackupInfo> {
  const [info] = await sql<BackupInfo[]>`
    insert into backups (device, size, data) values (${device}, ${json.length}, ${json}::text::jsonb)
    returning id, device, created_at, size`;
  await sql`delete from backups where device = ${device} and id not in (
    select id from backups where device = ${device} order by created_at desc limit ${KEEP_PER_DEVICE})`;
  return info;
}

export async function listBackups(): Promise<BackupInfo[]> {
  return sql<BackupInfo[]>`select id, device, created_at, size from backups order by created_at desc limit 100`;
}

/** The backup JSON as stored, or null. Without [id], the most recent one. */
export async function backupData(id?: number): Promise<string | null> {
  const [row] = id
    ? await sql<{ data: string }[]>`select data::text as data from backups where id = ${id}`
    : await sql<{ data: string }[]>`select data::text as data from backups order by created_at desc limit 1`;
  return row?.data ?? null;
}
