"use client";

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
  const statusMap = new Map(progress.map((p) => [p.formType, p.status]));

  const statuses = FORM_STEPS.map(
    (step) => statusMap.get(step.key) || "NOT_STARTED"
  );

  // Find the index of the last completed step to fill the bar up to that point
  let lastCompletedIndex = -1;
  statuses.forEach((s, i) => {
    if (s === "COMPLETED") lastCompletedIndex = i;
  });

  // Calculate fill percentage based on completed steps
  // Each step sits at an evenly spaced point along the bar
  const totalSteps = FORM_STEPS.length;
  let fillPercent = 0;
  if (lastCompletedIndex >= 0) {
    // Fill to the position of the last completed step
    fillPercent = ((lastCompletedIndex + 1) / totalSteps) * 100;
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">Overall Progress</span>
        <span className="text-gray-400 tabular-nums">
          {completedCount} of {totalCount} steps completed
        </span>
      </div>

      {/* Progress bar with step indicators */}
      <div className="relative pt-2 pb-1">
        {/* Bar track */}
        <div className="relative h-2.5 w-full rounded-full bg-gray-100">
          {/* Bar fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent-400 to-accent-500 transition-all duration-500 ease-in-out"
            style={{ width: `${fillPercent}%` }}
          />
        </div>

        {/* Step dots on the bar */}
        {FORM_STEPS.map((step, index) => {
          const position = ((index + 1) / totalSteps) * 100;
          const status = statuses[index];

          return (
            <div
              key={step.key}
              className="absolute top-0"
              style={{
                left: `${position}%`,
                transform: "translateX(-50%)",
              }}
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-white shadow-sm">
                {status === "COMPLETED" ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                ) : status === "IN_PROGRESS" || status === "PENDING_REVIEW" ? (
                  <Clock className="h-6 w-6 text-amber-500" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-300" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step labels below the bar */}
      <div className="relative h-10">
        {FORM_STEPS.map((step, index) => {
          const position = ((index + 1) / totalSteps) * 100;
          const status = statuses[index];

          return (
            <div
              key={step.key}
              className="absolute text-center"
              style={{
                left: `${position}%`,
                transform: "translateX(-50%)",
                width: `${100 / totalSteps}%`,
              }}
            >
              <p
                className={`text-xs font-medium truncate ${
                  status === "COMPLETED"
                    ? "text-emerald-600"
                    : status === "IN_PROGRESS" || status === "PENDING_REVIEW"
                    ? "text-amber-600"
                    : "text-gray-400"
                }`}
              >
                {step.title}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
