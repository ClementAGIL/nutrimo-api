// HTTP server entry point: health check, optional API key, food routes.
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { CONFIG } from './config.js';
import { sql } from './db/client.js';
import { backupRoutes } from './routes/backups.js';
import { foodRoutes } from './routes/foods.js';

const app = Fastify({ logger: { level: 'info' } });

app.addHook('onRequest', async (req, reply) => {
  if (!CONFIG.apiKey || req.url === '/health') return;
  if (req.headers['x-api-key'] !== CONFIG.apiKey) return reply.code(401).send({ error: 'unauthorized' });
});

app.setErrorHandler((error, _req, reply) => {
  if (error instanceof ZodError) return reply.code(400).send({ error: 'bad_request', issues: error.issues });
  app.log.error(error);
  return reply.code(500).send({ error: 'internal' });
});

// The planner's row estimate is instant, unlike count(*) on ~800k rows; the app calls this to test the server.
app.get('/health', async () => {
  const [{ count }] = await sql<
    { count: number }[]
  >`select reltuples::int as count from pg_class where relname = 'foods'`;
  return { status: 'ok', foods: count };
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close();
    await sql.end();
    process.exit(0);
  });
}

await app.register(foodRoutes);
await app.register(backupRoutes);
await app.listen({ host: CONFIG.host, port: CONFIG.port });
