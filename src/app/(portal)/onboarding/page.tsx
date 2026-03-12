"use client";

import { useEffect, useState } from "react";
import { ProgressTracker } from "@/components/dashboard/progress-tracker";
import { StepCard } from "@/components/dashboard/step-card";
import { FORM_STEPS } from "@/lib/constants";
import type { FormProgress, FormStatus, ProgressResponse } from "@/types";
import { Loader2, PartyPopper } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

export default function OnboardingPage() {
  const [progress, setProgress] = useState<FormProgress[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number>(FORM_STEPS.length);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const meRes = await apiFetch("/api/auth/me");
        if (!meRes.ok) return;
        const meData = await meRes.json();
        setUserName(meData.user.firstName);

        const res = await apiFetch(
          `/api/applicants/${meData.user.id}/progress`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data: ProgressResponse = await res.json();
          setProgress(data.progress);
          setCompletedCount(data.completedCount);
          setTotalCount(data.totalCount);
        }
      } catch (err) {
        console.error("Failed to load onboarding:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  const statusMap = new Map(progress.map((p) => [p.formType, p.status]));
  const statusChangedMap = new Map(progress.map((p) => [p.formType, p.statusChangedAt]));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 md:p-8 text-white">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {userName}!
        </h1>
        <p className="text-brand-200 mt-1 text-sm">
          Complete the steps below to finish your onboarding process.
        </p>
      </div>

      {completedCount === totalCount && totalCount > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3">
          <PartyPopper className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-900">
              All forms completed!
            </p>
            <p className="text-sm text-emerald-700 mt-0.5">
              Thank you for completing all of your onboarding forms. We will
              review your submissions and contact you soon.
            </p>
          </div>
        </div>
      )}

      <ProgressTracker
        progress={progress}
        completedCount={completedCount}
        totalCount={totalCount}
      />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 tracking-tight">
          Onboarding Steps
        </h2>
        <div className="space-y-3">
          {FORM_STEPS.map((step) => (
            <StepCard
              key={step.key}
              title={step.title}
              description={step.description}
              icon={step.icon}
              status={
                (statusMap.get(step.key) as FormStatus) || "NOT_STARTED"
              }
              route={step.route}
              order={step.order}
              statusChangedAt={statusChangedMap.get(step.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
