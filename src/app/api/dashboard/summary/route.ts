import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";
import { COUNTIES, isValidCountySlug, type CountySlug } from "@/lib/counties";

const ALLOWED_ROLES = new Set(["HR", "ADMIN", "COUNTY_REP"]);
const STALE_THRESHOLD_DAYS = 11;
const MS_PER_DAY = 86_400_000;

interface CountySummary {
  slug: CountySlug;
  displayName: string;
  totalCandidates: number;
  staleCount: number;
  avgDaysInProcess: number;
  buckets: { newCount: number; attentionCount: number; overdueCount: number };
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    if (!ALLOWED_ROLES.has(user.userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userCountySlugs = (request.headers.get("x-user-county-slugs") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const isStaffGlobal = user.userRole === "HR" || user.userRole === "ADMIN";
    const counties = await prisma.county.findMany({
      where: isStaffGlobal
        ? { active: true }
        : { active: true, slug: { in: userCountySlugs } },
      select: { id: true, slug: true, displayName: true },
      orderBy: { displayName: "asc" },
    });

    if (counties.length === 0) {
      const response = NextResponse.json({ counties: [] });
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    // Single query across all accessible counties; group/compute in JS so we
    // only hit the DB once regardless of how many counties the user can see.
    const applicants = await prisma.applicant.findMany({
      where: {
        role: null,
        denied: false,
        archivedAt: null,
        countyId: { in: counties.map((c) => c.id) },
      },
      select: { countyId: true, createdAt: true, offerAcceptedAt: true },
    });

    const now = Date.now();
    const byCounty = new Map<string, typeof applicants>();
    for (const a of applicants) {
      if (!a.countyId) continue;
      const list = byCounty.get(a.countyId);
      if (list) list.push(a);
      else byCounty.set(a.countyId, [a]);
    }

    const summaries: CountySummary[] = counties.flatMap((c) => {
      if (!isValidCountySlug(c.slug)) return [];
      const rows = byCounty.get(c.id) ?? [];
      let totalDays = 0;
      let staleCount = 0;
      let newCount = 0;
      let attentionCount = 0;
      let overdueCount = 0;
      for (const a of rows) {
        const days = Math.floor((now - a.createdAt.getTime()) / MS_PER_DAY);
        totalDays += days;
        if (days >= STALE_THRESHOLD_DAYS) staleCount++;
        // Buckets exclude offer-accepted candidates so the breakdown reflects
        // active workload only — matches the per-county sidebar's behavior.
        if (a.offerAcceptedAt === null) {
          if (days <= 10) newCount++;
          else if (days <= 20) attentionCount++;
          else overdueCount++;
        }
      }
      return [{
        slug: c.slug,
        displayName: COUNTIES[c.slug].displayName,
        totalCandidates: rows.length,
        staleCount,
        avgDaysInProcess: rows.length > 0 ? Math.round(totalDays / rows.length) : 0,
        buckets: { newCount, attentionCount, overdueCount },
      }];
    });

    const response = NextResponse.json({ counties: summaries });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
