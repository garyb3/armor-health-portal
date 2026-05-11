"use client";

import { AlertTriangle, Clock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function KpiCards({
  totalCandidates,
  staleCount,
  avgDaysInProcess,
}: {
  totalCandidates: number;
  staleCount: number;
  avgDaysInProcess: number;
}) {
  const staleActive = staleCount > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-5 flex items-center gap-4">
          <div className="rounded-lg p-2.5 bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-none">
              {totalCandidates}
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
              {staleCount}
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
              {avgDaysInProcess}
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
  );
}
