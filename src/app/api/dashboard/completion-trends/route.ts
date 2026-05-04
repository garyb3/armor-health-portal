import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";

const ALLOWED_ROLES = new Set(["HR", "ADMIN", "COUNTY_REP"]);
const WEEK_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface TrendPoint {
  label: string;
  current: number | null;
  prior: number | null;
}
interface TrendSeries {
  points: TrendPoint[];
  currentTotal: number;
  priorTotal: number;
  deltaPercent: number | null;
}

// Mon=0..Sun=6 (JS getDay() returns Sun=0..Sat=6)
function dayOfWeekMon(d: Date) {
  return (d.getDay() + 6) % 7;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - dayOfWeekMon(x));
  return x;
}
function startOfYear(year: number) {
  return new Date(year, 0, 1);
}
function daysInMonth(year: number, monthIdx: number) {
  return new Date(year, monthIdx + 1, 0).getDate();
}

function summarize(points: TrendPoint[]): TrendSeries {
  const currentTotal = points.reduce((a, p) => a + (p.current ?? 0), 0);
  const priorTotal = points.reduce((a, p) => a + (p.prior ?? 0), 0);
  // null when there's no prior baseline to compare against
  const deltaPercent = priorTotal === 0
    ? null
    : Math.round(((currentTotal - priorTotal) / priorTotal) * 100);
  return { points, currentTotal, priorTotal, deltaPercent };
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
      select: { id: true },
    });

    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    const todayDow = dayOfWeekMon(now);
    const todayDayOfMonth = now.getDate();

    const thisWeekStart = startOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    const thisMonthDays = daysInMonth(thisYear, thisMonth);
    const lastMonthDays = daysInMonth(lastMonthYear, lastMonth);
    const maxMonthDays = Math.max(thisMonthDays, lastMonthDays);

    // Initialize point arrays. `null` = "no data slot here" (future days, or
    // last-month days that don't exist this month). `0` = "slot exists, count
    // is zero". Recharts skips null points so the line stops cleanly.
    const weekPoints: TrendPoint[] = WEEK_DAY_LABELS.map((label, i) => ({
      label,
      current: i <= todayDow ? 0 : null,
      prior: 0,
    }));
    const monthPoints: TrendPoint[] = Array.from({ length: maxMonthDays }, (_, i) => {
      const day = i + 1;
      return {
        label: String(day),
        current: day <= todayDayOfMonth && day <= thisMonthDays ? 0 : null,
        prior: day <= lastMonthDays ? 0 : null,
      };
    });
    const yearPoints: TrendPoint[] = MONTH_LABELS.map((label, i) => ({
      label,
      current: i <= thisMonth ? 0 : null,
      prior: 0,
    }));

    if (counties.length === 0) {
      return jsonResponse(summarize(weekPoints), summarize(monthPoints), summarize(yearPoints));
    }

    // Bound the query to last-year-start so we never scan ancient archives.
    const queryFloor = startOfYear(thisYear - 1);

    const completions = await prisma.applicant.findMany({
      where: {
        role: null,
        denied: { not: true },
        archivedAt: { not: null, gte: queryFloor },
        countyId: { in: counties.map((c) => c.id) },
      },
      select: { archivedAt: true },
    });

    for (const c of completions) {
      const dt = c.archivedAt;
      if (!dt) continue;
      const y = dt.getFullYear();
      const m = dt.getMonth();
      const d = dt.getDate();

      // Week buckets — only days that fall within this/last calendar week
      if (dt >= thisWeekStart) {
        const dow = dayOfWeekMon(dt);
        const slot = weekPoints[dow];
        if (slot && slot.current !== null) slot.current += 1;
      } else if (dt >= lastWeekStart) {
        const dow = dayOfWeekMon(dt);
        const slot = weekPoints[dow];
        if (slot && slot.prior !== null) slot.prior += 1;
      }

      // Month buckets — calendar month this/last
      if (y === thisYear && m === thisMonth) {
        const slot = monthPoints[d - 1];
        if (slot && slot.current !== null) slot.current += 1;
      } else if (y === lastMonthYear && m === lastMonth) {
        const slot = monthPoints[d - 1];
        if (slot && slot.prior !== null) slot.prior += 1;
      }

      // Year buckets — calendar year this/last
      if (y === thisYear) {
        const slot = yearPoints[m];
        if (slot && slot.current !== null) slot.current += 1;
      } else if (y === thisYear - 1) {
        const slot = yearPoints[m];
        if (slot && slot.prior !== null) slot.prior += 1;
      }
    }

    return jsonResponse(summarize(weekPoints), summarize(monthPoints), summarize(yearPoints));
  } catch (error) {
    console.error("Dashboard completion-trends error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function jsonResponse(week: TrendSeries, month: TrendSeries, year: TrendSeries) {
  const response = NextResponse.json({ week, month, year });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
