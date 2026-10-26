// HTTP server entry point: health check, optional API key, food routes.
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { CONFIG } from './config.js';
import { sql } from './db/client.js';
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

app.get('/health', async () => {
  const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from foods`;
  return { status: 'ok', foods: count };
});

await app.register(foodRoutes);
await app.listen({ host: CONFIG.host, port: CONFIG.port });
