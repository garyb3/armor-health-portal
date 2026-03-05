"use client";

import { useEffect, useState } from "react";
import { ProgressTracker } from "@/components/dashboard/progress-tracker";
import { StepCard } from "@/components/dashboard/step-card";
import { FORM_STEPS } from "@/lib/constants";
import type { FormProgress, FormStatus, ProgressResponse } from "@/types";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const [progress, setProgress] = useState<FormProgress[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number>(FORM_STEPS.length);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) return;
        const meData = await meRes.json();
        setUserName(meData.user.firstName);

        const res = await fetch(
          `/api/applicants/${meData.user.id}/progress`
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
