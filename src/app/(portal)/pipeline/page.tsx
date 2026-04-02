"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { PipelineList } from "@/components/pipeline/pipeline-list";
import { Loader2 } from "lucide-react";
import type { PipelineApplicant } from "@/types";
import { apiFetch } from "@/lib/api-client";

export default function PipelinePage() {
  const [applicants, setApplicants] = useState<PipelineApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/api/pipeline");
        if (res.ok) {
          const data = await res.json();
          setApplicants(data.applicants);
        }
      } catch (err) {
        console.error("Failed to load pipeline:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSetOfferDate = (applicantId: string, date: string | null) => {
    setApplicants((prev) =>
      prev.map((a) =>
        a.id === applicantId ? { ...a, offerAcceptedAt: date } : a
      )
    );
  };

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Applicant Pipeline
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Track where applicants are in the background clearance process.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Applicant list */}
      <PipelineList applicants={filtered} onSetOfferDate={handleSetOfferDate} />
    </div>
  );
}
