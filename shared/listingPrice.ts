export function normalizeListingPriceSek(priceSek: number): number {
  if (!Number.isFinite(priceSek)) {
    return 1;
  }

  const rounded = Math.round(Math.abs(priceSek));
  const clamped = Math.max(1, Math.min(1_000_000, rounded));
  if (clamped % 10 === 9) {
    return Math.min(1_000_000, clamped + 1);
  }
  return clamped;
}
