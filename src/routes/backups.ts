// HTTP routes to store and fetch the app's backups.
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { backupData, listBackups, saveBackup } from '../backups/repository.js';

/** A year of diary + recipes is a few MB; leave room. */
export const BACKUP_BODY_LIMIT = 50 * 1024 * 1024;

const DeviceHeader = z.object({ 'x-device': z.string().trim().min(1).max(64).default('phone') });
const IdParams = z.object({ id: z.coerce.number().int().positive() });

export async function backupRoutes(app: FastifyInstance): Promise<void> {
  // The body is kept as raw text and stored as-is (cast to jsonb), so it is only parsed once to validate it.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string', bodyLimit: BACKUP_BODY_LIMIT },
    (_req, body, done) => done(null, body),
  );

  app.post('/backups', async (req, reply) => {
    const { 'x-device': device } = DeviceHeader.parse(req.headers);
    if (typeof req.body !== 'string' || !isJson(req.body)) return reply.code(400).send({ error: 'invalid_json' });
    return reply.code(201).send(await saveBackup(device, req.body));
  });

  app.get('/backups', async () => ({ items: await listBackups() }));

  app.get('/backups/latest', async (_req, reply) => sendData(reply, await backupData()));

  app.get('/backups/:id', async (req, reply) => sendData(reply, await backupData(IdParams.parse(req.params).id)));
}

function sendData(reply: FastifyReply, data: string | null) {
  if (data === null) return reply.code(404).send({ error: 'not_found' });
  return reply.type('application/json').send(data);
}

function isJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}
