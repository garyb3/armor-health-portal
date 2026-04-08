"use client";

import { useState } from "react";
import Link from "next/link";
import { FORM_STEPS, PIPELINE_STAGES } from "@/lib/constants";
import { isApprovedOrCompleted } from "@/lib/pipeline-helpers";
import { formatElapsed } from "@/lib/format-elapsed";
import { cn } from "@/lib/utils";
import { Check, X, ChevronDown, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PipelineApplicant, FormProgress } from "@/types";

const STAGE_SHORT: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.key, s.shortTitle])
);

function sortedStages(progress: FormProgress[]) {
  const steps = FORM_STEPS.map((step) => {
    const p = progress.find((pr) => pr.formType === step.key);
    const done = p ? isApprovedOrCompleted(p.status) : false;
    return { ...step, progress: p, done };
  });
  // Incomplete first, then completed — within each group keep natural order
  return [
    ...steps.filter((s) => !s.done),
    ...steps.filter((s) => s.done),
  ];
}

function getCompletionDate(applicant: PipelineApplicant): string | null {
  if (applicant.currentStage !== "COMPLETED") return null;
  const dates = applicant.progress
    .filter((p) => p.status === "APPROVED")
    .map((p) => new Date(p.statusChangedAt).getTime());
  return dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;
}

