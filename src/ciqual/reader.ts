// Reads the ANSES CIQUAL table (Excel export, French headers) into Food rows.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import type { Food } from '../foods/food.js';
import { buildNutrients, parseAmount } from '../foods/nutrients.js';

/** CIQUAL 2020, French version, stored in the repo because the ANSES site is often in maintenance. */
export const DEFAULT_CIQUAL_FILE = fileURLToPath(new URL('../../data/ciqual_2020_fr.xls', import.meta.url));

type Row = Record<string, unknown>;

export async function readCiqual(path = DEFAULT_CIQUAL_FILE): Promise<Food[]> {
  const book = XLSX.read(await readFile(path));
  const sheet = book.Sheets[book.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { raw: false, defval: null });
  return rows.map(toFood).filter((f): f is Food => f !== null);
}

function toFood(row: Row): Food | null {
  const code = row.alim_code;
  const name = typeof row.alim_nom_fr === 'string' ? row.alim_nom_fr.trim() : '';
  if (code === null || code === undefined || name === '') return null;
  const nutrients = buildNutrients(
    (def) => def.ciqual.map((h) => parseAmount(row[h])).find((v) => v !== null) ?? null,
    (def) => parseAmount(row[def.ciqual]),
  );
  if (!nutrients) return null;
  return {
    id: `ciqual:${code}`,
    source: 'ciqual',
    name,
    brand: null,
    barcode: null,
    servingLabel: null,
    servingG: null,
    ...nutrients,
    popularity: 0,
  };
}
