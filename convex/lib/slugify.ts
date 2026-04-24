/** URL/logical segment for taxonomy; unique per (shop, parent). */
export function slugifyTaxonomySegment(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "kategori";
}
