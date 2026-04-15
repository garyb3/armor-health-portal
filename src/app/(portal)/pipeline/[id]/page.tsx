"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Pencil,
} from "lucide-react";
import type { FormProgress, CandidateNote } from "@/types";
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
  HR: "HR",
  ADMIN: "Admin",
};

export default function ApplicantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [applicant, setApplicant] = useState<ApplicantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState<string>("");
  const [denyingStep, setDenyingStep] = useState<string | null>(null);
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editEmailError, setEditEmailError] = useState<string | null>(null);

  const startEditing = () => {
    if (!applicant) return;
    setEditForm({
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      email: applicant.email,
      phone: applicant.phone ?? "",
    });
    setEditError(null);
    setEditEmailError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditError(null);
    setEditEmailError(null);
  };

  const handleSaveEdit = async () => {
    setEditError(null);
    setEditEmailError(null);
    const firstName = editForm.firstName.trim();
    const lastName = editForm.lastName.trim();
    const email = editForm.email.trim();
    const phone = editForm.phone.trim();

    if (!firstName) return setEditError("First name is required");
    if (!lastName) return setEditError("Last name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setEditEmailError("Invalid email address");
    }

    setSavingEdit(true);
    try {
      const res = await apiFetch(`/api/pipeline/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone }),
      });
      if (res.status === 409) {
        setEditEmailError("Email already in use");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data?.error || "Failed to save changes");
        return;
      }
      await loadApplicant();
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save applicant edits:", err);
      setEditError("Failed to save changes");
    } finally {
      setSavingEdit(false);
    }
  };

  const loadApplicant = async () => {
    try {
      const res = await apiFetch(`/api/pipeline/${id}`);
      if (!res.ok) return;
      setApplicant(await res.json());
    } catch (err) {
      console.error("Failed to load applicant:", err);
    }
  };

  const loadNotes = async () => {
    try {
      const res = await apiFetch(`/api/pipeline/${id}/notes`);
      if (res.ok) setNotes(await res.json());
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await apiFetch(`/api/pipeline/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      if (res.ok) {
        const created: CandidateNote = await res.json();
        setNotes((prev) => [created, ...prev]);
        setNewNote("");
      }
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setAddingNote(false);
    }
  };

  useEffect(() => {
    loadApplicant().finally(() => setLoading(false));
    loadNotes();
  }, [id]);

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
        `/api/pipeline/${id}/step/${slug}`,
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
        <p className="text-gray-900">Applicant not found.</p>
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
        className="inline-flex items-center gap-1 text-sm text-gray-900 dark:text-gray-50 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Applicant info */}
      <Card className="relative">
        {!isEditing && (
          <Button
            size="sm"
            onClick={startEditing}
            className="absolute top-4 right-4 z-10 gap-1 !bg-black !text-white hover:!bg-gray-900 dark:!bg-white dark:!text-black dark:hover:!bg-gray-100"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3 max-w-md">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-900 dark:text-gray-50 mb-1">
                        First name
                      </label>
                      <Input
                        value={editForm.firstName}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, firstName: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 dark:text-gray-50 mb-1">
                        Last name
                      </label>
                      <Input
                        value={editForm.lastName}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, lastName: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 dark:text-gray-50 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={editForm.email}
                      error={!!editEmailError}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, email: e.target.value }))
                      }
                    />
                    {editEmailError && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {editEmailError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 dark:text-gray-50 mb-1">
                      Phone
                    </label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, phone: e.target.value }))
                      }
                    />
                  </div>
                  {editError && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {editError}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="!bg-black !text-white hover:!bg-gray-900 disabled:!bg-black disabled:!opacity-100 dark:!bg-white dark:!text-black dark:hover:!bg-gray-100"
                    >
                      {savingEdit ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEditing}
                      disabled={savingEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    {applicant.firstName} {applicant.lastName}
                  </h1>
                  <p className="text-sm text-gray-900 dark:text-gray-50 mt-0.5">
                    {ROLE_LABELS[applicant.role] || applicant.role}
                  </p>

                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-50">
                      <Mail className="h-4 w-4 text-gray-900 dark:text-gray-50" />
                      {applicant.email}
                    </div>
                    {applicant.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-50">
                        <Phone className="h-4 w-4 text-gray-900 dark:text-gray-50" />
                        {applicant.phone}
                      </div>
                    )}
                  </div>
                </>
              )}
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-50">
                  <Calendar className="h-4 w-4 text-gray-900 dark:text-gray-50" />
                  Registered{" "}
                  {new Date(applicant.createdAt).toLocaleDateString()}
                </div>
                {applicant.offerAcceptedAt && (
                  <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-50">
                    <Calendar className="h-4 w-4 text-gray-900 dark:text-gray-50" />
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
              <p className="text-sm text-gray-900 dark:text-gray-50">
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
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-white/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-50 uppercase">
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
                    <p className="text-xs text-gray-900 dark:text-gray-50 mt-1">
                      {status === "APPROVED" ? "Approved" : "Denied"} on{" "}
                      {new Date(prog.reviewedAt).toLocaleString(undefined, { timeZoneName: 'short' })}
                      {prog.reviewNote && (
                        <span className="block text-gray-900 dark:text-gray-50 mt-0.5">
                          Note: {prog.reviewNote}
                        </span>
                      )}
                    </p>
                  )}

                  {/* Elapsed time */}
                  {prog?.statusChangedAt &&
                    status !== "APPROVED" &&
                    status !== "COMPLETED" && (
                      <p className="text-xs text-gray-900 dark:text-gray-50 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Since{" "}
                        {new Date(prog.statusChangedAt).toLocaleString(undefined, { timeZoneName: 'short' })}
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
                      Completed
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

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add note form */}
          <div className="flex gap-2">
            <textarea
              rows={2}
              placeholder="Add a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="flex-1 text-sm rounded-md border border-gray-300 dark:border-brand-700 bg-white dark:bg-brand-800 dark:text-gray-200 px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
            <Button
              size="sm"
              disabled={!newNote.trim() || addingNote}
              onClick={handleAddNote}
              className="self-end !bg-black !text-white hover:!bg-gray-900 disabled:!bg-black disabled:!opacity-100 dark:!bg-white dark:!text-black dark:hover:!bg-gray-100"
            >
              {addingNote ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </div>

          {/* Notes list */}
          {notes.map((note) => (
            <div key={note.id} className="p-3 rounded-lg bg-gray-50 dark:bg-brand-900/50 border border-transparent dark:border-white/40 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-700 dark:text-gray-200 text-xs">
                  {note.authorName}
                </span>
                <span className="text-gray-900 dark:text-gray-50 text-xs">
                  {new Date(note.createdAt).toLocaleString(undefined, { timeZoneName: 'short' })}
                </span>
              </div>
              <p className="text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
                {note.content}
              </p>
            </div>
          ))}

          {notes.length === 0 && (
            <p className="text-sm text-gray-900 dark:text-gray-50 italic">No notes yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
