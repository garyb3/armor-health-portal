"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PipelineColumn } from "@/components/pipeline/pipeline-column";
import { PIPELINE_STAGES } from "@/lib/constants";
import { Loader2, Users } from "lucide-react";
import type { PipelineApplicant, PipelineSummary } from "@/types";

export default function PipelinePage() {
  const router = useRouter();
  const [applicants, setApplicants] = useState<PipelineApplicant[]>([]);
  const [summary, setSummary] = useState<PipelineSummary>({
    total: 0,
    byStage: {},
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

        const res = await fetch("/api/pipeline");
        if (res.ok) {
          const data = await res.json();
          setApplicants(data.applicants);
          setSummary(data.summary);
        }
      } catch (err) {
        console.error("Failed to load pipeline:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  const filtered = search
    ? applicants.filter(
        (a) =>
          `${a.firstName} ${a.lastName}`
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          a.email.toLowerCase().includes(search.toLowerCase())
      )
    : applicants;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Applicant Pipeline
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Track where applicants are in the onboarding process.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-t-[3px] border-t-accent-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-50 to-accent-100/50 flex items-center justify-center">
              <Users className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {summary.total}
              </p>
              <p className="text-xs text-gray-400">Total</p>
            </div>
          </CardContent>
        </Card>
        {PIPELINE_STAGES.map((stage) => (
          <Card key={stage.key}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {summary.byStage[stage.key] || 0}
              </p>
              <p className="text-xs text-gray-400 truncate">{stage.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Pipeline columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {PIPELINE_STAGES.map((stage) => (
          <PipelineColumn
            key={stage.key}
            title={stage.title}
            stageKey={stage.key}
            applicants={filtered}
          />
        ))}
      </div>
    </div>
  );
}
