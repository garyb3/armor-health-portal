"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressTracker } from "@/components/dashboard/progress-tracker";
import { STATUS_LABELS, STATUS_COLORS, PIPELINE_STAGES } from "@/lib/constants";
import { ArrowLeft, Loader2, Mail, Phone, Calendar } from "lucide-react";
import type { FormProgress } from "@/types";

interface ApplicantDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  currentStage: string;
  completedCount: number;
  totalCount: number;
  progress: FormProgress[];
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
  const router = useRouter();
  const [applicant, setApplicant] = useState<ApplicantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) return;
        const meData = await meRes.json();

        if (meData.user.role !== "RECRUITER" && meData.user.role !== "HR") {
          router.push("/dashboard");
          return;
        }

        const res = await fetch(`/api/pipeline/${params.id}`);
        if (res.ok) {
          setApplicant(await res.json());
        }
      } catch (err) {
        console.error("Failed to load applicant:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-gray-500">Applicant not found.</p>
        <Link
          href="/dashboard"
          className="text-brand-500 text-sm mt-2 inline-block hover:underline"
        >
          Back to Dashboard
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
        className="inline-flex items-center gap-1 text-sm text-brand-500 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Applicant info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {applicant.firstName} {applicant.lastName}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {ROLE_LABELS[applicant.role] || applicant.role}
              </p>

              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {applicant.email}
                </div>
                {applicant.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {applicant.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Registered{" "}
                  {new Date(applicant.createdAt).toLocaleDateString()}
                </div>
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
              <p className="text-sm text-gray-500">
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
    </div>
  );
}
