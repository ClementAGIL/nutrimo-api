// Live lookup on the public Open Food Facts API, for barcodes missing from the local import.
import { CONFIG } from '../config.js';
import type { Food } from '../foods/food.js';
import { mapOffRecord } from './mapper.js';

const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product/';
const TIMEOUT_MS = 5000;

interface OffProductResponse {
  status?: number;
  product?: Record<string, unknown> & { nutriments?: Record<string, unknown> };
}

/** Returns null when OFF does not know the product, is unreachable or the product has no kcal. */
export async function fetchOffProduct(barcode: string): Promise<Food | null> {
  try {
    const res = await fetch(`${PRODUCT_URL}${barcode}.json`, {
      headers: { 'User-Agent': CONFIG.offUserAgent },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as OffProductResponse;
    if (body.status !== 1 || !body.product) return null;
    return mapOffRecord({ ...body.product, ...body.product.nutriments, code: barcode });
  } catch {
    return null;
  }
}
