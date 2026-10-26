// Nutrient catalogue: maps each Food field to its Open Food Facts key and CIQUAL column header.
import type { Food, MacroKey } from './food.js';

export interface MacroDef {
  key: MacroKey;
  off: string;
  /** Candidate CIQUAL headers, first non-empty wins. */
  ciqual: string[];
}

export interface MicroDef {
  key: string;
  unit: 'mg' | 'µg';
  off: string;
  ciqual: string;
}

export const MACROS: MacroDef[] = [
  {
    key: 'kcal',
    off: 'energy-kcal_100g',
    ciqual: [
      'Energie, Règlement UE N° 1169/2011 (kcal/100 g)',
      'Energie, N x facteur Jones, avec fibres  (kcal/100 g)',
    ],
  },
  { key: 'fat', off: 'fat_100g', ciqual: ['Lipides (g/100 g)'] },
  { key: 'satFat', off: 'saturated-fat_100g', ciqual: ['AG saturés (g/100 g)'] },
  { key: 'carbs', off: 'carbohydrates_100g', ciqual: ['Glucides (g/100 g)'] },
  { key: 'sugars', off: 'sugars_100g', ciqual: ['Sucres (g/100 g)'] },
  { key: 'fiber', off: 'fiber_100g', ciqual: ['Fibres alimentaires (g/100 g)'] },
  { key: 'protein', off: 'proteins_100g', ciqual: ['Protéines, N x facteur de Jones (g/100 g)'] },
  { key: 'salt', off: 'salt_100g', ciqual: ['Sel chlorure de sodium (g/100 g)'] },
];

export const MICROS: MicroDef[] = [
  { key: 'calcium', unit: 'mg', off: 'calcium_100g', ciqual: 'Calcium (mg/100 g)' },
  { key: 'iron', unit: 'mg', off: 'iron_100g', ciqual: 'Fer (mg/100 g)' },
  { key: 'magnesium', unit: 'mg', off: 'magnesium_100g', ciqual: 'Magnésium (mg/100 g)' },
  { key: 'potassium', unit: 'mg', off: 'potassium_100g', ciqual: 'Potassium (mg/100 g)' },
  { key: 'phosphorus', unit: 'mg', off: 'phosphorus_100g', ciqual: 'Phosphore (mg/100 g)' },
  { key: 'sodium', unit: 'mg', off: 'sodium_100g', ciqual: 'Sodium (mg/100 g)' },
  { key: 'zinc', unit: 'mg', off: 'zinc_100g', ciqual: 'Zinc (mg/100 g)' },
  { key: 'iodine', unit: 'µg', off: 'iodine_100g', ciqual: 'Iode (µg/100 g)' },
  { key: 'selenium', unit: 'µg', off: 'selenium_100g', ciqual: 'Sélénium (µg/100 g)' },
  { key: 'cholesterol', unit: 'mg', off: 'cholesterol_100g', ciqual: 'Cholestérol (mg/100 g)' },
  { key: 'vitaminA', unit: 'µg', off: 'vitamin-a_100g', ciqual: 'Rétinol (µg/100 g)' },
  { key: 'betaCarotene', unit: 'µg', off: 'beta-carotene_100g', ciqual: 'Beta-Carotène (µg/100 g)' },
  { key: 'vitaminD', unit: 'µg', off: 'vitamin-d_100g', ciqual: 'Vitamine D (µg/100 g)' },
  { key: 'vitaminE', unit: 'mg', off: 'vitamin-e_100g', ciqual: 'Vitamine E (mg/100 g)' },
  { key: 'vitaminK', unit: 'µg', off: 'vitamin-k_100g', ciqual: 'Vitamine K1 (µg/100 g)' },
  { key: 'vitaminC', unit: 'mg', off: 'vitamin-c_100g', ciqual: 'Vitamine C (mg/100 g)' },
  { key: 'vitaminB1', unit: 'mg', off: 'vitamin-b1_100g', ciqual: 'Vitamine B1 ou Thiamine (mg/100 g)' },
  { key: 'vitaminB2', unit: 'mg', off: 'vitamin-b2_100g', ciqual: 'Vitamine B2 ou Riboflavine (mg/100 g)' },
  { key: 'vitaminB3', unit: 'mg', off: 'vitamin-pp_100g', ciqual: 'Vitamine B3 ou PP ou Niacine (mg/100 g)' },
  {
    key: 'vitaminB5',
    unit: 'mg',
    off: 'pantothenic-acid_100g',
    ciqual: 'Vitamine B5 ou Acide pantothénique (mg/100 g)',
  },
  { key: 'vitaminB6', unit: 'mg', off: 'vitamin-b6_100g', ciqual: 'Vitamine B6 (mg/100 g)' },
  { key: 'vitaminB9', unit: 'µg', off: 'vitamin-b9_100g', ciqual: 'Vitamine B9 ou Folates totaux (µg/100 g)' },
  { key: 'vitaminB12', unit: 'µg', off: 'vitamin-b12_100g', ciqual: 'Vitamine B12 (µg/100 g)' },
];

/** Parses '12,5', '12.5', '< 0,5' (→ 0), 'traces' (→ 0); '-', '' and garbage give null. */
export function parseAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  if (text === 'traces' || text.startsWith('<')) return 0;
  const n = Number(text.replace(',', '.'));
  return text === '' || Number.isNaN(n) ? null : n;
}

export type Nutrients = Pick<Food, MacroKey | 'micros'>;

/**
 * Builds the nutrient part of a Food. `macro` / `micro` read one value from the source (already in
 * the catalogue unit). Returns null when kcal is unknown, since such a food is useless for counting.
 */
export function buildNutrients(
  macro: (def: MacroDef) => number | null,
  micro: (def: MicroDef) => number | null,
): Nutrients | null {
  const values = Object.fromEntries(MACROS.map((def) => [def.key, round(macro(def))])) as Record<
    MacroKey,
    number | null
  >;
  if (values.kcal === null || values.kcal < 0 || values.kcal > 950) return null;
  const micros: Record<string, number> = {};
  for (const def of MICROS) {
    const v = round(micro(def));
    if (v !== null && v >= 0) micros[def.key] = v;
  }
  return { ...values, kcal: values.kcal, micros };
}

function round(v: number | null): number | null {
  return v === null ? null : Math.round(v * 1000) / 1000;
}
