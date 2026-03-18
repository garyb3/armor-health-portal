"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { PipelineColumn } from "@/components/pipeline/pipeline-column";
const PipelineChart = dynamic(() => import("@/components/pipeline/pipeline-chart").then(m => m.PipelineChart), { ssr: false });
import { PIPELINE_STAGES } from "@/lib/constants";
import { Loader2, Search } from "lucide-react";
import type { PipelineApplicant, PipelineSummary } from "@/types";
import { apiFetch } from "@/lib/api-client";

export default function DashboardPage() {
  const [applicants, setApplicants] = useState<PipelineApplicant[]>([]);
  const [summary, setSummary] = useState<PipelineSummary>({
    total: 0,
    byStage: {},
    completedByStage: {},
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/api/pipeline");
        if (res.ok) {
          const data = await res.json();
          setApplicants(data.applicants);
          setSummary(data.summary);
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
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
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
            Applicant Pipeline
          </h1>
          <p className="text-gray-400 mt-0.5 text-sm">
            Track where applicants are in the onboarding process.
          </p>
        </div>
        <div className="max-w-xs w-full relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <PipelineChart summary={summary} />

      {/* Mobile search */}
      <div className="relative md:hidden">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {PIPELINE_STAGES.map((stage) => (
          <PipelineColumn
            key={stage.key}
            title={stage.shortTitle}
            stageKey={stage.key}
            icon={stage.icon}
            applicants={filtered}
          />
        ))}
      </div>
    </div>
  );
}
