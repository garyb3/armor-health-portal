"use client";

import { Badge } from "@/components/ui/badge";
import { PipelineCard } from "./pipeline-card";
import type { PipelineApplicant } from "@/types";

interface PipelineColumnProps {
  title: string;
  stageKey: string;
  applicants: PipelineApplicant[];
}

export function PipelineColumn({
  title,
  stageKey,
  applicants,
}: PipelineColumnProps) {
  const filtered = applicants.filter((a) => a.currentStage === stageKey);

  return (
    <div className="flex flex-col min-w-[240px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
          {title}
        </h3>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 tabular-nums shrink-0">
          {filtered.length}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            No applicants
          </p>
        ) : (
          filtered.map((applicant) => (
            <PipelineCard key={applicant.id} applicant={applicant} />
          ))
        )}
      </div>
    </div>
  );
}
