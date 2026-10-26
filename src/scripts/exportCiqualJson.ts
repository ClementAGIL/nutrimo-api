// Writes CIQUAL as compact JSON for the Android app assets (no database needed).
// Usage: npm run export:ciqual-json [-- output.json] — default out/ciqual_foods.json
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { readCiqual } from '../ciqual/reader.js';

const output = process.argv[2] ?? 'out/ciqual_foods.json';
const foods = await readCiqual();
// Drop nulls and server-only fields to keep the APK small.
const compact = foods.map(({ popularity: _p, brand: _b, barcode: _c, servingLabel: _l, servingG: _g, ...food }) =>
  Object.fromEntries(Object.entries(food).filter(([, v]) => v !== null)),
);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(compact));
console.log(`wrote ${compact.length} foods to ${output}`);
