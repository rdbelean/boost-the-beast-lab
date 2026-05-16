// Canonical product → expected price (in EUR cents) map.
//
// Single source of truth shared between:
//   - app/api/create-checkout/route.ts (creates the Checkout Session)
//   - app/api/stripe/webhook/route.ts  (validates session.amount_total
//     matches the expected price, flags suspicious otherwise)
//
// Prices are uniform across locales (DE/EN/IT/TR) — the user confirmed
// EUR across all locales. Only update this file when ALL locales agree
// on the new price; otherwise we get amount-mismatch alerts on the
// webhook for every legitimate purchase.

export const PRODUCT_PRICES_CENTS: Record<string, number> = {
  metabolic: 2900,
  recovery: 2900,
  "complete-analysis": 3990,
  "plan-metabolic": 2499,
  "plan-recovery": 2499,
  "plan-activity": 2499,
  "plan-stress": 2499,
  "bundle-all": 4999,
};

export type ProductId = keyof typeof PRODUCT_PRICES_CENTS;

/** Returns the expected price in cents for a productId, or null if the
 *  id is not in our catalog. The webhook treats null as "unknown product
 *  — flag as suspicious" rather than letting the payment unlock content. */
export function expectedPriceCents(productId: string | null | undefined): number | null {
  if (!productId) return null;
  const price = PRODUCT_PRICES_CENTS[productId];
  return typeof price === "number" ? price : null;
}
