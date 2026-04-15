"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PIPELINE_STAGES } from "@/lib/constants";
import { Users, X, Clock } from "lucide-react";
import type { PipelineSummary, StageSummary, StageApplicant } from "@/types";

const PENDING_COLOR = "bg-blue-700";
const APPROVAL_COLOR = "bg-purple-950";

interface PipelineChartProps {
  summary: PipelineSummary;
}

interface SelectedBar {
  stageTitle: string;
  label: string;
  applicants: StageApplicant[];
  colorClass: string;
}

function formatDuration(since: string): string {
  const diff = Date.now() - new Date(since).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "just now";
}

function durationColor(since: string): string {
  const days = Math.floor((Date.now() - new Date(since).getTime()) / 86_400_000);
  if (days >= 7) return "text-red-600";
  if (days >= 3) return "text-amber-600";
  return "text-gray-900";
}

function BarWithTooltip({
  count,
  applicants,
  pct,
  colorClass,
  label,
  stageTitle,
  onSelect,
}: {
  count: number;
  applicants: StageApplicant[];
  pct: number;
  colorClass: string;
  label: string;
  stageTitle: string;
  onSelect: (bar: SelectedBar) => void;
}) {
  return (
    <div className="relative flex flex-col items-center justify-end h-full">
      <span className="text-[10px] font-semibold text-gray-900 dark:text-gray-50 tabular-nums mb-0.5">
        {count}
      </span>
      <div
        className={`w-7 rounded-t-md transition-all duration-500 ease-out cursor-pointer hover:opacity-80 ${colorClass}`}
        style={{ height: `${Math.max(pct, 4)}%` }}
        onClick={() => onSelect({ stageTitle, label, applicants, colorClass })}
      />
    </div>
  );
}

const emptySummary: StageSummary = { count: 0, names: [], applicants: [] };

export function PipelineChart({ summary }: PipelineChartProps) {
  const [selected, setSelected] = useState<SelectedBar | null>(null);

  const allInStage = PIPELINE_STAGES.map(
    (s) => summary.byStage[s.key]?.count || 0
  );
  const allCompleted = PIPELINE_STAGES.map(
    (s) => summary.completedByStage?.[s.key]?.count || 0
  );
  const max = Math.max(1, ...allInStage, ...allCompleted);

  return (
    <Card>
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-50 dark:from-accent-900 to-accent-100/50 dark:to-accent-800/50 flex items-center justify-center">
              <Users className="h-5 w-5 text-accent-500 dark:text-accent-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {summary.total}
              </p>
              <p className="text-xs text-gray-900">Total Applicants</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 text-xs text-gray-900 dark:text-gray-50">
            <div className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${PENDING_COLOR}`} />
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${APPROVAL_COLOR}`} />
              <span>Pending Approval</span>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-5 h-44">
          {PIPELINE_STAGES.map((stage) => {
            const inStage: StageSummary = summary.byStage[stage.key] || emptySummary;
            const completed: StageSummary = summary.completedByStage?.[stage.key] || emptySummary;
            const inPct = max > 0 ? (inStage.count / max) * 100 : 0;
            const completedPct = max > 0 ? (completed.count / max) * 100 : 0;
            const isCompletedStage = stage.key === "COMPLETED";

            return (
              <div
                key={stage.key}
                className="flex-1 flex flex-col items-center h-full justify-end"
              >
                <div className="flex items-end gap-3 h-full">
                  <BarWithTooltip
                    count={inStage.count}
                    applicants={inStage.applicants || []}
                    pct={inPct}
                    colorClass={PENDING_COLOR}
                    label="Pending"
                    stageTitle={stage.title}
                    onSelect={setSelected}
                  />
                  {!isCompletedStage && (
                    <>
                      <div className="w-px h-3/4 bg-gray-200 dark:bg-brand-700" />
                      <BarWithTooltip
                        count={completed.count}
                        applicants={completed.applicants || []}
                        pct={completedPct}
                        colorClass={APPROVAL_COLOR}
                        label="Pending Approval"
                        stageTitle={stage.title}
                        onSelect={setSelected}
                      />
                    </>
                  )}
                </div>
                <span className="text-[10px] font-medium text-gray-900 dark:text-gray-50 text-center leading-tight line-clamp-2 w-full mt-1">
                  {stage.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Applicant list panel */}
        {selected && (
          <div className="mt-5 border-t border-gray-200 dark:border-brand-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm ${selected.colorClass}`} />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {selected.stageTitle}
                </h3>
                <span className="text-xs text-gray-900">
                  — {selected.label} ({selected.applicants.length})
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-900 hover:text-gray-900 dark:text-gray-50 dark:hover:text-gray-50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {selected.applicants.length === 0 ? (
              <p className="text-sm text-gray-900">No applicants</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {selected.applicants.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between text-sm bg-gray-50 dark:bg-brand-700 rounded-md px-3 py-1.5"
                  >
                    <span className="text-gray-700 dark:text-gray-200 truncate mr-2">{a.name}</span>
                    <span className={`flex items-center gap-0.5 text-xs font-medium shrink-0 ${durationColor(a.since)}`}>
                      <Clock className="h-3 w-3" />
                      {formatDuration(a.since)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
