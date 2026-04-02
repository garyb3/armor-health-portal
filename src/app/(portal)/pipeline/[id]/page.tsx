"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressTracker } from "@/components/pipeline/progress-tracker";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  PIPELINE_STAGES,
  FORM_STEPS,
} from "@/lib/constants";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import type { FormProgress } from "@/types";
import { apiFetch } from "@/lib/api-client";

interface ApplicantDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  offerAcceptedAt?: string | null;
  currentStage: string;
  completedCount: number;
  totalCount: number;
  progress: (FormProgress & {
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNote?: string;
  })[];
}

const ROLE_LABELS: Record<string, string> = {
  APPLICANT: "Applicant",
  ADMIN_ASSISTANT: "Admin Assistant",
  COUNTY_REPRESENTATIVE: "County Representative",
  RECRUITER: "Recruiter",
  HR: "HR",
};

export default function ApplicantDetailPage() {
  const params = useParams();
  const [applicant, setApplicant] = useState<ApplicantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState<string>("");
  const [denyingStep, setDenyingStep] = useState<string | null>(null);

  const loadApplicant = async () => {
    try {
      const res = await apiFetch(`/api/pipeline/${params.id}`);
      if (!res.ok) return;
      setApplicant(await res.json());
    } catch (err) {
      console.error("Failed to load applicant:", err);
    }
  };

  useEffect(() => {
    loadApplicant().finally(() => setLoading(false));
  }, [params.id]);

  const handleStepAction = async (
    formType: string,
    action: "approve" | "deny",
    note?: string
  ) => {
    const slug = FORM_STEPS.find((s) => s.key === formType)?.slug;
    if (!slug) return;

    setActionLoading(`${formType}-${action}`);
    try {
      const res = await apiFetch(
        `/api/pipeline/${params.id}/step/${slug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, note }),
        }
      );
      if (res.ok) {
        setDenyingStep(null);
        setDenyNote("");
        await loadApplicant();
      }
    } catch (err) {
      console.error("Step action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-gray-500">Applicant not found.</p>
        <Link
          href="/pipeline"
          className="text-accent-500 text-sm mt-2 inline-block hover:underline"
        >
          Back to Pipeline
        </Link>
      </div>
    );
  }

  const stageLabel =
    PIPELINE_STAGES.find((s) => s.key === applicant.currentStage)?.title ||
    applicant.currentStage;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back link */}
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Applicant info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                {applicant.firstName} {applicant.lastName}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {ROLE_LABELS[applicant.role] || applicant.role}
              </p>

              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  {applicant.email}
                </div>
                {applicant.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    {applicant.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  Registered{" "}
                  {new Date(applicant.createdAt).toLocaleDateString()}
                </div>
                {applicant.offerAcceptedAt && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    Offer accepted{" "}
                    {new Date(applicant.offerAcceptedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2">
              <Badge
                className={
                  applicant.currentStage === "COMPLETED"
                    ? STATUS_COLORS["COMPLETED"]
                    : STATUS_COLORS["IN_PROGRESS"]
                }
              >
                {applicant.currentStage === "COMPLETED"
                  ? "All Complete"
                  : `Current: ${stageLabel}`}
              </Badge>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {applicant.completedCount} of {applicant.totalCount} steps
                completed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress tracker */}
      <ProgressTracker
        progress={applicant.progress}
        completedCount={applicant.completedCount}
        totalCount={applicant.totalCount}
      />

      {/* Step-by-step admin controls */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {FORM_STEPS.map((step) => {
            const prog = applicant.progress.find(
              (p) => p.formType === step.key
            );
            const status = prog?.status || "NOT_STARTED";

            return (
              <div
                key={step.key}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-brand-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">
                      Step {step.order}
                    </span>
                    <Badge className={STATUS_COLORS[status] || ""}>
                      {STATUS_LABELS[status] || status}
                    </Badge>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {step.title}
                  </p>

                  {/* Review info */}
                  {prog?.reviewedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {status === "APPROVED" ? "Approved" : "Denied"} on{" "}
                      {new Date(prog.reviewedAt).toLocaleString()}
                      {prog.reviewNote && (
                        <span className="block text-gray-400 dark:text-gray-500 mt-0.5">
                          Note: {prog.reviewNote}
                        </span>
                      )}
                    </p>
                  )}

                  {/* Elapsed time */}
                  {prog?.statusChangedAt &&
                    status !== "APPROVED" &&
                    status !== "COMPLETED" && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Since{" "}
                        {new Date(prog.statusChangedAt).toLocaleString()}
                      </p>
                    )}
                </div>

                {/* Admin actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {status === "PENDING_REVIEW" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleStepAction(step.key, "approve")
                        }
                        disabled={actionLoading !== null}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      >
                        {actionLoading === `${step.key}-approve` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        Approve
                      </Button>
                      {denyingStep === step.key ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Optional note..."
                            value={denyNote}
                            onChange={(e) => setDenyNote(e.target.value)}
                            className="text-sm border border-gray-300 dark:border-brand-700 dark:bg-brand-800 dark:text-gray-200 rounded px-2 py-1 w-40"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleStepAction(step.key, "deny", denyNote)
                            }
                            disabled={actionLoading !== null}
                            className="gap-1"
                          >
                            {actionLoading === `${step.key}-deny` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Deny
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDenyingStep(null);
                              setDenyNote("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDenyingStep(step.key)}
                          disabled={actionLoading !== null}
                          className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 gap-1"
                        >
                          <XCircle className="h-3 w-3" />
                          Deny
                        </Button>
                      )}
                    </>
                  )}

                  {(status === "APPROVED" || status === "COMPLETED") && (
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Approved
                    </span>
                  )}

                  {status === "DENIED" && (
                    <span className="inline-flex items-center gap-1 text-sm text-red-600">
                      <XCircle className="h-4 w-4" />
                      Denied
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
