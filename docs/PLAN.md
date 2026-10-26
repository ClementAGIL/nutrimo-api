# Nutrimo — weight-loss app (Android Kotlin) + food API (Node)

## Context

New project, separate from `E:\Repos\Games`. The user wants a French weight-loss app:
calorie counter backed by a free French food database, recipes with per-part nutrition, a weight goal that
recommends a calorie deficit, weight tracking with dashboard / history / graph (actual, objective, trend + estimated
end date). All personal data stays on the phone. A Node backend running on the user's PC only serves food search.
This plan is meant to be executed autonomously afterwards.

Decisions taken with the user:
- Food data: **Open Food Facts** (France only, products with a name + kcal) + **CIQUAL** (ANSES generic foods), both
  imported into **PostgreSQL 17 (native Windows install)** on the PC. CIQUAL is also **bundled in the app** (offline).
- Phone keeps a **cache of used foods** + custom foods + recipes. Search order: local → PC backend (home Wi-Fi) →
  public OFF API fallback when the PC is unreachable.
- UI **French only**, Material 3, light/dark + dynamic colors. **minSdk 31**, compile/target 36.
- Barcode scan in v1. Grams + portions. 4 meals. Kcal + macros on main screen, full nutrients on tap.
- Custom food mandatory fields (per 100 g): name, kcal, fat, saturated fat, carbs, sugars, protein, salt.
  Optional: fiber, brand, barcode, vitamins/minerals.
- Recipes: ingredients from food search, sub-recipes allowed, number of parts, optional cooked weight, log by part or by grams.
- Calorie target from profile (Mifflin-St Jeor × activity) − deficit; warning + floor (1200 F / 1500 M).
- Goal: pick a pace (0.5 / 1 / 2 kg/week or custom) → end date computed, OR pick a date → pace computed. Past goals archived.
- One weigh-in per day (replace with confirmation). Trend = linear regression over the current goal's weigh-ins.
- Extras: favorites/recents + copy yesterday's meal, water tracking, body measurements, weigh-in and meal reminders.
- Backup v1: JSON export/import. Data model is sync-ready (UUIDs, `updatedAt`, soft delete) for a future backup API.
- Two repos, **local git only** for now: `E:\Repos\nutrimo-api` and `E:\Repos\nutrimo-android`.

Environment found: JDK 17, Node 22.14, Android SDK (platforms 34–37, build-tools 34–36). No Docker, no `gh`,
no PostgreSQL yet (user installs PostgreSQL 17 via the Windows installer).

---

## Repo 1 — `E:\Repos\nutrimo-api`

**Stack:** Node 22 + TypeScript (strict, ESM), Fastify 5, `postgres` (porsager) with plain SQL migrations, Zod,
`csv-parse` (streaming), `xlsx` or XML parser for CIQUAL, Vitest. `.env` (`DATABASE_URL`, `PORT=3000`,
`HOST=0.0.0.0`, optional `API_KEY`). `docker-compose.yml` included for later, unused now.

**Schema (`migrations/001_init.sql`):** extensions `pg_trgm`, `unaccent`.
`foods(id text pk -- 'off:<barcode>' | 'ciqual:<code>', source, name, brand, barcode, serving_label, serving_g,
kcal, fat, sat_fat, carbs, sugars, fiber, protein, salt -- all per 100 g, micros jsonb -- {"vitamin_c": {"v":12,"u":"mg"}},
popularity int, search_text text, updated_at)`. Indexes: GIN trigram on `search_text` (immutable unaccent wrapper,
lower(name + brand)), btree on `barcode`.

**Scripts:**
- `npm run db:migrate`
- `npm run import:ciqual`: download the CIQUAL table (data.gouv.fr / ciqual.anses.fr), map ~3,000 foods, upsert.
- `npm run import:off`: stream-download `openfoodfacts.org.products.csv.gz`, filter `countries_tags ∋ en:france`
  plus name and kcal present. Convert OFF `_100g` micros (grams) to mg/µg and kJ to kcal when needed. Batch upsert
  through a staging table. Re-runnable (weekly refresh).
- `npm run export:ciqual-json`: writes `ciqual_foods.json` for the Android assets.

**Endpoints:** `GET /health` · `GET /foods/search?q=&limit=30&offset=` (accent/typo tolerant, ranks by prefix match,
then trigram similarity, then popularity; CIQUAL boosted for one-word generic queries) · `GET /foods/barcode/:code`
(on a DB miss, live lookup on the OFF API v2, then upsert) · `GET /foods/:id`. Same JSON `FoodDto` everywhere.
Optional `X-Api-Key` header.

