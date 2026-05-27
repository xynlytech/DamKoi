// Shared category slugger. Used by the categories API and the hub pages so a
// slug always maps back to the same category string.
export function categorySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
