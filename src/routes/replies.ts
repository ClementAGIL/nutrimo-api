// Error replies shared by the routes, so every endpoint answers with the same JSON shape.
import type { FastifyReply } from 'fastify';

export const notFound = (reply: FastifyReply) => reply.code(404).send({ error: 'not_found' });
