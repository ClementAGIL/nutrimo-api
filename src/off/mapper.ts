// Maps an Open Food Facts product (CSV export row or API product) to a Food.
import type { Food } from '../foods/food.js';
import { buildNutrients, parseAmount, type MicroDef } from '../foods/nutrients.js';

/** OFF stores vitamins and minerals in grams per 100 g. */
const GRAMS_TO_UNIT: Record<MicroDef['unit'], number> = { mg: 1e3, µg: 1e6 };
const KJ_PER_KCAL = 4.184;
const MAX_NAME_LENGTH = 200;

/** Flat record: CSV columns, or an API product merged with its `nutriments` object. */
export type OffRecord = Record<string, unknown>;

export function mapOffRecord(r: OffRecord): Food | null {
  const code = text(r.code);
  const name = text(r.product_name_fr) ?? text(r.product_name);
  if (!code || !/^\d{6,14}$/.test(code) || !name) return null;
  const nutrients = buildNutrients(
    (def) => (def.key === 'kcal' ? kcal(r) : parseAmount(r[def.off])),
    (def) => scale(parseAmount(r[def.off]), GRAMS_TO_UNIT[def.unit]),
  );
  if (!nutrients) return null;
  const servingG = parseAmount(r.serving_quantity);
  return {
    id: `off:${code}`,
    source: 'off',
    name: name.slice(0, MAX_NAME_LENGTH),
    brand: text(r.brands)?.split(',')[0].trim() || null,
    barcode: code,
    servingLabel: text(r.serving_size),
    servingG: servingG && servingG > 0 ? servingG : null,
    ...nutrients,
    popularity: Math.trunc(parseAmount(r.unique_scans_n) ?? 0),
  };
}

function kcal(r: OffRecord): number | null {
  return parseAmount(r['energy-kcal_100g']) ?? scale(parseAmount(r.energy_100g), 1 / KJ_PER_KCAL);
}

function scale(v: number | null, factor: number): number | null {
  return v === null ? null : v * factor;
}

function text(v: unknown): string | null {
  if (typeof v === 'number') return String(v);
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}
