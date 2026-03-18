"use client";

import { FORM_STEPS } from "@/lib/constants";
import { formatDurationMs } from "@/lib/format-elapsed";
import { cn } from "@/lib/utils";
import {
  FileText,
  FileCheck,
  FlaskConical,
  Fingerprint,
  Timer,
  AlertTriangle,
  UserX,
} from "lucide-react";

const STAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  FileCheck,
  FlaskConical,
  Fingerprint,
};

interface StageStatsProps {
  avgTimePerStage: Record<string, number>;
  bottleneckStage?: string | null;
  staleCount?: number;
}

export function StageStats({ avgTimePerStage, bottleneckStage, staleCount }: StageStatsProps) {
  const hasData = Object.values(avgTimePerStage).some((v) => v > 0);
  if (!hasData) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {FORM_STEPS.map((step) => {
        const avgMs = avgTimePerStage[step.key] || 0;
        const Icon = STAGE_ICONS[step.icon];
        const isBottleneck = bottleneckStage === step.key;

        return (
          <div
            key={step.key}
            className={cn(
              "flex items-center gap-3 rounded-lg bg-gray-50 border px-3 py-2.5",
              isBottleneck
                ? "border-red-300 ring-2 ring-red-400/30 bg-red-50/40"
                : "border-gray-200/60"
            )}
          >
            {Icon && <Icon className={cn("h-4 w-4 shrink-0", isBottleneck ? "text-red-400" : "text-gray-400")} />}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400 truncate">
                Avg. time
              </p>
              <p className={cn(
                "text-sm font-semibold tabular-nums flex items-center gap-1",
                isBottleneck ? "text-red-600" : "text-gray-700"
              )}>
                <Timer className={cn("h-3 w-3", isBottleneck ? "text-red-400" : "text-gray-400")} />
                {avgMs > 0 ? formatDurationMs(avgMs) : "—"}
              </p>
            </div>
            {isBottleneck && (
              <div className="flex items-center gap-1 shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-[10px] font-medium text-red-600">Bottleneck</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Stale applicant counter */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border px-3 py-2.5",
          staleCount && staleCount > 0
            ? "border-red-300 bg-red-50/40"
            : "border-gray-200/60 bg-gray-50"
        )}
      >
        <UserX className={cn("h-4 w-4 shrink-0", staleCount && staleCount > 0 ? "text-red-400" : "text-gray-400")} />
        <div className="min-w-0">
          <p className="text-[11px] text-gray-400 truncate">
            Stale (48h+)
          </p>
          <p className={cn(
            "text-sm font-semibold tabular-nums",
            staleCount && staleCount > 0 ? "text-red-600" : "text-gray-700"
          )}>
            {staleCount ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}
