"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { useCounty } from "@/components/county-provider";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import {
  TrendChartsRow,
  type TrendsResponse,
} from "@/components/dashboard/trend-chart";
import type { CountySlug } from "@/lib/counties";

interface CountySummary {
  slug: CountySlug;
  displayName: string;
  totalCandidates: number;
  staleCount: number;
  avgDaysInProcess: number;
  buckets: { newCount: number; attentionCount: number; overdueCount: number };
}

export default function CountyDashboardPage() {
  const county = useCounty();
  const [summary, setSummary] = useState<CountySummary | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [summaryRes, trendsRes] = await Promise.all([
          apiFetch("/api/dashboard/summary"),
          apiFetch(`/api/dashboard/completion-trends?county=${county.slug}`),
        ]);
        if (cancelled) return;
        if (summaryRes.ok) {
          const data = await summaryRes.json();
          const counties = data.counties as CountySummary[];
          setSummary(counties.find((c) => c.slug === county.slug) ?? null);
        }
        if (trendsRes.ok) {
          const data = (await trendsRes.json()) as TrendsResponse;
          setTrends(data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [county.slug]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Unable to load dashboard for {county.displayName}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          {county.displayName} Dashboard
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Pipeline summary and completion trends for {county.displayName}.
        </p>
      </div>

      <KpiCards
        totalCandidates={summary.totalCandidates}
        staleCount={summary.staleCount}
        avgDaysInProcess={summary.avgDaysInProcess}
      />

      {trends && (
        <div className="pt-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
            Completion trends
          </h2>
          <TrendChartsRow trends={trends} />
        </div>
      )}

      <div className="pt-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Time in process
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg px-4 py-3 bg-green-50 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/40">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400 leading-none">
              {summary.buckets.newCount}
            </p>
            <p className="text-[11px] font-medium text-green-700 dark:text-green-300 mt-2">
              0–10 days
            </p>
          </div>
          <div className="rounded-lg px-4 py-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200/60 dark:border-yellow-800/40">
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 leading-none">
              {summary.buckets.attentionCount}
            </p>
            <p className="text-[11px] font-medium text-yellow-700 dark:text-yellow-300 mt-2">
              11–20 days
            </p>
          </div>
          <div className="rounded-lg px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40">
            <p className="text-2xl font-bold text-red-700 dark:text-red-400 leading-none">
              {summary.buckets.overdueCount}
            </p>
            <p className="text-[11px] font-medium text-red-700 dark:text-red-300 mt-2">
              21+ days
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Link
          href={`/${county.slug}/pipeline`}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg p-2.5 bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  Click to go to candidate list
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  View all {summary.totalCandidates} candidates in the {county.displayName} pipeline.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
