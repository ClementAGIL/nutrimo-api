// Runtime configuration read from the environment (.env is loaded when present).
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the real environment.
}

export const CONFIG = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/nutrimo',
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 3000),
  apiKey: process.env.API_KEY || null,
  /** Open Food Facts asks every client to identify itself. */
  offUserAgent: 'Nutrimo/0.1 (personal project)',
};
