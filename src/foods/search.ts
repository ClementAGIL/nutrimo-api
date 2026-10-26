// Accent- and typo-tolerant food search on the trigram index.
import { sql } from '../db/client.js';
import type { Food } from './food.js';
import { FOOD_COLUMNS } from './repository.js';

export interface SearchParams {
  q: string;
  limit: number;
  offset: number;
}

/**
 * Ranking: names starting with the query first, then trigram word similarity. For one-word queries
 * ("pomme", "riz") the generic CIQUAL foods come before branded products; then the most scanned products.
 */
export async function searchFoods({ q, limit, offset }: SearchParams): Promise<Food[]> {
  const singleWord = !q.trim().includes(' ');
  return sql<Food[]>`
    with query as (select f_unaccent(lower(${q.trim()})) as t)
    select ${sql(FOOD_COLUMNS)}
    from foods, query
    where query.t <% foods.search_text or foods.search_text like query.t || '%'
    order by
      (foods.search_text like query.t || '%') desc,
      (${singleWord} and foods.source = 'ciqual') desc,
      round(word_similarity(query.t, foods.search_text)::numeric, 1) desc,
      foods.popularity desc,
      length(foods.name)
    limit ${limit} offset ${offset}`;
}
