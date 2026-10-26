// Imports the CIQUAL table into the foods table. Usage: npm run import:ciqual [-- path/to/ciqual.xls]
import { readCiqual } from '../ciqual/reader.js';
import { sql } from '../db/client.js';
import { upsertFoods } from '../foods/repository.js';

const foods = await readCiqual(process.argv[2]);
await upsertFoods(foods);
console.log(`imported ${foods.length} CIQUAL foods`);
await sql.end();
