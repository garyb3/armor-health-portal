"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { FORM_STEPS, PIPELINE_STAGES } from "@/lib/constants";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  RotateCcw,
  Archive as ArchiveIcon,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { FormProgress } from "@/types";

interface ArchivedApplicant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  offerAcceptedAt: string | null;
  archivedAt: string | null;
  archivedBy: string | null;
  archivedByName: string | null;
  notes: string | null;
  completedCount: number;
  totalCount: number;
  progress: FormProgress[];
}

const STAGE_SHORT: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.key, s.shortTitle])
);

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function ArchivedApplicantsPage() {
  const [applicants, setApplicants] = useState<ArchivedApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const { confirm, notify } = useConfirm();

  const load = async () => {
    try {
      const res = await apiFetch("/api/pipeline/archived");
      if (res.ok) {
        const data = await res.json();
        setApplicants(data.applicants);
      }
    } catch (err) {
      console.error("Failed to load archived applicants:", err);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleRestore = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Restore to pipeline?",
      description: `${name} will return to the active pipeline and reappear in the dashboard.`,
      confirmLabel: "Restore",
    });
    if (!ok) return;
    setRestoringId(id);
    try {
      const res = await apiFetch(`/api/pipeline/${id}/archive`, {
        method: "DELETE",
      });
      if (res.ok) {
        setApplicants((prev) => prev.filter((a) => a.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        await notify({
          title: "Couldn't restore applicant",
          description: data.error ?? "Please try again.",
        });
      }
    } catch (err) {
      console.error("Failed to restore applicant:", err);
    } finally {
      setRestoringId(null);
    }
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filtered = applicants.filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      a.firstName.toLowerCase().includes(q) ||
      a.lastName.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/pipeline"
          className="inline-flex items-center gap-1.5 text-sm text-gray-900 dark:text-gray-50 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pipeline
        </Link>
        <div className="flex items-center gap-3">
          <ArchiveIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Archived Applicants
          </h1>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            ({filtered.length})
          </span>
        </div>
        <p className="text-black dark:text-gray-50 mt-1 text-sm ml-9">
          Completed applicants with all data retained. Restore to reactivate.
        </p>
      </div>

      <Input
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-900 dark:text-gray-50">
          No archived applicants{search ? " match your search" : " yet"}.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const isOpen = expanded.has(a.id);
            const stages = FORM_STEPS.map((step) => {
              const p = a.progress.find((pr) => pr.formType === step.key);
              const done = !!(p?.stepStartedAt && p?.stepCompletedAt);
              return { ...step, progress: p, done };
            });

            return (
              <div
                key={a.id}
                className="rounded-xl bg-white dark:bg-brand-800 ring-1 ring-gray-200/60 dark:ring-brand-700/60 shadow-sm border-l-[3px] border-l-gray-300 dark:border-l-brand-600"
              >
                <button
                  type="button"
                  onClick={() => toggle(a.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-brand-700/50 rounded-xl transition-colors"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-900 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-900 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {a.firstName} {a.lastName}
                    </span>
                    <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">
                      Archived {formatDateTime(a.archivedAt)}
                      {a.archivedByName ? ` by ${a.archivedByName}` : ""}
                    </span>
                  </div>

                  <Link
                    href={`/pipeline/${a.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                  >
                    View
                  </Link>
                </button>

                {isOpen && (
                  <div className="px-4 pb-3 pt-0">
                    <div className="border-t border-gray-100 dark:border-brand-700 pt-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-900 dark:text-gray-50">
                        <div><span className="font-medium">Email:</span> {a.email}</div>
                        {a.phone && <div><span className="font-medium">Phone:</span> {a.phone}</div>}
                        <div><span className="font-medium">In pipeline since:</span> {formatDate(a.createdAt)}</div>
                        <div><span className="font-medium">Offer accepted:</span> {formatDate(a.offerAcceptedAt)}</div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {stages.map((stage) => {
                          const p = stage.progress;
                          const daysBetween =
                            p?.stepStartedAt && p?.stepCompletedAt
                              ? Math.max(
                                  0,
                                  Math.floor(
                                    (new Date(p.stepCompletedAt).getTime() -
                                      new Date(p.stepStartedAt).getTime()) /
                                      86_400_000
                                  )
                                )
                              : null;
                          return (
                            <div
                              key={stage.key}
                              className="flex items-center gap-3 text-sm py-1"
                            >
                              {stage.done ? (
                                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                              ) : (
                                <X className="h-4 w-4 text-gray-400 shrink-0" />
                              )}
                              <span
                                className={cn(
                                  "flex-1 font-medium",
                                  stage.done
                                    ? "text-gray-900 dark:text-gray-100"
                                    : "text-gray-500 dark:text-gray-400"
                                )}
                              >
                                {STAGE_SHORT[stage.key] ?? stage.key}
                              </span>
                              <span className="text-xs text-gray-700 dark:text-gray-300 tabular-nums">
                                {formatDate(p?.stepStartedAt ?? null)} → {formatDate(p?.stepCompletedAt ?? null)}
                              </span>
                              <span className="text-xs text-gray-500 w-10 text-right">
                                {daysBetween !== null ? `${daysBetween}d` : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-brand-700">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={restoringId === a.id}
                          onClick={() => handleRestore(a.id, `${a.firstName} ${a.lastName}`)}
                          className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        >
                          {restoringId === a.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4 mr-1.5" />
                          )}
                          Restore to Pipeline
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
