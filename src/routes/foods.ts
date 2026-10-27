// HTTP routes for food search and lookups (all responses use the Food JSON shape).
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { findFoodByBarcode, findFoodById, upsertFoods } from '../foods/repository.js';
import { searchFoods } from '../foods/search.js';
import { fetchOffProduct } from '../off/api.js';
import { notFound } from './replies.js';

const SearchQuery = z.object({
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).max(1000).default(0),
});
const BarcodeParams = z.object({ code: z.string().regex(/^\d{6,14}$/) });
const IdParams = z.object({ id: z.string().min(1).max(64) });

export async function foodRoutes(app: FastifyInstance): Promise<void> {
  app.get('/foods/search', async (req) => ({ items: await searchFoods(SearchQuery.parse(req.query)) }));

  app.get('/foods/barcode/:code', async (req, reply) => {
    const { code } = BarcodeParams.parse(req.params);
    const food = (await findFoodByBarcode(code)) ?? (await fetchAndStore(code));
    return food ?? notFound(reply);
  });

  app.get('/foods/:id', async (req, reply) => {
    const food = await findFoodById(IdParams.parse(req.params).id);
    return food ?? notFound(reply);
  });
}

/** Products newer than the last OFF import are fetched live once, then served from the database. */
async function fetchAndStore(code: string) {
  const food = await fetchOffProduct(code);
  if (food) await upsertFoods([food]);
  return food;
}
