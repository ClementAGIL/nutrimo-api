// Applies the SQL files of migrations/ in name order, each once (tracked in schema_migrations).
import { readdir, readFile } from 'node:fs/promises';
import { sql } from '../db/client.js';

const DIR = new URL('../../migrations/', import.meta.url);

async function migrate(): Promise<void> {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz default now())`;
  const done = new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files.filter((f) => !done.has(f))) {
    const text = await readFile(new URL(file, DIR), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log(`applied ${file}`);
  }
  console.log('migrations up to date');
}

await migrate();
await sql.end();
