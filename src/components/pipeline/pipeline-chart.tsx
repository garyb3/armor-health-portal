"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PIPELINE_STAGES } from "@/lib/constants";
import { Users, X } from "lucide-react";
import type { PipelineSummary, StageSummary } from "@/types";

const PENDING_COLOR = "bg-[#C8A951]";
const APPROVAL_COLOR = "bg-red-700";

interface PipelineChartProps {
  summary: PipelineSummary;
}

interface SelectedBar {
  stageTitle: string;
  label: string;
  names: string[];
  colorClass: string;
}

function BarWithTooltip({
  count,
  names,
  pct,
  colorClass,
  label,
  stageTitle,
  onSelect,
}: {
  count: number;
  names: string[];
  pct: number;
  colorClass: string;
  label: string;
  stageTitle: string;
  onSelect: (bar: SelectedBar) => void;
}) {
  return (
    <div className="relative flex flex-col items-center justify-end h-full">
      <span className="text-[10px] font-semibold text-gray-600 tabular-nums mb-0.5">
        {count}
      </span>
      <div
        className={`w-5 rounded-t-md transition-all duration-500 ease-out cursor-pointer hover:opacity-80 ${colorClass}`}
        style={{ height: `${Math.max(pct, 4)}%` }}
        onClick={() => onSelect({ stageTitle, label, names, colorClass })}
      />
    </div>
  );
}

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
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-50 to-accent-100/50 flex items-center justify-center">
              <Users className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {summary.total}
              </p>
              <p className="text-xs text-gray-400">Total Applicants</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 text-xs text-gray-500">
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
            const inStage: StageSummary = summary.byStage[stage.key] || {
              count: 0,
              names: [],
            };
            const completed: StageSummary = summary.completedByStage?.[
              stage.key
            ] || { count: 0, names: [] };
            const inPct = max > 0 ? (inStage.count / max) * 100 : 0;
            const completedPct = max > 0 ? (completed.count / max) * 100 : 0;
            const isCompletedStage = stage.key === "COMPLETED";

            return (
              <div
                key={stage.key}
                className="flex-1 flex flex-col items-center h-full justify-end"
              >
                <div className="flex items-end gap-1 h-full">
                  <BarWithTooltip
                    count={inStage.count}
                    names={inStage.names}
                    pct={inPct}
                    colorClass={PENDING_COLOR}
                    label="Pending"
                    stageTitle={stage.title}
                    onSelect={setSelected}
                  />
                  {!isCompletedStage && (
                    <BarWithTooltip
                      count={completed.count}
                      names={completed.names}
                      pct={completedPct}
                      colorClass={APPROVAL_COLOR}
                      label="Pending Approval"
                      stageTitle={stage.title}
                      onSelect={setSelected}
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium text-gray-500 text-center leading-tight line-clamp-2 w-full mt-1">
                  {stage.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Applicant list panel */}
        {selected && (
          <div className="mt-5 border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm ${selected.colorClass}`} />
                <h3 className="text-sm font-semibold text-gray-900">
                  {selected.stageTitle}
                </h3>
                <span className="text-xs text-gray-400">
                  — {selected.label} ({selected.names.length})
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {selected.names.length === 0 ? (
              <p className="text-sm text-gray-400">No applicants</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {selected.names.map((name, i) => (
                  <div
                    key={i}
                    className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-1.5"
                  >
                    {name}
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
