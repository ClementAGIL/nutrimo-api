# CLAUDE.md

Guidance for Claude (and any contributor) working in this repository. `AGENTS.md` points here.

## What this project is

Read-only food search API for the Nutrimo Android app (`../nutrimo-android`). French foods from CIQUAL (generic) and
Open Food Facts (France, packaged) are imported into PostgreSQL (17+, runs on 18.6 here); the app searches them over the home LAN.
User data lives on the phone; this server only keeps copies of its JSON backups (table `backups`). The full product plan is in `docs/PLAN.md`.

## Stack

Node 22, TypeScript strict (ESM, run with `tsx`, no build step), Fastify 5, `postgres` (porsager) with
`transform: postgres.camel`, Zod for request validation, `csv-parse` (OFF export), `xlsx` (CIQUAL file).
No tests for now (decided with the user); verify by running the scripts and `curl`.

## Commands

See README. Before a commit: `npm run format` then `npm run check`.

## Architecture

```
migrations/            plain SQL, applied in name order by src/scripts/migrate.ts
data/                  CIQUAL 2020 Excel file (the ANSES site is often down)
src/config.ts          env (.env via process.loadEnvFile)
src/db/client.ts       the shared `sql` connection
src/foods/food.ts      Food type = DB row = JSON response
src/foods/nutrients.ts nutrient catalogue (MACROS, MICROS with OFF key + CIQUAL header + unit), parseAmount,
                       buildNutrients (shared by both importers)
src/foods/repository.ts upsertFoods (batched), findFoodById, findFoodByBarcode
src/foods/search.ts    search: 400 nearest names via the GiST trigram index (KNN `<<->`) ∪ matching CIQUAL rows,
                       then ranked (prefix, CIQUAL for one word, similarity, popularity)
src/ciqual/reader.ts   CIQUAL Excel → Food[]
src/off/mapper.ts      OFF record (CSV row or API product) → Food
src/off/api.ts         live OFF product lookup (barcode fallback)
src/routes/foods.ts    food HTTP routes
src/routes/backups.ts  backup routes (raw JSON body up to 50 MB, own content-type parser scoped to the plugin)
src/backups/repository.ts save (keeps 30 per device) / list / fetch backups
src/scripts/           migrate, importCiqual, importOff, exportCiqualJson
```

## Conventions

- OFF data is dirty: keep every imported value bounded (see `MAX_*` in `nutrients.ts`, `MAX_SERVING_G`).
- Food ids: `ciqual:<alim_code>`, `off:<barcode>`. All nutrients per 100 g; micros in the unit of `MICROS`.
  The Android app mirrors this shape (`FoodDto`) — change both repos together.
- Adding a nutrient: one line in `MACROS`/`MICROS` (+ a migration for a macro column).
- Short files (< ~300 lines), short functions (< ~40 lines), one job each. No duplicated logic.
- Constants in `UPPER_SNAKE_CASE` at the top of the file. Comments explain why. No `any`.
- Every file starts with a one-line comment saying what it is for.
- Every commit updates this file and the README when behavior or structure changes.

## Status

- ✅ Backups: POST/GET `/backups`, used by the app's manual and daily automatic backup.
- ✅ Schema, migrations, CIQUAL + OFF importers, search / barcode / id endpoints, CIQUAL JSON export.
- ✅ Running on the dev PC (PostgreSQL 18.6, service `postgresql-x64-18`, `D:\PostgreSQL`): ~2,300 CIQUAL +
  ~750k French OFF products, ~360 MB. Out-of-range OFF values (typos like 10^47 g of fat) are dropped by
  `buildNutrients` bounds. Search takes 15–400 ms on the full data (was 1–4 s with a GIN index + full sort).
