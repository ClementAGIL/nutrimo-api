// The Food shape shared by the database rows, the importers and the JSON API.

export type FoodSource = 'ciqual' | 'off';

export type MacroKey = 'kcal' | 'fat' | 'satFat' | 'carbs' | 'sugars' | 'fiber' | 'protein' | 'salt';

export interface Food {
  id: string;
  source: FoodSource;
  name: string;
  brand: string | null;
  barcode: string | null;
  servingLabel: string | null;
  servingG: number | null;
  /** Nutrient values are per 100 g: kcal, then grams for the macros. */
  kcal: number;
  fat: number | null;
  satFat: number | null;
  carbs: number | null;
  sugars: number | null;
  fiber: number | null;
  protein: number | null;
  salt: number | null;
  /** Vitamins and minerals per 100 g, keyed by MICROS[].key, in that entry's unit. */
  micros: Record<string, number>;
  popularity: number;
}

/** Fields an importer must fill; the nutrients come from buildNutrients(). */
export type FoodBase = Pick<Food, 'id' | 'source' | 'name' | 'brand' | 'barcode' | 'servingLabel' | 'servingG'>;
