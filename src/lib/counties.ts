export const COUNTY_SLUGS = ["franklin", "cobb"] as const;
export type CountySlug = (typeof COUNTY_SLUGS)[number];

export const COUNTY_DISPLAY_NAMES: Record<CountySlug, string> = {
  franklin: "Franklin County",
  cobb: "Cobb County",
};

export function isValidCountySlug(slug: string): slug is CountySlug {
  return (COUNTY_SLUGS as readonly string[]).includes(slug);
}

/**
 * Extract a valid county slug from a URL path. Returns null if the leading
 * segment isn't a known county. Used by client components (Sidebar, Navbar,
 * apiFetch) that need the active county without going through React context.
 */
export function getCountyFromPath(pathname: string): CountySlug | null {
  const match = pathname.match(/^\/([^/?#]+)/);
  const candidate = match?.[1]?.toLowerCase();
  return candidate && isValidCountySlug(candidate) ? candidate : null;
}
