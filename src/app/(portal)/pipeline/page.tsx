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
import { Loader2, Plus } from "lucide-react";
import type { PipelineApplicant } from "@/types";
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

  const handleUpdateNotes = async (applicantId: string, notes: string) => {
    try {
      const res = await apiFetch(`/api/pipeline/${applicantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        setApplicants((prev) =>
          prev.map((a) => (a.id === applicantId ? { ...a, notes } : a))
        );
      }
    } catch (err) {
      console.error("Failed to update notes:", err);
    }
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
          a.email.toLowerCase().includes(search.toLowerCase())
      )
    : applicants;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Applicant Pipeline
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Track where applicants are in the background clearance process.
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
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Applicant list */}
      <PipelineList applicants={filtered} onSetOfferDate={handleSetOfferDate} onSetStepDates={handleSetStepDates} onRemoveCandidate={handleRemoveCandidate} onUpdateNotes={handleUpdateNotes} />
    </div>
  );
}
