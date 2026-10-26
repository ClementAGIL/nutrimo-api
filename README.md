# nutrimo-api

Food search API for the **Nutrimo** Android app (`../nutrimo-android`). It serves French foods from two open
databases imported into PostgreSQL:

- **CIQUAL 2020** (ANSES): ~2,300 generic foods with complete vitamins and minerals. The Excel file is stored in `data/`.
- **Open Food Facts**: products sold in France (packaged foods, barcodes).

The API only reads foods; every personal data stays on the phone.

## Setup (Windows, once)

1. Install **PostgreSQL 17 or newer** (tested with 18.6) with the Windows installer
   (https://www.postgresql.org/download/windows/), remember the `postgres` password. `psql` does not need to be on
   the PATH (e.g. `D:\PostgreSQL\bin\psql.exe`). Create the database: `psql -U postgres -c "create database nutrimo"`.
2. `npm install`, then copy `.env.example` to `.env` and set `DATABASE_URL`.
3. `npm run db:migrate`
4. `npm run import:ciqual` (seconds)
5. `npm run import:off` (downloads ~1 GB and reads every product; takes a while). Run it again to refresh (weekly is
   plenty). A local file works too: `npm run import:off -- C:\path\products.csv.gz`.
6. `npm start` (or `npm run dev` to reload on change). The server listens on `0.0.0.0:3000`.
7. Let the phone reach the PC on the home Wi-Fi (PowerShell as admin, once):
   `New-NetFirewallRule -DisplayName "Nutrimo API" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private`
   Then set `http://<PC LAN IP>:3000` in the app (Plus → Serveur). `ipconfig` shows the LAN IP.

A `docker-compose.yml` is provided as an alternative to the native PostgreSQL install.

## Endpoints

| Method | Path                              | Notes                                                                   |
| ------ | --------------------------------- | ----------------------------------------------------------------------- |
| GET    | `/health`                         | `{ status, foods }`                                                     |
| GET    | `/foods/search?q=&limit=&offset=` | `{ items: Food[] }`, accent and typo tolerant, `q` ≥ 2 chars            |
| GET    | `/foods/barcode/:code`            | `Food`, or 404. Unknown barcodes are fetched live from OFF, then stored |
| GET    | `/foods/:id`                      | `Food` by id (`ciqual:<code>` or `off:<barcode>`), or 404               |

When `API_KEY` is set in `.env`, every request except `/health` needs the header `X-Api-Key`.

`Food` (all nutrients per 100 g; macros in g; `micros` keys and units are listed in `src/foods/nutrients.ts`):

```json
{
  "id": "off:3017620422003",
  "source": "off",
  "name": "Nutella",
  "brand": "Ferrero",
  "barcode": "3017620422003",
  "servingLabel": "15 g",
  "servingG": 15,
  "kcal": 539,
  "fat": 30.9,
  "satFat": 10.6,
  "carbs": 57.5,
  "sugars": 56.3,
  "fiber": null,
  "protein": 6.3,
  "salt": 0.107,
  "micros": { "calcium": 120 },
  "popularity": 1234
}
```

## Other scripts

- `npm run export:ciqual-json [-- file]`: writes `out/ciqual_foods.json`, bundled in the Android app as
  `app/src/main/assets/ciqual_foods.json` (no database needed).
- `npm run check`: type-check + Prettier check. `npm run format`: format everything.

## Licences

Open Food Facts data: Open Database License (ODbL), https://world.openfoodfacts.org.
CIQUAL: Licence Ouverte / Etalab, ANSES, https://ciqual.anses.fr.
