"use client";

import { useState } from "react";
import Link from "next/link";
import { FORM_STEPS, PIPELINE_STAGES } from "@/lib/constants";
import { isApprovedOrCompleted } from "@/lib/pipeline-helpers";
import { formatElapsed } from "@/lib/format-elapsed";
import { cn } from "@/lib/utils";
import { Check, X, ChevronDown, ChevronRight } from "lucide-react";
import type { PipelineApplicant, FormProgress } from "@/types";

const STAGE_SHORT: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.key, s.shortTitle])
);

function sortedStages(progress: FormProgress[]) {
  const steps = FORM_STEPS.map((step) => {
    const p = progress.find((pr) => pr.formType === step.key);
    const done = p ? isApprovedOrCompleted(p.status) : false;
    return { ...step, progress: p, done };
  });
  // Incomplete first, then completed — within each group keep natural order
  return [
    ...steps.filter((s) => !s.done),
    ...steps.filter((s) => s.done),
  ];
}

function sortApplicants(applicants: PipelineApplicant[]): PipelineApplicant[] {
  return [...applicants].sort((a, b) => {
    // Primary: longest time in process first (oldest createdAt first)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

interface PipelineListProps {
  applicants: PipelineApplicant[];
}

export function PipelineList({ applicants }: PipelineListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sorted = sortApplicants(applicants);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No applicants found.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((applicant) => {
        const isOpen = expanded.has(applicant.id);
        const stages = sortedStages(applicant.progress);

        return (
          <div
            key={applicant.id}
            className={cn(
              "rounded-xl bg-white dark:bg-brand-800 ring-1 ring-gray-200/60 dark:ring-brand-700/60 shadow-sm",
              applicant.isStale && "ring-red-300 dark:ring-red-700"
            )}
          >
            {/* Collapsed row */}
            <button
              type="button"
              onClick={() => toggle(applicant.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-brand-700/50 rounded-xl transition-colors"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {applicant.firstName} {applicant.lastName}
                </span>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  ({applicant.completedCount}/{applicant.totalCount})
                </span>
                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                  • {formatElapsed(applicant.createdAt)} in process
                </span>
                {applicant.isStale && (
                  <span className="ml-2 text-[10px] bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">
                    Stale
                  </span>
                )}
              </div>

              <Link
                href={`/pipeline/${applicant.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                View
              </Link>
            </button>

            {/* Expanded dropdown */}
            {isOpen && (
              <div className="px-4 pb-3 pt-0">
                <div className="border-t border-gray-100 dark:border-brand-700 pt-3 space-y-2">
                  {stages.map((stage) => {
                    const p = stage.progress;
                    const done = stage.done;
                    const timeLabel =
                      p && p.status !== "NOT_STARTED"
                        ? formatElapsed(p.statusChangedAt)
                        : "—";

                    return (
                      <div
                        key={stage.key}
                        className="flex items-center gap-3 text-sm"
                      >
                        {done ? (
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-400 shrink-0" />
                        )}
                        <span
                          className={cn(
                            "flex-1",
                            done
                              ? "text-gray-500 dark:text-gray-400"
                              : "text-gray-900 dark:text-gray-100 font-medium"
                          )}
                        >
                          {STAGE_SHORT[stage.key] || stage.title}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                          {timeLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
