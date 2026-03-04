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
        <h3 className="text-sm font-semibold text-gray-700 truncate">
          {title}
        </h3>
        <Badge
          className="text-xs px-1.5 py-0 shrink-0"
        >
          {filtered.length}
        </Badge>
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
