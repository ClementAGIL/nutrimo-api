// Database access for foods: batched upsert and lookups.
import { sql } from '../db/client.js';
import type { Food } from './food.js';

/** Food fields in API order; postgres.camel maps them to the snake_case columns. */
export const FOOD_COLUMNS = [
  'id',
  'source',
  'name',
  'brand',
  'barcode',
  'servingLabel',
  'servingG',
  'kcal',
  'fat',
  'satFat',
  'carbs',
  'sugars',
  'fiber',
  'protein',
  'salt',
  'micros',
  'popularity',
] as const;

const BATCH_SIZE = 1000;
const snake = (c: string) => c.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const UPDATE_SET = FOOD_COLUMNS.filter((c) => c !== 'id')
  .map((c) => `${snake(c)} = excluded.${snake(c)}`)
  .concat('updated_at = now()')
  .join(', ');

/** Inserts or replaces foods by id. Duplicated ids in the input keep the last one. */
export async function upsertFoods(foods: Food[]): Promise<void> {
  const unique = [...new Map(foods.map((f) => [f.id, f])).values()];
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const rows = unique.slice(i, i + BATCH_SIZE).map((f) => ({ ...f, micros: sql.json(f.micros) }));
    await sql`insert into foods ${sql(rows, ...FOOD_COLUMNS)}
      on conflict (id) do update set ${sql.unsafe(UPDATE_SET)}`;
  }
}

export async function findFoodById(id: string): Promise<Food | null> {
  const [food] = await sql<Food[]>`select ${sql(FOOD_COLUMNS)} from foods where id = ${id}`;
  return food ?? null;
}

export async function findFoodByBarcode(barcode: string): Promise<Food | null> {
  const [food] = await sql<Food[]>`select ${sql(FOOD_COLUMNS)} from foods where barcode = ${barcode} limit 1`;
  return food ?? null;
}
