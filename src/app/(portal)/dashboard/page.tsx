"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Loader2, MapPin, AlertTriangle } from "lucide-react";
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

export default function DashboardPage() {
  const [summaries, setSummaries] = useState<CountySummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/api/dashboard/summary");
        if (res.ok) {
          const data = await res.json();
          setSummaries(data.counties as CountySummary[]);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  if (!summaries) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-900 text-sm">Unable to load your dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Building2 className="h-12 w-12 text-gray-900 mx-auto" />
            <p className="text-gray-900 text-sm">
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-900 mt-1">
          Summary across your counties. Click a card to open the pipeline.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {summaries.map((s) => {
          const cfg = COUNTIES[s.slug];
          return (
            <Link
              key={s.slug}
              href={`/${s.slug}/pipeline`}
              className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <Card className="hover:border-accent-300 hover:shadow-md transition">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg p-2 bg-accent-50 text-accent-700">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{cfg.displayName}</p>
                      <p className="text-xs text-gray-900 mt-0.5 truncate">
                        {cfg.sheriffOfficeAddress}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 leading-none">
                        {s.totalCandidates}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-gray-900 mt-1">
                        Total
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 leading-none flex items-center justify-center gap-1">
                        {s.staleCount > 0 && (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        {s.staleCount}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-gray-900 mt-1">
                        Stale
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 leading-none">
                        {s.avgDaysInProcess}
                        <span className="text-sm font-medium ml-0.5">d</span>
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-gray-900 mt-1">
                        Avg time
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-gray-900">0–10d</span>
                      <span className="ml-auto font-semibold text-gray-900">
                        {s.buckets.newCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-gray-900">11–20d</span>
                      <span className="ml-auto font-semibold text-gray-900">
                        {s.buckets.attentionCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="text-gray-900">21+d</span>
                      <span className="ml-auto font-semibold text-gray-900">
                        {s.buckets.overdueCount}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
