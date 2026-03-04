"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/constants";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import type { FormProgress } from "@/types";
import { FORM_STEPS } from "@/lib/constants";

interface ProgressTrackerProps {
  progress: FormProgress[];
  completedCount: number;
  totalCount: number;
}

export function ProgressTracker({
  progress,
  completedCount,
  totalCount,
}: ProgressTrackerProps) {
  const percentage = Math.round((completedCount / totalCount) * 100);

  const statusMap = new Map(progress.map((p) => [p.formType, p.status]));

  return (
    <div className="space-y-6">
      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Overall Progress</span>
          <span className="text-gray-500">
            {completedCount} of {totalCount} steps completed
          </span>
        </div>
        <Progress value={percentage} />
      </div>

      {/* Step list */}
      <div className="space-y-3">
        {FORM_STEPS.map((step, index) => {
          const status = statusMap.get(step.key) || "NOT_STARTED";

          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center">
                  {status === "COMPLETED" ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : status === "IN_PROGRESS" || status === "PENDING_REVIEW" ? (
                    <Clock className="h-6 w-6 text-yellow-500" />
                  ) : (
                    <Circle className="h-6 w-6 text-gray-300" />
                  )}
                </div>
                {index < FORM_STEPS.length - 1 && (
                  <div
                    className={`w-0.5 h-8 mt-1 ${
                      status === "COMPLETED" ? "bg-green-300" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>

              {/* Step info */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    Step {step.order}: {step.title}
                  </p>
                  <Badge variant={status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "PENDING_REVIEW"}>
                    {STATUS_LABELS[status]}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
