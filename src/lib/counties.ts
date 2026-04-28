export const COUNTY_SLUGS = ["franklin", "cobb"] as const;
export type CountySlug = (typeof COUNTY_SLUGS)[number];

export interface CountyConfig {
  slug: CountySlug;
  displayName: string;
  sheriffOfficeName: string;
  sheriffOfficeAddress: string;
  ccwLocation: string;
  emailFooterName: string;
}

export const COUNTIES: Record<CountySlug, CountyConfig> = {
  franklin: {
    slug: "franklin",
    displayName: "Franklin County",
    sheriffOfficeName: "Franklin County Sheriff's Office",
    sheriffOfficeAddress: "Columbus, OH",
    ccwLocation: "Franklin County CCW Office",
    emailFooterName: "Franklin County Background Screening Portal",
  },
  cobb: {
    slug: "cobb",
    displayName: "Cobb County",
    sheriffOfficeName: "Cobb County Sheriff's Office",
    sheriffOfficeAddress: "Marietta, GA",
    ccwLocation: "Cobb County CCW Office",
    emailFooterName: "Cobb County Background Screening Portal",
  },
};

export const COUNTY_DISPLAY_NAMES: Record<CountySlug, string> = {
  franklin: COUNTIES.franklin.displayName,
  cobb: COUNTIES.cobb.displayName,
};

export function isValidCountySlug(slug: string): slug is CountySlug {
  return (COUNTY_SLUGS as readonly string[]).includes(slug);
}

/** Narrow a DB-stored slug (typed as plain string) to CountySlug, or null if unknown/missing. */
export function toCountySlug(slug: string | null | undefined): CountySlug | null {
  if (!slug || !isValidCountySlug(slug)) return null;
  return slug;
}

export function getCounty(slug: CountySlug): CountyConfig {
  return COUNTIES[slug];
}

const GENERIC_EMAIL_FOOTER = "Armor Health Background Screening Portal";

export function getEmailFooter(slug: CountySlug | null | undefined): string {
  if (!slug || !isValidCountySlug(slug)) return GENERIC_EMAIL_FOOTER;
  return COUNTIES[slug].emailFooterName;
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
