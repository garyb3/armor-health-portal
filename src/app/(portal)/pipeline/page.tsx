"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PipelineList } from "@/components/pipeline/pipeline-list";
import { Loader2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import type { PipelineApplicant, CandidateNote } from "@/types";
import { apiFetch } from "@/lib/api-client";
import { FORM_STEPS } from "@/lib/constants";

export default function PipelinePage() {
  const [applicants, setApplicants] = useState<PipelineApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add candidate dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    offerAcceptedAt: "",
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);
  const [avgOpen, setAvgOpen] = useState(false);
  const [notesMap, setNotesMap] = useState<Record<string, CandidateNote[]>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadApplicants = async () => {
    try {
      const res = await apiFetch("/api/pipeline");
      if (res.ok) {
        const data = await res.json();
        setApplicants(data.applicants);
      }
    } catch (err) {
      console.error("Failed to load pipeline:", err);
    }
  };

  useEffect(() => {
    loadApplicants().finally(() => setLoading(false));
    apiFetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.user?.id) setCurrentUserId(data.user.id); })
      .catch(() => {});
  }, []);

  const handleSetOfferDate = async (applicantId: string, date: string | null) => {
    try {
      const res = await apiFetch(`/api/pipeline/${applicantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerAcceptedAt: date }),
      });
      if (res.ok) {
        setApplicants((prev) =>
          prev.map((a) =>
            a.id === applicantId ? { ...a, offerAcceptedAt: date } : a
          )
        );
      }
    } catch (err) {
      console.error("Failed to update offer date:", err);
    }
  };

  const handleSetStepDates = async (
    applicantId: string,
    formType: string,
    dates: { stepStartedAt?: string | null; stepCompletedAt?: string | null }
  ) => {
    const slug = FORM_STEPS.find((s) => s.key === formType)?.slug;
    if (!slug) return;
    try {
      const res = await apiFetch(`/api/pipeline/${applicantId}/step/${slug}`, {
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

  const handleAddCandidate = async () => {
    if (!addForm.firstName.trim() || !addForm.lastName.trim()) {
      setAddError("First and last name are required");
      return;
    }
    if (!addForm.email.trim() || !addForm.email.includes("@")) {
      setAddError("A valid email is required");
      return;
    }

    setAddSaving(true);
    setAddError(null);
    try {
      const res = await apiFetch("/api/pipeline/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: addForm.firstName.trim(),
          lastName: addForm.lastName.trim(),
          email: addForm.email.trim(),
          phone: addForm.phone.trim() || null,
          offerAcceptedAt: addForm.offerAcceptedAt
            ? new Date(addForm.offerAcceptedAt).toISOString()
            : null,
        }),
      });

      if (res.ok) {
        setAddOpen(false);
        setAddForm({ firstName: "", lastName: "", email: "", phone: "", offerAcceptedAt: "" });
        await loadApplicants();
      } else {
        const data = await res.json();
        setAddError(data.error || "Failed to add candidate");
      }
    } catch {
      setAddError("Failed to add candidate");
    } finally {
      setAddSaving(false);
    }
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
          a.email.toLowerCase().includes(search.toLowerCase()) ||
          (a.phone && a.phone.includes(search))
      )
    : applicants;

  const avgDays = filtered.length > 0
    ? Math.round(filtered.reduce((sum, a) => sum + (Date.now() - new Date(a.createdAt).getTime()), 0) / filtered.length / 86_400_000)
    : 0;

  const buckets = filtered.reduce(
    (acc, a) => {
      const d = Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 86_400_000);
      if (d <= 10) { acc[0].total += d; acc[0].count++; }
      else if (d <= 20) { acc[1].total += d; acc[1].count++; }
      else { acc[2].total += d; acc[2].count++; }
      return acc;
    },
    [
      { label: "1 - 10 days", total: 0, count: 0 },
      { label: "11 - 20 days", total: 0, count: 0 },
      { label: "21+ days", total: 0, count: 0 },
    ]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Applicant Pipeline
          </h1>
          <p className="text-black dark:text-gray-50 mt-1 text-sm">
            Track where applicants are in the pipeline process.
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setAddError(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-1">
              <Plus className="h-4 w-4" />
              Add Candidate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Candidate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label required>First Name</Label>
                  <Input
                    value={addForm.firstName}
                    onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label required>Last Name</Label>
                  <Input
                    value={addForm.lastName}
                    onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label required>Email</Label>
                <Input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="candidate@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Offer Accepted Date</Label>
                <Input
                  type="date"
                  value={addForm.offerAcceptedAt}
                  onChange={(e) => setAddForm((f) => ({ ...f, offerAcceptedAt: e.target.value }))}
                />
              </div>

              {addError && (
                <p className="text-sm text-red-500">{addError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCandidate}
                  disabled={addSaving}
                  className="gap-1"
                >
                  {addSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                  Add Candidate
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Average time dropdown */}
      <div className="flex justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => setAvgOpen((o) => !o)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-brand-800 ring-1 ring-gray-200 dark:ring-brand-700 shadow-sm hover:shadow transition-all text-sm"
          >
            <span className="text-gray-900 dark:text-gray-50">Avg. Time in Process</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{avgDays}d</span>
            <ChevronDown className={`h-4 w-4 text-gray-900 transition-transform ${avgOpen ? "rotate-180" : ""}`} />
          </button>
          {avgOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-lg bg-white dark:bg-brand-800 ring-1 ring-gray-200 dark:ring-brand-700 shadow-lg z-10 p-3 space-y-2">
              <p className="text-xs font-medium text-gray-900 dark:text-gray-50 uppercase tracking-wider mb-2">Breakdown by Duration</p>
              {buckets.map((b, i) => {
                const colors = [
                  "bg-emerald-500",
                  "bg-amber-400",
                  "bg-rose-500",
                ];
                const avg = b.count > 0 ? Math.round(b.total / b.count) : 0;
                return (
                  <div key={b.label} className="flex items-center gap-3">
                    <div className={`w-1 h-8 rounded-full ${colors[i]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{b.label}</p>
                      <p className="text-xs text-gray-900 dark:text-gray-50">{b.count} candidate{b.count !== 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                      {b.count > 0 ? `${avg}d` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Applicant list */}
      <PipelineList applicants={filtered} notesMap={notesMap} currentUserId={currentUserId} onFetchNotes={handleFetchNotes} onAddNote={handleAddNote} onEditNote={handleEditNote} onDeleteNote={handleDeleteNote} onSetOfferDate={handleSetOfferDate} onSetStepDates={handleSetStepDates} onRemoveCandidate={handleRemoveCandidate} />
    </div>
  );
}
