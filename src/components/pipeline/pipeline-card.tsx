"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatElapsed, isOverdue } from "@/lib/format-elapsed";
import { AlertTriangle, Clock } from "lucide-react";
import type { PipelineApplicant } from "@/types";

interface PipelineCardProps {
  applicant: PipelineApplicant;
}

export function PipelineCard({ applicant }: PipelineCardProps) {
  const percent = Math.round(
    (applicant.completedCount / applicant.totalCount) * 100
  );

  // Find the statusChangedAt for the current stage
  const currentStageProgress = applicant.progress.find(
    (p) => p.formType === applicant.currentStage
  );
  const stageChangedAt =
    currentStageProgress?.statusChangedAt || applicant.createdAt;

  const overdue = isOverdue(stageChangedAt, 24);
  const warning = !overdue && isOverdue(stageChangedAt, 12);

  return (
    <Link href={`/pipeline/${applicant.id}`}>
      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
        <CardContent className="p-3 space-y-2">
          <div>
            <p className="text-sm font-medium text-gray-900 truncate">
              {applicant.firstName} {applicant.lastName}
            </p>
            <p className="text-xs text-gray-500 truncate">{applicant.email}</p>
          </div>

          <div className="flex items-center gap-2">
            <Progress value={percent} className="flex-1 h-1.5" />
            <span className="text-xs text-gray-400 shrink-0">
              {applicant.completedCount}/{applicant.totalCount}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs">
            {overdue ? (
              <>
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="text-red-600">
                  {formatElapsed(stageChangedAt)} in stage
                </span>
              </>
            ) : warning ? (
              <>
                <Clock className="h-3 w-3 text-yellow-500" />
                <span className="text-yellow-600">
                  {formatElapsed(stageChangedAt)} in stage
                </span>
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">
                  {formatElapsed(stageChangedAt)} in stage
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
