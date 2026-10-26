// Accent- and typo-tolerant food search: nearest trigram neighbours first, then a finer ranking.
import { sql } from '../db/client.js';
import type { Food } from './food.js';
import { FOOD_COLUMNS } from './repository.js';

/** Closest names fetched through the GiST index before ranking; bounds the work of every search. */
const CANDIDATES = 400;
/** Below this word similarity a candidate is noise (e.g. sharing one trigram). */
const MIN_SIMILARITY = 0.3;
/** Trigrams carry almost no signal under 3 characters: use a plain prefix match instead. */
const MIN_FUZZY_LENGTH = 3;

export interface SearchParams {
  q: string;
  limit: number;
  offset: number;
}

/**
 * Ranking: names starting with the query first; for one-word queries ("pomme", "riz") the generic CIQUAL
 * foods before branded products; then trigram word similarity, the most scanned products, shorter names.
 */
export async function searchFoods({ q, limit, offset }: SearchParams): Promise<Food[]> {
  const text = q.trim();
  const singleWord = !text.includes(' ');
  const prefix = `${escapeLike(text)}%`;
  const query = sql`(select f_unaccent(lower(${text})) as t, f_unaccent(lower(${prefix})) as p) query`;
  const nearest =
    text.length < MIN_FUZZY_LENGTH
      ? sql`select foods.*, 1.0 as sim from foods, ${query} where search_text like p
            order by popularity desc limit ${CANDIDATES}`
      : sql`select foods.*, word_similarity(t, search_text) as sim from foods, ${query}
            order by t <<-> search_text limit ${CANDIDATES}`;
  // Generic foods are few but drown among thousands of equally close products, so they always compete.
  const generic = sql`select foods.*, greatest(word_similarity(t, search_text), (search_text like p)::int) as sim
    from foods, ${query} where source = 'ciqual'`;
  return sql<Food[]>`
    with candidates as ((${nearest}) union (${generic}))
    select ${sql(FOOD_COLUMNS)} from candidates
    where sim >= ${MIN_SIMILARITY}
    order by
      (search_text like f_unaccent(lower(${prefix}))) desc,
      (${singleWord} and source = 'ciqual') desc,
      round(sim::numeric, 1) desc,
      popularity desc,
      length(name)
    limit ${limit} offset ${offset}`;
}

/** % and _ typed by the user are literal characters, not LIKE wildcards. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}
