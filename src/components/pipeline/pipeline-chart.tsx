"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PIPELINE_STAGES } from "@/lib/constants";
import { Users } from "lucide-react";
import type { PipelineSummary } from "@/types";

const BAR_COLORS = [
  "bg-accent-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500",
];

interface PipelineChartProps {
  summary: PipelineSummary;
}

export function PipelineChart({ summary }: PipelineChartProps) {
  const max = Math.max(
    1,
    ...PIPELINE_STAGES.map((s) => summary.byStage[s.key] || 0)
  );

  return (
    <Card>
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center gap-3 mb-6">
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

        <div className="flex items-end gap-5 h-44">
          {PIPELINE_STAGES.map((stage, i) => {
            const count = summary.byStage[stage.key] || 0;
            const pct = max > 0 ? (count / max) * 100 : 0;

            return (
              <div key={stage.key} className="flex-1 flex flex-col items-center h-full justify-end">
                <span className="text-xs font-semibold text-gray-900 tabular-nums mb-0.5">
                  {count}
                </span>
                <div
                  className={`w-8 rounded-t-md transition-all duration-500 ease-out ${BAR_COLORS[i % BAR_COLORS.length]}`}
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
                <span className="text-[10px] font-medium text-gray-500 text-center leading-tight line-clamp-2 w-full">
                  {stage.title}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
