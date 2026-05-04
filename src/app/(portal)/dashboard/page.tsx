"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Clock,
  Loader2,
  MapPin,
  Minus,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { COUNTIES, type CountySlug } from "@/lib/counties";

interface CountySummary {
  slug: CountySlug;
  displayName: string;
  totalCandidates: number;
  staleCount: number;
  avgDaysInProcess: number;
  buckets: { newCount: number; attentionCount: number; overdueCount: number };
}

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
interface TrendsResponse {
  week: TrendSeries;
  month: TrendSeries;
  year: TrendSeries;
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
        <Minus className="h-3 w-3" />
        No prior data
      </span>
    );
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={
        positive
          ? "inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
          : "inline-flex items-center gap-1 text-[11px] font-semibold text-accent-600 dark:text-accent-400"
      }
    >
      {positive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {positive ? "+" : ""}
      {delta}%
    </span>
  );
}

function TrendChart({
  title,
  currentLabel,
  priorLabel,
  series,
}: {
  title: string;
  currentLabel: string;
  priorLabel: string;
  series: TrendSeries;
}) {
  return (
    <Card className="h-full">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {title}
            </p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-none mt-2">
              {series.currentTotal}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              vs {series.priorTotal} prior
            </p>
          </div>
          <DeltaBadge delta={series.deltaPercent} />
        </div>

        <div className="h-[160px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={series.points}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-gray-200 dark:text-brand-700"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-gray-500 dark:text-gray-400"
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-gray-500 dark:text-gray-400"
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid rgb(229 231 235)",
                  background: "rgb(255 255 255)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
                labelStyle={{ color: "#111827", fontWeight: 600 }}
                formatter={(value, name) => [
                  value == null ? "—" : (value as number),
                  name === "current" ? currentLabel : priorLabel,
                ]}
              />
              <Line
                type="monotone"
                dataKey="prior"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="current"
                stroke="#c4333b"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="block w-3 h-0.5 bg-accent-500 rounded-full" />
            <span className="text-gray-700 dark:text-gray-200">{currentLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="block w-3 h-0.5 border-t-2 border-dashed border-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">{priorLabel}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [summaries, setSummaries] = useState<CountySummary[] | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, trendsRes] = await Promise.all([
          apiFetch("/api/dashboard/summary"),
          apiFetch("/api/dashboard/completion-trends"),
        ]);
        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setSummaries(data.counties as CountySummary[]);
        }
        if (trendsRes.ok) {
          const data = (await trendsRes.json()) as TrendsResponse;
          setTrends(data);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totals = useMemo(() => {
    if (!summaries || summaries.length === 0) {
      return { totalCandidates: 0, totalStale: 0, avgDays: 0 };
    }
    const totalCandidates = summaries.reduce((a, s) => a + s.totalCandidates, 0);
    const totalStale = summaries.reduce((a, s) => a + s.staleCount, 0);
    const weightedDays = summaries.reduce(
      (a, s) => a + s.avgDaysInProcess * s.totalCandidates,
      0,
    );
    const avgDays =
      totalCandidates > 0 ? Math.round(weightedDays / totalCandidates) : 0;
    return { totalCandidates, totalStale, avgDays };
  }, [summaries]);

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  if (!summaries) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Unable to load your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Dashboard
          </h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Building2 className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto" />
            <p className="text-sm text-gray-700 dark:text-gray-200">
              No counties have been assigned to your account. Please contact your
              administrator to be granted access.
            </p>
            <Button variant="outline" size="sm" onClick={logout}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const staleActive = totals.totalStale > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Summary across your counties. Click a card to open the pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-lg p-2.5 bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-none">
                {totals.totalCandidates}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-2">
                Total candidates
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div
              className={
                staleActive
                  ? "rounded-lg p-2.5 bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300"
                  : "rounded-lg p-2.5 bg-gray-100 text-gray-500 dark:bg-brand-700 dark:text-gray-400"
              }
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p
                className={
                  staleActive
                    ? "text-3xl font-extrabold leading-none text-accent-600 dark:text-accent-400"
                    : "text-3xl font-extrabold leading-none text-gray-900 dark:text-gray-100"
                }
              >
                {totals.totalStale}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-2">
                Need follow-up
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-lg p-2.5 bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-none">
                {totals.avgDays}
                <span className="text-base font-bold ml-0.5 text-gray-500 dark:text-gray-400">
                  d
                </span>
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-2">
                Avg time in process
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {trends && (
        <div className="pt-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
            Completion trends
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <TrendChart
              title="This week vs last week"
              currentLabel="This week"
              priorLabel="Last week"
              series={trends.week}
            />
            <TrendChart
              title="This month vs last month"
              currentLabel="This month"
              priorLabel="Last month"
              series={trends.month}
            />
            <TrendChart
              title="This year vs last year"
              currentLabel="This year"
              priorLabel="Last year"
              series={trends.year}
            />
          </div>
        </div>
      )}

      <div className="pt-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          By county
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaries.map((s) => {
            const cfg = COUNTIES[s.slug];
            const cardStale = s.staleCount > 0;
            return (
              <Link
                key={s.slug}
                href={`/${s.slug}/pipeline`}
                className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg p-2 bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 shrink-0">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {cfg.displayName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {cfg.sheriffOfficeAddress}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200 dark:border-brand-700">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">
                          {s.totalCandidates}
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1.5">
                          Total
                        </p>
                      </div>
                      <div className="text-center">
                        <p
                          className={
                            cardStale
                              ? "text-2xl font-bold leading-none text-accent-600 dark:text-accent-400 flex items-center justify-center gap-1"
                              : "text-2xl font-bold leading-none text-gray-900 dark:text-gray-100 flex items-center justify-center gap-1"
                          }
                        >
                          {cardStale && <AlertTriangle className="h-4 w-4" />}
                          {s.staleCount}
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1.5">
                          Stale
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">
                          {s.avgDaysInProcess}
                          <span className="text-sm font-medium ml-0.5 text-gray-500 dark:text-gray-400">
                            d
                          </span>
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1.5">
                          Avg time
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg px-2.5 py-2 bg-green-50 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/40">
                        <p className="text-base font-bold text-green-700 dark:text-green-400 leading-none">
                          {s.buckets.newCount}
                        </p>
                        <p className="text-[10px] font-medium text-green-700 dark:text-green-300 mt-1">
                          0–10 days
                        </p>
                      </div>
                      <div className="rounded-lg px-2.5 py-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200/60 dark:border-yellow-800/40">
                        <p className="text-base font-bold text-yellow-700 dark:text-yellow-400 leading-none">
                          {s.buckets.attentionCount}
                        </p>
                        <p className="text-[10px] font-medium text-yellow-700 dark:text-yellow-300 mt-1">
                          11–20 days
                        </p>
                      </div>
                      <div className="rounded-lg px-2.5 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40">
                        <p className="text-base font-bold text-red-700 dark:text-red-400 leading-none">
                          {s.buckets.overdueCount}
                        </p>
                        <p className="text-[10px] font-medium text-red-700 dark:text-red-300 mt-1">
                          21+ days
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
