"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatElapsed, isOverdue } from "@/lib/format-elapsed";
import { AlertTriangle, Bell, Clock, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
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
      <Card className={cn(
        "hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5",
        overdue && "border-l-2 border-l-red-400",
        warning && "border-l-2 border-l-yellow-400",
        applicant.isStale && "bg-red-50/50 dark:bg-red-950/50",
      )}>
        <CardContent className="p-3 space-y-2">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
              <span className="truncate">{applicant.firstName} {applicant.lastName}</span>
              {applicant.isStale && (
                <span className="text-[10px] bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-1 rounded shrink-0">Stale</span>
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{applicant.email}</p>
          </div>

          <div className="flex items-center gap-2">
            <Progress
              value={percent}
              className="flex-1 h-1.5"
              indicatorClassName={overdue ? "bg-red-500" : warning ? "bg-yellow-400" : "bg-green-500"}
            />
            <span className="text-xs text-gray-500 shrink-0">
              {applicant.completedCount}/{applicant.totalCount}
            </span>
            {applicant.hasAnyReceipt && (
              <span title="Receipt uploaded">
                <Paperclip className="h-3 w-3 text-blue-400 shrink-0" />
              </span>
            )}
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

          {applicant.lastAlertSentAt && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Bell className="h-3 w-3" />
              <span>Alerted {formatElapsed(applicant.lastAlertSentAt)} ago</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
