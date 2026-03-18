"use client";

import { PipelineCard } from "./pipeline-card";
import {
  FileText,
  FileCheck,
  FlaskConical,
  Fingerprint,
  CheckCircle2,
} from "lucide-react";
import type { PipelineApplicant } from "@/types";

const STAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  FileCheck,
  FlaskConical,
  Fingerprint,
  CheckCircle2,
};

const STAGE_COLORS: Record<string, { border: string; iconBg: string; iconText: string }> = {
  VOLUNTEER_APP:        { border: "border-t-blue-400",    iconBg: "bg-blue-50 dark:bg-blue-950",       iconText: "text-blue-500 dark:text-blue-400" },
  PROFESSIONAL_LICENSE: { border: "border-t-amber-400",   iconBg: "bg-amber-50 dark:bg-amber-950",     iconText: "text-amber-500 dark:text-amber-400" },
  DRUG_SCREEN:          { border: "border-t-purple-400",  iconBg: "bg-purple-50 dark:bg-purple-950",   iconText: "text-purple-500 dark:text-purple-400" },
  BACKGROUND_CHECK:     { border: "border-t-rose-400",    iconBg: "bg-rose-50 dark:bg-rose-950",       iconText: "text-rose-500 dark:text-rose-400" },
  COMPLETED:            { border: "border-t-emerald-400", iconBg: "bg-emerald-50 dark:bg-emerald-950", iconText: "text-emerald-500 dark:text-emerald-400" },
};

const DEFAULT_COLORS = { border: "border-t-gray-400", iconBg: "bg-gray-100 dark:bg-brand-700", iconText: "text-gray-500" };

interface PipelineColumnProps {
  title: string;
  stageKey: string;
  icon: string;
  applicants: PipelineApplicant[];
  isBottleneck?: boolean;
}

export function PipelineColumn({
  title,
  stageKey,
  icon,
  applicants,
  isBottleneck,
}: PipelineColumnProps) {
  const filtered = applicants.filter((a) => a.currentStage === stageKey);
  const colors = STAGE_COLORS[stageKey] || DEFAULT_COLORS;
  const Icon = STAGE_ICONS[icon];

  return (
    <div
      className={`flex flex-col min-w-[240px] rounded-xl bg-gray-50/70 dark:bg-brand-800/70 border border-gray-200/60 dark:border-brand-700/60 border-t-2 ${colors.border}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {Icon && (
          <div className={`${colors.iconBg} rounded-lg p-1.5`}>
            <Icon className={`h-3.5 w-3.5 ${colors.iconText}`} />
          </div>
        )}
        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider truncate">
          {title}
        </h3>
        {isBottleneck && (
          <span className="text-[9px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded px-1 py-0.5 ring-1 ring-red-200 dark:ring-red-800 shrink-0">
            Bottleneck
          </span>
        )}
        <span className="ml-auto text-xs font-medium text-gray-400 bg-white dark:bg-brand-700 rounded-full px-2 py-0.5 ring-1 ring-gray-200/60 dark:ring-brand-600/60 tabular-nums shrink-0">
          {filtered.length}
        </span>
      </div>

      {/* Card list */}
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-340px)] px-2 pb-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-3">
            {Icon && (
              <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-brand-700 flex items-center justify-center mb-2">
                <Icon className="h-4 w-4 text-gray-300 dark:text-gray-600" />
              </div>
            )}
            <p className="text-xs text-gray-500">No applicants</p>
          </div>
        ) : (
          filtered.map((applicant) => (
            <PipelineCard key={applicant.id} applicant={applicant} />
          ))
        )}
      </div>
    </div>
  );
}
