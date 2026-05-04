/**
 * Single source of truth for post-login destination.
 * Used by the login + register hooks and the verify-email handler so routing
 * stays consistent and no county slug is hardcoded outside this file.
 */
export interface PostLoginUser {
  role: string;
  approved: boolean;
  emailVerified: boolean;
  countySlugs: string[];
}

export function pickPostLoginDestination(user: PostLoginUser): string {
  if (!user.emailVerified) return "/verify-email";
  if (user.role === "HR" && !user.approved) return "/pending-approval";

  // COUNTY_REP with exactly one county skips the dashboard.
  if (user.role === "COUNTY_REP" && user.countySlugs.length === 1) {
    return `/${user.countySlugs[0]}/pipeline`;
  }

  // Everyone else (HR/ADMIN, COUNTY_REP with 0 or 2+ counties) lands on the dashboard.
  return "/dashboard";
}
