/**
 * Single source of truth for "can this user access this county?"
 *
 * Role-first: HR and ADMIN are global tenants and pass without consulting the list.
 * COUNTY_REP must have the slug in their countySlugs claim. Anything else (candidate
 * with null role, or unknown role) is denied. An empty list on a COUNTY_REP means "no counties assigned"
 * — never "all counties".
 *
 * Every authorization check that involves a county slug routes through this helper.
 * No ad-hoc `.includes()` calls anywhere else.
 */
export function canAccessCounty(
  role: string,
  countySlugs: string[] | undefined,
  slug: string
): boolean {
  if (role === "HR" || role === "ADMIN") return true;
  if (role !== "COUNTY_REP") return false;
  return Array.isArray(countySlugs) && countySlugs.includes(slug);
}
