// Shared PostgreSQL connection; columns are converted snake_case <-> camelCase automatically.
import postgres from 'postgres';
import { CONFIG } from '../config.js';

export const sql = postgres(CONFIG.databaseUrl, { transform: postgres.camel, onnotice: () => {} });
