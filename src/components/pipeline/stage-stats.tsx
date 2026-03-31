"use client";

import { useState } from "react";
import Link from "next/link";
import { PIPELINE_STAGES } from "@/lib/constants";
import { formatElapsed } from "@/lib/format-elapsed";
import { cn } from "@/lib/utils";
import {
  UserX,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { PipelineApplicant } from "@/types";

const STAGE_LABEL: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.key, s.shortTitle])
);

interface StageStatsProps {
  avgTimePerStage: Record<string, number>;
  bottleneckStage?: string | null;
  staleCount?: number;
  staleApplicants?: PipelineApplicant[];
}

export function StageStats({ avgTimePerStage, bottleneckStage, staleCount, staleApplicants = [] }: StageStatsProps) {
  const [showStale, setShowStale] = useState(false);

  const hasStale = staleCount != null && staleCount > 0;
  if (!hasStale) return null;

  return (
    <div className="space-y-2">
      {/* Stale applicant counter – clickable when there are stale applicants */}
      <button
          type="button"
          onClick={() => hasStale && setShowStale((v) => !v)}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left w-full transition-colors",
            hasStale
              ? "border-red-300 dark:border-red-700 bg-red-50/40 dark:bg-red-950/40 hover:bg-red-100/50 dark:hover:bg-red-900/50 cursor-pointer"
              : "border-gray-200/60 dark:border-brand-700/60 bg-gray-50 dark:bg-brand-800 cursor-default"
          )}
        >
          <UserX className={cn("h-4 w-4 shrink-0", hasStale ? "text-red-400" : "text-gray-400 dark:text-gray-500")} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
              Stale (7d+)
            </p>
            <p className={cn(
              "text-sm font-semibold tabular-nums",
              hasStale ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-200"
            )}>
              {staleCount ?? 0}
            </p>
          </div>
          {hasStale && (
            showStale
              ? <ChevronUp className="h-4 w-4 text-red-400 shrink-0" />
              : <ChevronDown className="h-4 w-4 text-red-400 shrink-0" />
          )}
      </button>

      {/* Expanded stale applicant list */}
      {showStale && staleApplicants.length > 0 && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/30 p-3">
          <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">
            Stale applicants (7d+ in current stage)
          </p>
          <div className="space-y-1.5">
            {staleApplicants.map((a) => {
              const stageProgress = a.progress.find((p) => p.formType === a.currentStage);
              const since = stageProgress?.statusChangedAt || a.createdAt;
              return (
                <Link
                  key={a.id}
                  href={`/pipeline/${a.id}`}
                  className="flex items-center justify-between gap-2 rounded-md bg-white dark:bg-brand-800 border border-red-100 dark:border-red-900 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-red-700 dark:group-hover:text-red-400">
                      {a.firstName} {a.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">
                      {formatElapsed(since)} in stage
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      {STAGE_LABEL[a.currentStage] || a.currentStage}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
