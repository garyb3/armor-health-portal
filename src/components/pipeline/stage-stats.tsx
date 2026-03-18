"use client";

import { useState } from "react";
import Link from "next/link";
import { FORM_STEPS, PIPELINE_STAGES } from "@/lib/constants";
import { formatDurationMs, formatElapsed } from "@/lib/format-elapsed";
import { cn } from "@/lib/utils";
import {
  FileText,
  FileCheck,
  FlaskConical,
  Fingerprint,
  Timer,
  AlertTriangle,
  UserX,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { PipelineApplicant } from "@/types";

const STAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  FileCheck,
  FlaskConical,
  Fingerprint,
};

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
  const hasData = Object.values(avgTimePerStage).some((v) => v > 0);
  if (!hasData) return null;

  const hasStale = staleCount != null && staleCount > 0;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {FORM_STEPS.map((step) => {
          const avgMs = avgTimePerStage[step.key] || 0;
          const Icon = STAGE_ICONS[step.icon];
          const isBottleneck = bottleneckStage === step.key;

          return (
            <div
              key={step.key}
              className={cn(
                "flex items-center gap-3 rounded-lg bg-gray-50 border px-3 py-2.5",
                isBottleneck
                  ? "border-red-300 ring-2 ring-red-400/30 bg-red-50/40"
                  : "border-gray-200/60"
              )}
            >
              {Icon && <Icon className={cn("h-4 w-4 shrink-0", isBottleneck ? "text-red-400" : "text-gray-400")} />}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-gray-400 truncate">
                  Avg. time
                </p>
                <p className={cn(
                  "text-sm font-semibold tabular-nums flex items-center gap-1",
                  isBottleneck ? "text-red-600" : "text-gray-700"
                )}>
                  <Timer className={cn("h-3 w-3", isBottleneck ? "text-red-400" : "text-gray-400")} />
                  {avgMs > 0 ? formatDurationMs(avgMs) : "—"}
                </p>
              </div>
              {isBottleneck && (
                <div className="flex items-center gap-1 shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-[10px] font-medium text-red-600">Bottleneck</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Stale applicant counter – clickable when there are stale applicants */}
        <button
          type="button"
          onClick={() => hasStale && setShowStale((v) => !v)}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left w-full transition-colors",
            hasStale
              ? "border-red-300 bg-red-50/40 hover:bg-red-100/50 cursor-pointer"
              : "border-gray-200/60 bg-gray-50 cursor-default"
          )}
        >
          <UserX className={cn("h-4 w-4 shrink-0", hasStale ? "text-red-400" : "text-gray-400")} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-gray-400 truncate">
              Stale (48h+)
            </p>
            <p className={cn(
              "text-sm font-semibold tabular-nums",
              hasStale ? "text-red-600" : "text-gray-700"
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
      </div>

      {/* Expanded stale applicant list */}
      {showStale && staleApplicants.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50/30 p-3">
          <p className="text-xs font-medium text-red-600 mb-2">
            Stale applicants (48h+ in current stage)
          </p>
          <div className="space-y-1.5">
            {staleApplicants.map((a) => {
              const stageProgress = a.progress.find((p) => p.formType === a.currentStage);
              const since = stageProgress?.statusChangedAt || a.createdAt;
              return (
                <Link
                  key={a.id}
                  href={`/pipeline/${a.id}`}
                  className="flex items-center justify-between gap-2 rounded-md bg-white border border-red-100 px-3 py-2 hover:bg-red-50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-red-700">
                      {a.firstName} {a.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{a.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-red-600">
                      {formatElapsed(since)} in stage
                    </p>
                    <p className="text-[11px] text-gray-400">
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
