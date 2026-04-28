"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PipelineList } from "@/components/pipeline/pipeline-list";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { apiFetch } from "@/lib/api-client";
import { FORM_STEPS } from "@/lib/constants";
import { isValidBucket, filterByBucket, BUCKET_CONFIG } from "@/lib/time-buckets";
import type { PipelineApplicant, CandidateNote } from "@/types";

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const county = params.county as string;
  const countyPrefix = `/${county}`;

  const [applicants, setApplicants] = useState<PipelineApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesMap, setNotesMap] = useState<Record<string, CandidateNote[]>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Abort in-flight offer-date PATCHes when a newer edit comes in so stale
  // responses can't overwrite newer local state.
  const offerDateAbortersRef = useRef<Map<string, AbortController>>(new Map());
  const { notify } = useConfirm();

  const valid = isValidBucket(slug);

  useEffect(() => {
    if (!valid) {
      router.replace(`${countyPrefix}/pipeline`);
      return;
    }
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
    apiFetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.user?.id) setCurrentUserId(data.user.id); })
      .catch(() => {});
  }, [valid, router]);

  if (!valid) return null;

  const config = BUCKET_CONFIG[slug];

  const filtered = filterByBucket(applicants, slug);

  const handleSetOfferDate = async (applicantId: string, date: string | null) => {
    offerDateAbortersRef.current.get(applicantId)?.abort();
    const controller = new AbortController();
    offerDateAbortersRef.current.set(applicantId, controller);
    try {
      const res = await apiFetch(`/api/pipeline/${applicantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerAcceptedAt: date }),
        signal: controller.signal,
      });
      if (res.ok) {
        setApplicants((prev) =>
          prev.map((a) =>
            a.id === applicantId ? { ...a, offerAcceptedAt: date } : a
          )
        );
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Failed to update offer date:", err);
    } finally {
      if (offerDateAbortersRef.current.get(applicantId) === controller) {
        offerDateAbortersRef.current.delete(applicantId);
      }
    }
  };

  const handleSetStepDates = async (
    applicantId: string,
    formType: string,
    dates: { stepStartedAt?: string | null; stepCompletedAt?: string | null }
  ) => {
    const step = FORM_STEPS.find((s) => s.key === formType);
    if (!step) return;
    try {
      const res = await apiFetch(`/api/pipeline/${applicantId}/step/${step.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dates),
      });
      if (res.ok) {
        setApplicants((prev) =>
          prev.map((a) =>
            a.id === applicantId
              ? {
                  ...a,
                  progress: a.progress.map((p) =>
                    p.formType === formType ? { ...p, ...dates } : p
                  ),
                }
              : a
          )
        );
      }
    } catch (err) {
      console.error("Failed to update step dates:", err);
    }
  };

  const handleFetchNotes = async (applicantId: string) => {
    try {
      const res = await apiFetch(`/api/pipeline/${applicantId}/notes`);
      if (res.ok) {
        const notes: CandidateNote[] = await res.json();
        setNotesMap((prev) => ({ ...prev, [applicantId]: notes }));
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    }
  };

  const handleAddNote = async (applicantId: string, content: string) => {
    const res = await apiFetch(`/api/pipeline/${applicantId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to add note");
    }
    const newNote: CandidateNote = await res.json();
    setNotesMap((prev) => ({
      ...prev,
      [applicantId]: [newNote, ...(prev[applicantId] || [])],
    }));
  };

  const handleEditNote = async (applicantId: string, noteId: string, content: string) => {
    const res = await apiFetch(`/api/pipeline/${applicantId}/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to edit note");
    }
    const updated: CandidateNote = await res.json();
    setNotesMap((prev) => ({
      ...prev,
      [applicantId]: (prev[applicantId] || []).map((n) =>
        n.id === noteId ? updated : n
      ),
    }));
  };

  const handleDeleteNote = async (applicantId: string, noteId: string) => {
    const res = await apiFetch(`/api/pipeline/${applicantId}/notes/${noteId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to delete note");
    }
    setNotesMap((prev) => ({
      ...prev,
      [applicantId]: (prev[applicantId] || []).filter((n) => n.id !== noteId),
    }));
  };

  const handleRemoveCandidate = async (applicantId: string) => {
    try {
      const res = await apiFetch(`/api/pipeline/${applicantId}/remove`, {
        method: "POST",
      });
      if (res.ok) {
        setApplicants((prev) => prev.filter((a) => a.id !== applicantId));
      }
    } catch (err) {
      console.error("Failed to remove candidate:", err);
    }
  };

  const handleArchive = async (applicantId: string) => {
    try {
      const res = await apiFetch(`/api/pipeline/${applicantId}/archive`, {
        method: "POST",
      });
      if (res.ok) {
        setApplicants((prev) => prev.filter((a) => a.id !== applicantId));
      } else {
        const data = await res.json().catch(() => ({}));
        await notify({
          title: "Couldn't archive applicant",
          description: data.error ?? "Please try again.",
        });
      }
    } catch (err) {
      console.error("Failed to archive applicant:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`${countyPrefix}/pipeline`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-900 dark:text-gray-50 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${config.dotColor}`} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {config.label}
          </h1>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            ({filtered.length})
          </span>
        </div>
        <p className="text-black dark:text-gray-50 mt-1 text-sm ml-6">
          Candidates who have been in the pipeline for {config.label.toLowerCase()}.
        </p>
      </div>

      {/* Applicant list */}
      <PipelineList
        applicants={filtered}
        notesMap={notesMap}
        currentUserId={currentUserId}
        onFetchNotes={handleFetchNotes}
        onAddNote={handleAddNote}
        onEditNote={handleEditNote}
        onDeleteNote={handleDeleteNote}
        onSetOfferDate={handleSetOfferDate}
        onSetStepDates={handleSetStepDates}
        onRemoveCandidate={handleRemoveCandidate}
        onArchive={handleArchive}
      />
    </div>
  );
}