function sortApplicants(applicants: PipelineApplicant[]): PipelineApplicant[] {
  return [...applicants].sort((a, b) => {
    // Primary: longest time in process first (oldest createdAt first)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

interface PipelineListProps {
  applicants: PipelineApplicant[];
  onSetOfferDate?: (id: string, date: string | null) => void;
  onSetStepDates?: (applicantId: string, formType: string, dates: { stepStartedAt?: string | null; stepCompletedAt?: string | null }) => void;
  onRemoveCandidate?: (id: string) => Promise<void>;
  onUpdateNotes?: (id: string, notes: string) => void;
}

export function PipelineList({ applicants, onSetOfferDate, onSetStepDates, onRemoveCandidate, onUpdateNotes }: PipelineListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sorted = sortApplicants(applicants);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No applicants found.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((applicant) => {
        const isOpen = expanded.has(applicant.id);
        const stages = sortedStages(applicant.progress);

        return (
          <div
            key={applicant.id}
            className={cn(
              "rounded-xl bg-white dark:bg-brand-800 ring-1 ring-gray-200/60 dark:ring-brand-700/60 shadow-sm border-l-[3px]",
              (() => {
                const d = Math.floor((Date.now() - new Date(applicant.createdAt).getTime()) / 86_400_000);
                return d >= 21 ? "border-l-rose-500" : d >= 11 ? "border-l-amber-400" : "border-l-emerald-500";
              })(),
            )}
          >
            {/* Collapsed row */}
            <button
              type="button"
              onClick={() => toggle(applicant.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-brand-700/50 rounded-xl transition-colors"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {applicant.firstName} {applicant.lastName}
                </span>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  ({applicant.completedCount}/{applicant.totalCount})
                </span>
                <span className="ml-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                  • {formatElapsed(applicant.createdAt)} in process
                </span>
                {applicant.offerAcceptedAt && (() => {
                  const completionDate = getCompletionDate(applicant);
                  if (completionDate) {
                    const days = Math.floor(
                      (new Date(completionDate).getTime() - new Date(applicant.offerAcceptedAt).getTime()) / 86_400_000
                    );
                    return (
                      <span className="ml-2 text-xs text-emerald-500">
                        • {days}d offer→complete
                      </span>
                    );
                  }
                  return (
                    <span className="ml-2 text-xs text-blue-500 dark:text-blue-400">
                      • {formatElapsed(applicant.offerAcceptedAt)} since offer
                    </span>
                  );
                })()}
                {applicant.isStale && (
                  <span className="ml-2 text-[10px] bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">
                    Stale
                  </span>
                )}
              </div>

              <Link
                href={`/pipeline/${applicant.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                View
              </Link>
            </button>

            {/* Expanded dropdown */}
            {isOpen && (
              <div className="px-4 pb-3 pt-0">
                <div className="border-t border-gray-100 dark:border-brand-700 pt-3 space-y-2">
                  {stages.map((stage) => {
                    const p = stage.progress;
                    const done = stage.done;
                    const daysBetween =
                      p?.stepStartedAt && p?.stepCompletedAt
                        ? Math.max(0, Math.floor((new Date(p.stepCompletedAt).getTime() - new Date(p.stepStartedAt).getTime()) / 86_400_000))
                        : null;

                    return (
                      <div
                        key={stage.key}
                        className="flex items-center gap-3 text-sm"
                      >
                        {done ? (
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-400 shrink-0" />
                        )}
                        <span
                          className={cn(
                            "min-w-0",
                            done
                              ? "text-gray-500 dark:text-gray-400"
                              : "text-gray-900 dark:text-gray-100 font-medium"
                          )}
                        >
                          {STAGE_SHORT[stage.key] || stage.title}
                        </span>
                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                          <input
                            type="date"
                            className="text-xs border border-gray-300 dark:border-brand-700 dark:bg-brand-800 dark:text-gray-200 rounded px-1.5 py-0.5"
                            value={p?.stepStartedAt ? new Date(p.stepStartedAt).toLocaleDateString('en-CA') : ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              onSetStepDates?.(applicant.id, stage.key, {
                                stepStartedAt: val ? new Date(val).toISOString() : null,
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            title="Started date"
                          />
                          <span className="text-xs text-gray-400">→</span>
                          <input
                            type="date"
                            className="text-xs border border-gray-300 dark:border-brand-700 dark:bg-brand-800 dark:text-gray-200 rounded px-1.5 py-0.5"
                            value={p?.stepCompletedAt ? new Date(p.stepCompletedAt).toLocaleDateString('en-CA') : ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              onSetStepDates?.(applicant.id, stage.key, {
                                stepCompletedAt: val ? new Date(val).toISOString() : null,
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            title="Completed date"
                          />
                          {daysBetween !== null ? (
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums w-8 text-right">
                              {daysBetween}d
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 tabular-nums w-8 text-right">
                              —
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Offer Accepted Date */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-brand-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Offer accepted:</span>
                    {applicant.offerAcceptedAt ? (
                      <span className="text-xs text-gray-700 dark:text-gray-300">
                        {new Date(applicant.offerAcceptedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Not set</span>
                    )}
                    <input
                      type="date"
                      className="text-xs border border-gray-300 dark:border-brand-700 dark:bg-brand-800 dark:text-gray-200 rounded px-1.5 py-0.5 ml-auto"
                      value={applicant.offerAcceptedAt ? new Date(applicant.offerAcceptedAt).toLocaleDateString('en-CA') : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        onSetOfferDate?.(applicant.id, val ? new Date(val).toISOString() : null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Notes */}
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-brand-700">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                      Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add notes about this candidate..."
                      value={localNotes[applicant.id] ?? applicant.notes ?? ""}
                      onChange={(e) => {
                        setLocalNotes((prev) => ({
                          ...prev,
                          [applicant.id]: e.target.value,
                        }));
                      }}
                      onBlur={() => {
                        const current = localNotes[applicant.id];
                        if (current !== undefined && current !== (applicant.notes ?? "")) {
                          onUpdateNotes?.(applicant.id, current);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-sm rounded-md border border-gray-300 dark:border-brand-700 bg-white dark:bg-brand-800 dark:text-gray-200 px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    />
                  </div>

                  {/* Remove Candidate */}
                  {onRemoveCandidate && (
                    <div className="flex justify-end mt-2 pt-2 border-t border-gray-100 dark:border-brand-700">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={removingId === applicant.id}
                        onClick={async () => {
                          if (!confirm(`Are you sure you want to remove ${applicant.firstName} ${applicant.lastName} from the pipeline?`)) return;
                          setRemovingId(applicant.id);
                          try {
                            await onRemoveCandidate(applicant.id);
                          } finally {
                            setRemovingId(null);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        {removingId === applicant.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1.5" />
                        )}
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
