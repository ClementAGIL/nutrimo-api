// Imports French products from the Open Food Facts CSV export (tab-separated, gzipped, ~1 GB).
// Usage: npm run import:off [-- path/to/products.csv(.gz)] — without a path it streams the latest export.
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { createGunzip } from 'node:zlib';
import { parse } from 'csv-parse';
import { CONFIG } from '../config.js';
import { sql } from '../db/client.js';
import type { Food } from '../foods/food.js';
import { upsertFoods } from '../foods/repository.js';
import { mapOffRecord, type OffRecord } from '../off/mapper.js';

const EXPORT_URL = 'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz';
const COUNTRY = 'en:france';
const BATCH = 2000;
const LOG_EVERY = 200_000;

async function open(path: string | undefined): Promise<NodeJS.ReadableStream> {
  if (path) {
    const file = createReadStream(path);
    return path.endsWith('.gz') ? file.pipe(createGunzip()) : file;
  }
  const res = await fetch(EXPORT_URL, { headers: { 'User-Agent': CONFIG.offUserAgent } });
  if (!res.ok || !res.body) throw new Error(`download failed: HTTP ${res.status}`);
  return Readable.fromWeb(res.body as ReadableStream).pipe(createGunzip());
}

async function importOff(path: string | undefined): Promise<void> {
  // OFF does not escape quotes in this export, so quoting must be disabled.
  const rows = (await open(path)).pipe(
    parse({ delimiter: '\t', columns: true, quote: false, relax_column_count: true, skip_records_with_error: true }),
  );
  let seen = 0;
  let kept = 0;
  let batch: Food[] = [];
  for await (const row of rows as AsyncIterable<OffRecord>) {
    if (++seen % LOG_EVERY === 0) console.log(`${seen} rows read, ${kept} kept`);
    const food = String(row.countries_tags ?? '').includes(COUNTRY) ? mapOffRecord(row) : null;
    if (!food) continue;
    batch.push(food);
    kept++;
    if (batch.length >= BATCH) {
      await upsertFoods(batch);
      batch = [];
    }
  }
  await upsertFoods(batch);
  console.log(`done: ${seen} rows read, ${kept} French products imported`);
}

await importOff(process.argv[2]);
await sql.end();