**Layout:** `src/server.ts`, `src/routes/foods.ts`, `src/db/{client,migrate}.ts`, `src/foods/{repository,search,dto}.ts`,
`src/import/{off,ciqual,units,offApi}.ts`, `test/*.test.ts`. README: PostgreSQL install, Windows firewall rule
for port 3000, import commands, OFF/CIQUAL licences (ODbL / Licence Ouverte). CLAUDE.md with the same code rules
as the Games repo (short files/functions, constants on top, why-comments, no `any`).

---

## Repo 2 — `E:\Repos\nutrimo-android` (package `com.clement.nutrimo`)

**Stack:** Kotlin 2.x, AGP 8.x (JDK 17), version catalog, Jetpack Compose + Material 3, Navigation Compose
(type-safe routes), Hilt, Room (KSP), DataStore (settings), Retrofit + OkHttp + kotlinx.serialization,
CameraX + ML Kit barcode (bundled model), Vico (charts), WorkManager (reminders), JUnit + Turbine for tests.
Single `app` module, packages by layer then feature: `data/` (db, network, repository), `domain/` (pure Kotlin
calculations + models), `ui/<feature>/` (Screen + ViewModel with `StateFlow<UiState>`), `ui/theme`.

### Local data (Room), all ids UUID strings + `createdAt/updatedAt/deletedAt`
- `Profile` (single row): sex, birthDate, heightCm, activityLevel, waterGoalMl.
- `Food`: id (`off:`, `ciqual:`, `custom:<uuid>`), source, name, brand, barcode, `Nutrients` embedded (per 100 g,
  micros as JSON via TypeConverter), isFavorite, lastUsedAt, useCount. Holds cache + CIQUAL seed + custom foods.
- `FoodPortion(foodId, label, grams)`: from OFF serving size or user-defined.
- `Recipe(name, parts, cookedWeightG?, isFavorite)`, `RecipeIngredient(recipeId, foodId? | subRecipeId?, grams | parts)`.
  Cycle check when adding a sub-recipe.
- `DiaryEntry(date, meal: BREAKFAST/LUNCH/DINNER/SNACK, foodId? | recipeId?, label, quantity, unit: G/PART/PORTION,
  nutrients snapshot)`. The snapshot keeps past days stable if a recipe/food is edited later.
- `WeightEntry(date unique, weightKg)`, `Measurement(date, waist, hips, chest, arm, thigh — all nullable)`,
  `WaterEntry(date, ml)`.
- `Goal(startDate, startWeight, targetWeight, mode: PACE/DATE, paceKgPerWeek, endDate, status ACTIVE/ACHIEVED/ARCHIVED)`.
- DataStore: server URL (+ API key), reminders config, onboarding done.
- CIQUAL seeded from `assets/ciqual_foods.json` on first launch (and on version bump).

### Domain calculations (`domain/calc/`, unit-tested)
- `Nutrition`: scale per-100 g to quantity; sum; recipe total → per part (`/parts`) and per 100 g (`/cookedWeight`,
  or the raw ingredient weight if none).
- `Energy`: Mifflin-St Jeor BMR (10w + 6.25h − 5a + 5 / −161), TDEE = BMR × {1.2, 1.375, 1.55, 1.725, 1.9};
  deficit/day = pace × 7700 / 7; target = max(TDEE − deficit, floor 1200 F / 1500 M). Warnings: floor applied
  (show the effective pace), pace > 1 % body weight/week. Recomputed from the latest weigh-in.
- `GoalMath`: pace ↔ end date conversion; weight progress = (start − current)/(start − target); time progress =
  elapsed/total days; average loss per week; required pace for the remaining time.
- `Trend`: least-squares regression over (days since goal start, weight). Needs ≥ 3 points, and slope < 0 to give
  an estimated end date (intersection with target); otherwise "pas de tendance à la baisse".
- `Bmi`: w/h² + WHO category label.

### Food search & barcode (`data/repository/FoodRepository`)
- Typed query (debounced 300 ms) → Room results (cache, CIQUAL, custom, recipes) shown immediately.
- In parallel: backend `/foods/search` (2.5 s timeout). On failure (not on home Wi-Fi / PC off): fall back to OFF
  search API — only on explicit submit, with a proper `User-Agent`, to respect OFF rate limits. Results merged and
  deduped by id, with a source badge (CIQUAL / OFF / Perso / Recette).
- When a remote food is selected, it is upserted into Room (cache) with its portions.
- Barcode: Room → backend → OFF API v2 → "Produit inconnu" → custom food form prefilled with the barcode.
- `network_security_config` allows cleartext to the LAN backend. Settings has a "Tester la connexion" button.

### Screens (bottom nav: Journal · Poids · Recettes · Plus)
- **Onboarding:** profile → current weight → first goal.
- **Journal:** date switcher, kcal ring (eaten / target / remaining), protein/carbs/fat bars, 4 meal sections with
  subtotal, add button per meal, swipe to delete, tap to edit quantity; "Copier depuis hier" per meal; water card
  (+250 ml buttons, daily goal); tap summary → **Détail nutriments** (sugars, fiber, salt, vitamins, minerals).
