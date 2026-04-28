"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Pencil,
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Archive,
} from "lucide-react";
import type { FormProgress, CandidateNote, NoteComment } from "@/types";
import { apiFetch } from "@/lib/api-client";
import { isArchivable } from "@/lib/pipeline-helpers";
import { useConfirm } from "@/components/ui/confirm-dialog";

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
  const { id, county } = useParams<{ id: string; county: string }>();
  const router = useRouter();
  const countyPrefix = `/${county}`;
  const [applicant, setApplicant] = useState<ApplicantDetail | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState<string>("");
  const [denyingStep, setDenyingStep] = useState<string | null>(null);
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteDraft, setEditNoteDraft] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(new Set());
  const [commentsByNote, setCommentsByNote] = useState<Record<string, NoteComment[]>>({});
  const [loadingCommentsFor, setLoadingCommentsFor] = useState<Set<string>>(new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [postingCommentFor, setPostingCommentFor] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState("");
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const { confirm, notify } = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    offerAcceptedAt: "",
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
      offerAcceptedAt: applicant.offerAcceptedAt
        ? applicant.offerAcceptedAt.slice(0, 10)
        : "",
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
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          offerAcceptedAt: editForm.offerAcceptedAt || null,
        }),
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

  const loadApplicantAbortRef = useRef<AbortController | null>(null);
  const loadApplicant = async () => {
    loadApplicantAbortRef.current?.abort();
    const controller = new AbortController();
    loadApplicantAbortRef.current = controller;
    try {
      const res = await apiFetch(`/api/pipeline/${id}`, { signal: controller.signal });
      if (!res.ok) return;
      const data = await res.json();
      if (loadApplicantAbortRef.current === controller) {
        setApplicant(data);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Failed to load applicant:", err);
    } finally {
      if (loadApplicantAbortRef.current === controller) {
        loadApplicantAbortRef.current = null;
      }
    }
  };

  const handleArchive = async () => {
    if (!applicant) return;
    const ok = await confirm({
      title: "Archive applicant?",
      description: `${applicant.firstName} ${applicant.lastName} will move to the archive. All data is retained and they can be restored later.`,
      confirmLabel: "Archive",
      variant: "destructive",
    });
    if (!ok) return;
    setArchiving(true);
    try {
      const res = await apiFetch(`/api/pipeline/${id}/archive`, { method: "POST" });
      if (res.ok) {
        router.push(`${countyPrefix}/pipeline`);
      } else {
        const data = await res.json().catch(() => ({}));
        await notify({
          title: "Couldn't archive applicant",
          description: data.error ?? "Please try again.",
        });
      }
    } catch (err) {
      console.error("Failed to archive applicant:", err);
    } finally {
      setArchiving(false);
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

  const startEditNote = (note: CandidateNote) => {
    setEditingNoteId(note.id);
    setEditNoteDraft(note.content);
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditNoteDraft("");
  };

  const handleSaveNote = async (noteId: string) => {
    const content = editNoteDraft.trim();
    if (!content) return;
    setSavingNoteId(noteId);
    try {
      const res = await apiFetch(`/api/pipeline/${id}/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const updated: CandidateNote = await res.json();
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, ...updated } : n))
        );
        cancelEditNote();
      }
    } catch (err) {
      console.error("Failed to update note:", err);
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const ok = await confirm({
      title: "Delete note?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    setDeletingNoteId(noteId);
    try {
      const res = await apiFetch(`/api/pipeline/${id}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        setExpandedNoteIds((prev) => {
          const next = new Set(prev);
          next.delete(noteId);
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    } finally {
      setDeletingNoteId(null);
    }
  };

  const loadCommentsForNote = async (noteId: string) => {
    setLoadingCommentsFor((prev) => new Set(prev).add(noteId));
    try {
      const res = await apiFetch(
        `/api/pipeline/${id}/notes/${noteId}/comments`
      );
      if (res.ok) {
        const data: NoteComment[] = await res.json();
        setCommentsByNote((prev) => ({ ...prev, [noteId]: data }));
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoadingCommentsFor((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    }
  };

  const toggleNoteExpanded = (noteId: string) => {
    setExpandedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
        if (!commentsByNote[noteId]) loadCommentsForNote(noteId);
      }
      return next;
    });
  };

  const handlePostComment = async (noteId: string) => {
    const content = (commentDrafts[noteId] ?? "").trim();
    if (!content) return;
    setPostingCommentFor(noteId);
    try {
      const res = await apiFetch(
        `/api/pipeline/${id}/notes/${noteId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      if (res.ok) {
        const created: NoteComment = await res.json();
        setCommentsByNote((prev) => ({
          ...prev,
          [noteId]: [...(prev[noteId] ?? []), created],
        }));
        setCommentDrafts((prev) => ({ ...prev, [noteId]: "" }));
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? { ...n, commentCount: (n.commentCount ?? 0) + 1 }
              : n
          )
        );
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setPostingCommentFor(null);
    }
  };

  const startEditComment = (c: NoteComment) => {
    setEditingCommentId(c.id);
    setEditCommentDraft(c.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentDraft("");
  };

  const handleSaveComment = async (noteId: string, commentId: string) => {
    const content = editCommentDraft.trim();
    if (!content) return;
    setSavingCommentId(commentId);
    try {
      const res = await apiFetch(
        `/api/pipeline/${id}/notes/${noteId}/comments/${commentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      if (res.ok) {
        const updated: NoteComment = await res.json();
        setCommentsByNote((prev) => ({
          ...prev,
          [noteId]: (prev[noteId] ?? []).map((c) =>
            c.id === commentId ? { ...c, ...updated } : c
          ),
        }));
        cancelEditComment();
      }
    } catch (err) {
      console.error("Failed to update comment:", err);
    } finally {
      setSavingCommentId(null);
    }
  };

  const handleDeleteComment = async (noteId: string, commentId: string) => {
    const ok = await confirm({
      title: "Delete comment?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    setDeletingCommentId(commentId);
    try {
      const res = await apiFetch(
        `/api/pipeline/${id}/notes/${noteId}/comments/${commentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setCommentsByNote((prev) => ({
          ...prev,
          [noteId]: (prev[noteId] ?? []).filter((c) => c.id !== commentId),
        }));
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? { ...n, commentCount: Math.max(0, (n.commentCount ?? 1) - 1) }
              : n
          )
        );
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
    } finally {
      setDeletingCommentId(null);
    }
  };

  useEffect(() => {
    loadApplicant().finally(() => setLoading(false));
    loadNotes();
    apiFetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.id) setCurrentUserId(data.user.id);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        loadApplicant();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [id]);

  const handleSetStepDates = async (
    formType: string,
    dates: { stepStartedAt?: string | null; stepCompletedAt?: string | null }
  ) => {
    const stepKey = FORM_STEPS.find((s) => s.key === formType)?.key;
    if (!stepKey) return;
    const priorProgress = applicant?.progress;
    setApplicant((prev) =>
      prev
        ? {
            ...prev,
            progress: prev.progress.map((p) =>
              p.formType === formType ? { ...p, ...dates } : p
            ),
          }
        : prev
    );
    const rollback = (errorMessage: string) => {
      setApplicant((prev) =>
        prev && priorProgress ? { ...prev, progress: priorProgress } : prev
      );
      void notify({
        title: "Couldn't save step dates",
        description: errorMessage,
      });
    };
    try {
      const res = await apiFetch(`/api/pipeline/${id}/step/${stepKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dates),
      });
      if (res.ok) {
        await loadApplicant();
        return;
      }
      const body = await res.json().catch(() => ({}));
      rollback(body?.error || "Please try again.");
    } catch (err) {
      console.error("Failed to update step dates:", err);
      rollback("Network error. Please try again.");
    }
  };

  const handleStepAction = async (
    formType: string,
    action: "approve" | "deny",
    note?: string
  ) => {
    const stepKey = FORM_STEPS.find((s) => s.key === formType)?.key;
    if (!stepKey) return;

    setActionLoading(`${formType}-${action}`);
    try {
      const res = await apiFetch(
        `/api/pipeline/${id}/step/${stepKey}`,
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
          href={`${countyPrefix}/pipeline`}
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
        href={`${countyPrefix}/pipeline`}
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
                  <div>
                    <label className="block text-xs font-medium text-gray-900 dark:text-gray-50 mb-1">
                      Offer accepted
                    </label>
                    <Input
                      type="date"
                      value={editForm.offerAcceptedAt}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          offerAcceptedAt: e.target.value,
                        }))
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
                  Offer accepted{" "}
                  {applicant.offerAcceptedAt
                    ? new Date(applicant.offerAcceptedAt).toLocaleDateString()
                    : "—"}
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
              <p className="text-sm text-gray-900 dark:text-gray-50">
                {applicant.completedCount} of {applicant.totalCount} steps
                completed
              </p>
              {isArchivable(applicant) && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={archiving}
                  onClick={handleArchive}
                  className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                >
                  {archiving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4 mr-1.5" />
                  )}
                  Archive Applicant
                </Button>
              )}
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
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Pipeline Steps</CardTitle>
            {(() => {
              const diffs = applicant.progress
                .filter((p) => p.stepStartedAt && p.stepCompletedAt)
                .map((p) =>
                  Math.max(
                    0,
                    Math.floor(
                      (new Date(p.stepCompletedAt!).getTime() -
                        new Date(p.stepStartedAt!).getTime()) /
                        86_400_000
                    )
                  )
                );
              const avg =
                diffs.length > 0
                  ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
                  : null;
              return (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-900 dark:text-gray-50 uppercase">
                    Avg
                  </span>
                  {avg !== null ? (
                    <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
                      {avg}d
                    </span>
                  ) : (
                    <span className="text-2xl font-bold text-gray-400 dark:text-gray-500 tabular-nums leading-none">
                      —
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
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
                    {status === "NOT_STARTED" && (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    )}
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

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <input
                      type="date"
                      className="text-xs border border-gray-300 dark:border-brand-700 dark:bg-brand-800 dark:text-gray-200 rounded px-1.5 py-0.5"
                      value={prog?.stepStartedAt ? new Date(prog.stepStartedAt).toLocaleDateString("en-CA", { timeZone: "UTC" }) : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleSetStepDates(step.key, {
                          stepStartedAt: val ? new Date(val).toISOString() : null,
                        });
                      }}
                      title="Started date"
                    />
                    <span className="text-xs text-gray-900 dark:text-gray-50">→</span>
                    <input
                      type="date"
                      className="text-xs border border-gray-300 dark:border-brand-700 dark:bg-brand-800 dark:text-gray-200 rounded px-1.5 py-0.5"
                      value={prog?.stepCompletedAt ? new Date(prog.stepCompletedAt).toLocaleDateString("en-CA", { timeZone: "UTC" }) : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleSetStepDates(step.key, {
                          stepCompletedAt: val ? new Date(val).toISOString() : null,
                        });
                      }}
                      title="Completed date"
                    />
                  </div>

                  {prog?.reviewNote && (
                    <p className="text-xs text-gray-900 dark:text-gray-50 mt-1">
                      Note: {prog.reviewNote}
                    </p>
                  )}
                </div>

                {/* Admin actions */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {status === "PENDING_REVIEW" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleStepAction(step.key, "approve")
                        }
                        disabled={actionLoading === `${step.key}-approve`}
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
                            disabled={actionLoading === `${step.key}-deny`}
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
                          onClick={() => {
                            setDenyingStep(step.key);
                            setDenyNote("");
                          }}
                          disabled={actionLoading === `${step.key}-approve`}
                          className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 gap-1"
                        >
                          <XCircle className="h-3 w-3" />
                          Deny
                        </Button>
                      )}
                    </>
                  )}

                  {(status === "APPROVED" || status === "COMPLETED") && (
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Completed
                    </span>
                  )}

                  {status === "DENIED" && (
                    <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                      <XCircle className="h-4 w-4" />
                      Denied
                    </span>
                  )}

                  {prog?.stepStartedAt && prog?.stepCompletedAt ? (
                    <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
                      {Math.max(
                        0,
                        Math.floor(
                          (new Date(prog.stepCompletedAt).getTime() -
                            new Date(prog.stepStartedAt).getTime()) /
                            86_400_000
                        )
                      )}
d
                    </span>
                  ) : (
                    <span className="text-2xl font-bold text-gray-400 dark:text-gray-500 tabular-nums leading-none">—</span>
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
          {notes.map((note) => {
            const isAuthor = note.authorId === currentUserId;
            const isEditing = editingNoteId === note.id;
            const edited =
              note.updatedAt &&
              new Date(note.updatedAt).getTime() -
                new Date(note.createdAt).getTime() >
                1000;
            const isExpanded = expandedNoteIds.has(note.id);
            const comments = commentsByNote[note.id] ?? [];
            const commentCount = note.commentCount ?? comments.length;

            return (
              <div
                key={note.id}
                className="p-3 rounded-lg bg-gray-50 dark:bg-brand-900/50 border border-transparent dark:border-white/40 text-sm"
              >
                {/* Header: author + original createdAt (stays at top) */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-700 dark:text-gray-200 text-xs">
                    {note.authorName}
                  </span>
                  <span className="text-gray-900 dark:text-gray-50 text-xs">
                    {new Date(note.createdAt).toLocaleString(undefined, {
                      timeZoneName: "short",
                    })}
                  </span>
                </div>

                {/* Body: content or edit form */}
                {isEditing ? (
                  <div className="mt-1">
                    <textarea
                      rows={3}
                      value={editNoteDraft}
                      onChange={(e) => setEditNoteDraft(e.target.value)}
                      className="w-full text-sm rounded-md border border-gray-300 dark:border-brand-700 bg-white dark:bg-brand-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    />
                    <div className="flex gap-1 mt-1">
                      <Button
                        size="sm"
                        disabled={
                          !editNoteDraft.trim() || savingNoteId === note.id
                        }
                        onClick={() => handleSaveNote(note.id)}
                      >
                        {savingNoteId === note.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEditNote}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
                    {note.content}
                  </p>
                )}

                {/* Footer: edited timestamp + author actions + comments toggle */}
                <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs">
                  {edited && (
                    <span className="italic text-gray-600 dark:text-gray-400">
                      Edited{" "}
                      {new Date(note.updatedAt!).toLocaleString(undefined, {
                        timeZoneName: "short",
                      })}
                    </span>
                  )}
                  {isAuthor && !isEditing && (
                    <>
                      <button
                        onClick={() => startEditNote(note)}
                        className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50"
                        title="Edit note"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={deletingNoteId === note.id}
                        className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                        title="Delete note"
                      >
                        {deletingNoteId === note.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}{" "}
                        Delete
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => toggleNoteExpanded(note.id)}
                    className="ml-auto inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50"
                    aria-expanded={isExpanded}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Comments ({commentCount})
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                </div>

                {/* Expanded comments panel */}
                {isExpanded && (
                  <div className="mt-3 pl-3 border-l-2 border-gray-200 dark:border-brand-700 space-y-2">
                    {loadingCommentsFor.has(note.id) && comments.length === 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                      </div>
                    )}
                    {comments.length === 0 && !loadingCommentsFor.has(note.id) && (
                      <p className="text-xs italic text-gray-600 dark:text-gray-400">
                        No comments yet.
                      </p>
                    )}
                    {comments.map((c) => {
                      const cIsAuthor = c.authorId === currentUserId;
                      const cIsEditing = editingCommentId === c.id;
                      const cEdited =
                        c.updatedAt &&
                        new Date(c.updatedAt).getTime() -
                          new Date(c.createdAt).getTime() >
                          1000;
                      return (
                        <div
                          key={c.id}
                          className="p-2 rounded-md bg-white dark:bg-brand-900 border border-gray-200 dark:border-brand-700 text-xs"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-200">
                              {c.authorName}
                            </span>
                            <span className="text-gray-900 dark:text-gray-50">
                              {new Date(c.createdAt).toLocaleString(undefined, {
                                timeZoneName: "short",
                              })}
                            </span>
                          </div>
                          {cIsEditing ? (
                            <div>
                              <textarea
                                rows={2}
                                value={editCommentDraft}
                                onChange={(e) =>
                                  setEditCommentDraft(e.target.value)
                                }
                                className="w-full text-xs rounded-md border border-gray-300 dark:border-brand-700 bg-white dark:bg-brand-800 dark:text-gray-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                              />
                              <div className="flex gap-1 mt-1">
                                <Button
                                  size="sm"
                                  disabled={
                                    !editCommentDraft.trim() ||
                                    savingCommentId === c.id
                                  }
                                  onClick={() =>
                                    handleSaveComment(note.id, c.id)
                                  }
                                >
                                  {savingCommentId === c.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditComment}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
                              {c.content}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-3">
                            {cEdited && (
                              <span className="italic text-gray-600 dark:text-gray-400">
                                Edited{" "}
                                {new Date(c.updatedAt!).toLocaleString(
                                  undefined,
                                  { timeZoneName: "short" }
                                )}
                              </span>
                            )}
                            {cIsAuthor && !cIsEditing && (
                              <>
                                <button
                                  onClick={() => startEditComment(c)}
                                  className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50"
                                >
                                  <Pencil className="h-3 w-3" /> Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteComment(note.id, c.id)
                                  }
                                  disabled={deletingCommentId === c.id}
                                  className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                                >
                                  {deletingCommentId === c.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}{" "}
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add-comment composer */}
                    <div className="flex gap-2 pt-1">
                      <textarea
                        rows={2}
                        placeholder="Add a comment..."
                        value={commentDrafts[note.id] ?? ""}
                        onChange={(e) =>
                          setCommentDrafts((prev) => ({
                            ...prev,
                            [note.id]: e.target.value,
                          }))
                        }
                        className="flex-1 text-xs rounded-md border border-gray-300 dark:border-brand-700 bg-white dark:bg-brand-800 dark:text-gray-200 px-2 py-1 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                      />
                      <Button
                        size="sm"
                        disabled={
                          !(commentDrafts[note.id] ?? "").trim() ||
                          postingCommentFor === note.id
                        }
                        onClick={() => handlePostComment(note.id)}
                        className="self-end !bg-black !text-white hover:!bg-gray-900 disabled:!bg-black disabled:!opacity-100 dark:!bg-white dark:!text-black dark:hover:!bg-gray-100"
                      >
                        {postingCommentFor === note.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Post"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {notes.length === 0 && (
            <p className="text-sm text-gray-900 dark:text-gray-50 italic">No notes yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