- **Ajouter un aliment:** search bar + scan button; tabs Récents / Favoris / Mes aliments / Recettes; food detail
  with quantity, unit chooser (g / portions / parts), meal, live nutrient preview, favorite toggle.
- **Aliment perso:** create/edit form with validation of the mandatory fields; optional micros section; portions.
- **Poids**, three tabs: **Tableau de bord** (weight-goal progress bar, time progress bar; stats: start, current,
  target, lost, remaining, BMI + category, average loss/week, required pace, target kcal, estimated end date vs goal
  date) · **Historique** (list with delta from the previous entry, add/edit/delete, measurements) · **Graphique**
  (actual weight line, objective line start→end, regression line projected to the estimated end date, target
  marker; period filter 1M/3M/6M/Tout).
- **Objectif:** pace presets 0.5/1/2 kg + custom, or a date picker; live preview of TDEE, deficit, target kcal,
  warnings; list of archived goals. Reaching the target → prompt to mark the goal achieved.
- **Recettes:** list, editor (name, parts, optional cooked weight, ingredients via the same search incl. sub-recipes),
  detail per part and per 100 g, "Ajouter au journal".
- **Plus:** Profil, Objectifs, Mensurations, Rappels (weekly weigh-in day/time, meal reminder if nothing logged
  by HH:MM — WorkManager + POST_NOTIFICATIONS), Serveur (URL, API key, test), Export/Import JSON (SAF file picker,
  versioned format), À propos (OFF ODbL + CIQUAL attribution).

### Docs
README (build, install, backend URL setup) + CLAUDE.md (architecture, conventions as in the Games repo: short files
< ~300 lines, short functions, no duplication, why-comments, constants on top).

---

## Build order (autonomous execution)
1. API: scaffold, migrations, CIQUAL import, search + id endpoints, tests.
2. API: OFF import, barcode endpoint with OFF live fallback, `export:ciqual-json`.
3. Android: Gradle setup, theme, navigation shell, Room schema, DataStore, Hilt, onboarding + profile.
4. Weight: entries, goal + energy math, dashboard, history, graph (+ domain unit tests).
5. Foods: CIQUAL seed, search pipeline, barcode scan, custom food, journal + nutrient detail, favorites/recents/copy.
6. Recipes (incl. sub-recipes, cooked weight) + logging.
7. Water, measurements, reminders, export/import, settings/server test.
8. Polish (empty states, dark mode check), READMEs, CLAUDE.md, initial git commit in both repos.

## Verification
- API: `npm run check` (tsc + prettier) and `npm test` (Vitest: unit conversions, CSV row mapping, search ranking
  against a test DB); after the imports, `curl "http://localhost:3000/foods/search?q=yaourt%20nature"`,
  `curl http://localhost:3000/foods/barcode/3017620422003` (Nutella), and from the phone using the PC's LAN IP.
- Android: `gradlew test` (domain: BMR/TDEE, floor, pace↔date, regression, recipe per part/per 100 g, nutrient scaling),
  `gradlew assembleDebug`, `adb install -r app/build/outputs/apk/debug/app-debug.apk`.
- Manual run on the phone: onboarding → add weigh-ins over several dates → dashboard/graph lines and estimated date;
  search with PC on (backend results) and with Wi-Fi off (CIQUAL + cache + OFF fallback); scan a barcode; create a
  custom food; build a recipe with a sub-recipe and log 1.5 parts; check the reminder notification; export, wipe
  app data, import → everything restored.

---

## Phase 2 — review + top 5 features (done 2026-10-27)

Review: API search moved to GiST KNN candidates + CIQUAL (15–400 ms instead of 1–4 s), LIKE escaping, bounded OFF
values, cheap /health, graceful shutdown; app: shared ScrollColumn/SectionCard, lint fixes, Android 12/13
notification permission handling, fixes found while testing on the phone (onboarding back, layout).
Developer section (Plus → Développeur): demo history / erase all (asked by the user).

1. ✅ Server backup: POST/GET /backups on nutrimo-api; manual push/restore + daily automatic backup on Wi-Fi.
2. ✅ Calorie history: 7/30-day bars vs target, averages, days on target, estimated loss.
3. ✅ Saved meals: save a journal meal, re-add it in one tap (DB v2).
4. ✅ Physical activity: MET-based or manual kcal, added to the day's budget (DB v3).
5. ✅ Custom macro targets: presets or custom %, used by the journal bars.

Ideas for later: adaptive TDEE from intake vs weight trend, home-screen widget for quick weigh-in, OFF product
photos, sync of several devices through the server, export to CSV.
