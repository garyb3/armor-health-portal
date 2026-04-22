"use client";

import { useState } from "react";
import Link from "next/link";
import { FORM_STEPS, PIPELINE_STAGES } from "@/lib/constants";
import { formatElapsed } from "@/lib/format-elapsed";
import { cn } from "@/lib/utils";
import { Check, X, ChevronDown, ChevronRight, Trash2, Pencil, Loader2, AlertTriangle, MessageSquare, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { isArchivable } from "@/lib/pipeline-helpers";
import type { PipelineApplicant, FormProgress, CandidateNote, NoteComment } from "@/types";

const STAGE_SHORT: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.key, s.shortTitle])
);

function sortedStages(progress: FormProgress[]) {
  return FORM_STEPS.map((step) => {
    const p = progress.find((pr) => pr.formType === step.key);
    const done = !!(p?.stepStartedAt && p?.stepCompletedAt);
    return { ...step, progress: p, done };
  });
}

function getCompletionDate(applicant: PipelineApplicant): string | null {
  if (applicant.currentStage !== "COMPLETED") return null;
  const dates = applicant.progress
    .filter((p) => p.status === "APPROVED")
    .map((p) => new Date(p.statusChangedAt).getTime());
  return dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;
}

function sortApplicants(applicants: PipelineApplicant[]): PipelineApplicant[] {
  return [...applicants].sort((a, b) => {
    // Primary: longest time in process first (oldest createdAt first)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

interface PipelineListProps {
  applicants: PipelineApplicant[];
  notesMap: Record<string, CandidateNote[]>;
  currentUserId?: string | null;
  onFetchNotes: (id: string) => void;
  onAddNote: (id: string, content: string) => Promise<void>;
  onEditNote: (applicantId: string, noteId: string, content: string) => Promise<void>;
  onDeleteNote: (applicantId: string, noteId: string) => Promise<void>;
  onSetOfferDate?: (id: string, date: string | null) => void;
  onSetStepDates?: (applicantId: string, formType: string, dates: { stepStartedAt?: string | null; stepCompletedAt?: string | null }) => void;
  onRemoveCandidate?: (id: string) => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
}

export function PipelineList({ applicants, notesMap, currentUserId, onFetchNotes, onAddNote, onEditNote, onDeleteNote, onSetOfferDate, onSetStepDates, onRemoveCandidate, onArchive }: PipelineListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({});
  const [addingNote, setAddingNote] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [deletingNote, setDeletingNote] = useState<string | null>(null);
  const [confirmingDeleteNoteId, setConfirmingDeleteNoteId] = useState<string | null>(null);
  const [confirmingEditNoteId, setConfirmingEditNoteId] = useState<string | null>(null);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(new Set());
  const [commentsByNote, setCommentsByNote] = useState<Record<string, NoteComment[]>>({});
  const [loadingCommentsFor, setLoadingCommentsFor] = useState<Set<string>>(new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [postingCommentFor, setPostingCommentFor] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState("");
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<Record<string, string>>({});

  const loadCommentsForNote = async (applicantId: string, noteId: string) => {
    setLoadingCommentsFor((prev) => new Set(prev).add(noteId));
    try {
      const res = await apiFetch(
        `/api/pipeline/${applicantId}/notes/${noteId}/comments`
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

  const toggleNoteExpanded = (applicantId: string, noteId: string) => {
    setExpandedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
        if (!commentsByNote[noteId]) loadCommentsForNote(applicantId, noteId);
      }
      return next;
    });
  };

  const handlePostComment = async (applicantId: string, noteId: string) => {
    const content = (commentDrafts[noteId] ?? "").trim();
    if (!content) return;
    setPostingCommentFor(noteId);
    setCommentError((prev) => {
      const { [noteId]: _drop, ...rest } = prev;
      return rest;
    });
    try {
      const res = await apiFetch(
        `/api/pipeline/${applicantId}/notes/${noteId}/comments`,
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
      } else {
        const data = await res.json().catch(() => ({}));
        setCommentError((prev) => ({
          ...prev,
          [noteId]: data?.error || `Failed to post (HTTP ${res.status})`,
        }));
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
      setCommentError((prev) => ({
        ...prev,
        [noteId]: "Network error posting comment",
      }));
    } finally {
      setPostingCommentFor(null);
    }
  };

  const handleSaveComment = async (
    applicantId: string,
    noteId: string,
    commentId: string
  ) => {
    const content = editCommentDraft.trim();
    if (!content) return;
    setSavingCommentId(commentId);
    try {
      const res = await apiFetch(
        `/api/pipeline/${applicantId}/notes/${noteId}/comments/${commentId}`,
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
        setEditingCommentId(null);
        setEditCommentDraft("");
      }
    } catch (err) {
      console.error("Failed to update comment:", err);
    } finally {
      setSavingCommentId(null);
    }
  };

  const handleDeleteComment = async (
    applicantId: string,
    noteId: string,
    commentId: string
  ) => {
    if (!confirm("Delete this comment?")) return;
    setDeletingCommentId(commentId);
    try {
      const res = await apiFetch(
        `/api/pipeline/${applicantId}/notes/${noteId}/comments/${commentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setCommentsByNote((prev) => ({
          ...prev,
          [noteId]: (prev[noteId] ?? []).filter((c) => c.id !== commentId),
        }));
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        onFetchNotes(id);
      }
      return next;
    });

  const sorted = sortApplicants(applicants);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-gray-900 dark:text-gray-50">
        No applicants found.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((applicant) => {
        const isOpen = expanded.has(applicant.id);
        const stages = sortedStages(applicant.progress);

        return (
          <div
            key={applicant.id}
            className={cn(
              "rounded-xl bg-white dark:bg-brand-800 ring-1 ring-gray-200/60 dark:ring-brand-700/60 shadow-sm border-l-[3px]",
              (() => {
                const d = Math.floor((Date.now() - new Date(applicant.createdAt).getTime()) / 86_400_000);
                return d >= 21 ? "border-l-rose-500" : d >= 11 ? "border-l-amber-400" : "border-l-emerald-500";
              })(),
            )}
          >
            {/* Collapsed row */}
            <button
              type="button"
              onClick={() => toggle(applicant.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-brand-700/50 rounded-xl transition-colors"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-gray-900 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-900 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {applicant.firstName} {applicant.lastName}
                </span>
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-50">
                  ({applicant.progress.filter((p) => p.stepStartedAt && p.stepCompletedAt).length}/{applicant.totalCount})
                </span>
                <span className="ml-2 text-sm font-bold text-gray-700 dark:text-gray-50">
                  • {formatElapsed(applicant.createdAt)} in process
                </span>
                {applicant.offerAcceptedAt && (() => {
                  const completionDate = getCompletionDate(applicant);
                  if (completionDate) {
                    const days = Math.floor(
                      (new Date(completionDate).getTime() - new Date(applicant.offerAcceptedAt).getTime()) / 86_400_000
                    );
                    return (
                      <span className="ml-2 text-xs text-emerald-500">
                        • {days}d offer→complete
                      </span>
                    );
                  }
                  return (
                    <span className="ml-2 text-xs text-blue-500 dark:text-blue-400">
                      • {formatElapsed(applicant.offerAcceptedAt)} since offer
                    </span>
                  );
                })()}
                {applicant.isStale && (
                  <span className="ml-2 text-[10px] bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">
                    Stale
                  </span>
                )}
              </div>

              <Link
                href={`/pipeline/${applicant.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                View
              </Link>
            </button>

            {/* Expanded dropdown */}
            {isOpen && (
              <div className="px-4 pb-3 pt-0">
                <div className="border-t border-gray-100 dark:border-brand-700 pt-3 space-y-2">
                  {stages.map((stage) => {
                    const p = stage.progress;
                    const done = stage.done;
                    const daysBetween =
                      p?.stepStartedAt && p?.stepCompletedAt
                        ? Math.max(0, Math.floor((new Date(p.stepCompletedAt).getTime() - new Date(p.stepStartedAt).getTime()) / 86_400_000))
                        : null;

                    return (
                      <div
                        key={stage.key}
                        className="flex items-center gap-3 text-sm"
                      >
                        {done ? (
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-400 shrink-0" />
                        )}
                        <span
                          className={cn(
                            "min-w-0",
                            done
                              ? "text-gray-900 dark:text-gray-50"
                              : "text-gray-900 dark:text-gray-100 font-medium"
                          )}
                        >
                          {STAGE_SHORT[stage.key] || stage.title}
                        </span>
                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                          <input
                            type="date"
                            className="text-xs border border-gray-300 dark:border-brand-700 dark:bg-brand-800 dark:text-gray-200 rounded px-1.5 py-0.5"
                            value={p?.stepStartedAt ? new Date(p.stepStartedAt).toLocaleDateString('en-CA', { timeZone: 'UTC' }) : ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              onSetStepDates?.(applicant.id, stage.key, {
                                stepStartedAt: val ? new Date(val).toISOString() : null,
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            title="Started date"
                          />
                          <span className="text-xs text-gray-900">→</span>
                          <input
                            type="date"
                            className="text-xs border border-gray-300 dark:border-brand-700 dark:bg-brand-800 dark:text-gray-200 rounded px-1.5 py-0.5"
                            value={p?.stepCompletedAt ? new Date(p.stepCompletedAt).toLocaleDateString('en-CA', { timeZone: 'UTC' }) : ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              onSetStepDates?.(applicant.id, stage.key, {
                                stepCompletedAt: val ? new Date(val).toISOString() : null,
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            title="Completed date"
                          />
                          {daysBetween !== null ? (
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-50 tabular-nums w-8 text-right">
                              {daysBetween}d
                            </span>
                          ) : (
                            <span className="text-xs text-gray-900 tabular-nums w-8 text-right">
                              —
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Offer Accepted Date */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-brand-700">
                    <span className="text-xs text-gray-900 dark:text-gray-50">Offer accepted:</span>
                    {applicant.offerAcceptedAt ? (
                      <span className="text-xs text-gray-700 dark:text-gray-50">
                        {new Date(applicant.offerAcceptedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-900 italic">Not set</span>
                    )}
                    <input
                      type="date"
                      className="text-xs border border-gray-300 dark:border-brand-700 dark:bg-brand-800 dark:text-gray-200 rounded px-1.5 py-0.5 ml-auto"
                      value={applicant.offerAcceptedAt ? new Date(applicant.offerAcceptedAt).toLocaleDateString('en-CA', { timeZone: 'UTC' }) : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        onSetOfferDate?.(applicant.id, val ? new Date(val).toISOString() : null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Notes */}
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-brand-700">
                    <label className="text-xs text-gray-900 dark:text-gray-50 mb-2 block font-medium">
                      Notes
                    </label>

                    {/* Add note form */}
                    <div className="flex gap-2 mb-3">
                      <textarea
                        rows={2}
                        placeholder="Add a note..."
                        value={newNoteText[applicant.id] || ""}
                        onChange={(e) =>
                          setNewNoteText((prev) => ({ ...prev, [applicant.id]: e.target.value }))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-sm rounded-md border border-gray-300 dark:border-brand-700 bg-white dark:bg-brand-800 dark:text-gray-200 px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                      />
                      <Button
                        size="sm"
                        disabled={!newNoteText[applicant.id]?.trim() || addingNote === applicant.id}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const text = newNoteText[applicant.id]?.trim();
                          if (!text) return;
                          setAddingNote(applicant.id);
                          setNoteError(null);
                          try {
                            await onAddNote(applicant.id, text);
                            setNewNoteText((prev) => ({ ...prev, [applicant.id]: "" }));
                          } catch {
                            setNoteError("Failed to add note. Please try again.");
                          } finally {
                            setAddingNote(null);
                          }
                        }}
                        className="self-end !bg-black !text-white hover:!bg-gray-900 disabled:!bg-black disabled:!opacity-100 dark:!bg-white dark:!text-black dark:hover:!bg-gray-100"
                      >
                        {addingNote === applicant.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Add"
                        )}
                      </Button>
                    </div>

                    {noteError && (
                      <p className="text-sm text-red-500 mb-2">{noteError}</p>
                    )}

                    {/* Notes list */}
                    {(notesMap[applicant.id] || []).map((note) => (
                      <div key={note.id} className="relative mb-2 p-2 rounded-lg bg-gray-50 dark:bg-brand-900/50 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-700 dark:text-gray-200 text-xs">
                            {note.authorName}
                          </span>
                          <span className="text-gray-900 dark:text-gray-50 text-xs">
                            {new Date(note.createdAt).toLocaleString(undefined, { timeZoneName: 'short' })}
                          </span>
                          {note.authorId === currentUserId && editingNoteId !== note.id && (
                            <div className="ml-auto flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNoteId(note.id);
                                  setEditNoteText(note.content);
                                  setNoteError(null);
                                }}
                                className="text-gray-900 hover:text-gray-900 dark:hover:text-gray-50"
                                title="Edit note"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                disabled={deletingNote === note.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmingDeleteNoteId(note.id);
                                  setNoteError(null);
                                }}
                                className="text-gray-900 hover:text-red-500 dark:hover:text-red-400"
                                title="Delete note"
                              >
                                {deletingNote === note.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                        {editingNoteId === note.id ? (
                          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                            <textarea
                              rows={2}
                              value={editNoteText}
                              onChange={(e) => setEditNoteText(e.target.value)}
                              className="w-full text-sm rounded-md border border-gray-300 dark:border-brand-700 bg-white dark:bg-brand-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                            />
                            <div className="flex gap-1 mt-1">
                              <Button
                                size="sm"
                                disabled={!editNoteText.trim() || savingNote === note.id}
                                onClick={() => {
                                  setNoteError(null);
                                  setConfirmingEditNoteId(note.id);
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setConfirmingEditNoteId(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
                            {note.content}
                          </p>
                        )}

                        {/* Footer: edited timestamp + comments toggle */}
                        {editingNoteId !== note.id && (() => {
                          const edited =
                            note.updatedAt &&
                            new Date(note.updatedAt).getTime() -
                              new Date(note.createdAt).getTime() >
                              1000;
                          const isOpen = expandedNoteIds.has(note.id);
                          const noteComments = commentsByNote[note.id] ?? [];
                          const cCount = note.commentCount ?? noteComments.length;
                          return (
                            <>
                              <div className="mt-1 flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs">
                                {edited && (
                                  <span className="italic text-gray-600 dark:text-gray-400">
                                    Edited{" "}
                                    {new Date(note.updatedAt!).toLocaleString(
                                      undefined,
                                      { timeZoneName: "short" }
                                    )}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleNoteExpanded(applicant.id, note.id);
                                  }}
                                  className="ml-auto inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50"
                                  aria-expanded={isOpen}
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  Comments ({cCount})
                                  {isOpen ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </button>
                              </div>

                              {isOpen && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-2 pl-3 border-l-2 border-gray-200 dark:border-brand-700 space-y-2"
                                >
                                  {loadingCommentsFor.has(note.id) &&
                                    noteComments.length === 0 && (
                                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                        <Loader2 className="h-3 w-3 animate-spin" />{" "}
                                        Loading…
                                      </div>
                                    )}
                                  {noteComments.length === 0 &&
                                    !loadingCommentsFor.has(note.id) && (
                                      <p className="text-xs italic text-gray-600 dark:text-gray-400">
                                        No comments yet.
                                      </p>
                                    )}
                                  {noteComments.map((c) => {
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
                                            {new Date(c.createdAt).toLocaleString(
                                              undefined,
                                              { timeZoneName: "short" }
                                            )}
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
                                                  handleSaveComment(
                                                    applicant.id,
                                                    note.id,
                                                    c.id
                                                  )
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
                                                onClick={() => {
                                                  setEditingCommentId(null);
                                                  setEditCommentDraft("");
                                                }}
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
                                              {new Date(
                                                c.updatedAt!
                                              ).toLocaleString(undefined, {
                                                timeZoneName: "short",
                                              })}
                                            </span>
                                          )}
                                          {cIsAuthor && !cIsEditing && (
                                            <>
                                              <button
                                                onClick={() => {
                                                  setEditingCommentId(c.id);
                                                  setEditCommentDraft(c.content);
                                                }}
                                                className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50"
                                              >
                                                <Pencil className="h-3 w-3" /> Edit
                                              </button>
                                              <button
                                                onClick={() =>
                                                  handleDeleteComment(
                                                    applicant.id,
                                                    note.id,
                                                    c.id
                                                  )
                                                }
                                                disabled={
                                                  deletingCommentId === c.id
                                                }
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

                                  {commentError[note.id] && (
                                    <p className="text-xs text-red-500">
                                      {commentError[note.id]}
                                    </p>
                                  )}
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
                                      onClick={() =>
                                        handlePostComment(applicant.id, note.id)
                                      }
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
                            </>
                          );
                        })()}

                        {confirmingEditNoteId === note.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-2 right-2 bottom-2 flex items-center justify-between gap-2 rounded-md bg-white/95 dark:bg-brand-900/95 border border-red-300 dark:border-red-800 px-2 py-1 shadow-sm z-10"
                          >
                            <span className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-200">
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              Save this change?
                            </span>
                            <div className="flex gap-1">
                              <button
                                disabled={savingNote === note.id}
                                onClick={() => setConfirmingEditNoteId(null)}
                                className="text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-brand-700 text-gray-900 dark:text-gray-50 hover:bg-gray-50 dark:hover:bg-brand-800"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={savingNote === note.id}
                                onClick={async () => {
                                  setSavingNote(note.id);
                                  setNoteError(null);
                                  try {
                                    await onEditNote(applicant.id, note.id, editNoteText.trim());
                                    setEditingNoteId(null);
                                    setConfirmingEditNoteId(null);
                                  } catch {
                                    setNoteError("Failed to save note.");
                                  } finally {
                                    setSavingNote(null);
                                  }
                                }}
                                className="text-xs px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                {savingNote === note.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Confirm"
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {confirmingDeleteNoteId === note.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute inset-0 flex items-center justify-between gap-2 rounded-lg bg-white/95 dark:bg-brand-900/95 border border-red-300 dark:border-red-800 px-2 py-1 shadow-sm z-10"
                          >
                            <span className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-200">
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              Delete this note?
                            </span>
                            <div className="flex gap-1">
                              <button
                                disabled={deletingNote === note.id}
                                onClick={() => setConfirmingDeleteNoteId(null)}
                                className="text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-brand-700 text-gray-900 dark:text-gray-50 hover:bg-gray-50 dark:hover:bg-brand-800"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={deletingNote === note.id}
                                onClick={async () => {
                                  setDeletingNote(note.id);
                                  setNoteError(null);
                                  try {
                                    await onDeleteNote(applicant.id, note.id);
                                    setConfirmingDeleteNoteId(null);
                                  } catch {
                                    setNoteError("Failed to delete note.");
                                  } finally {
                                    setDeletingNote(null);
                                  }
                                }}
                                className="text-xs px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                {deletingNote === note.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Delete"
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {notesMap[applicant.id] && notesMap[applicant.id].length === 0 && (
                      <p className="text-xs text-gray-900 dark:text-gray-50 italic">No notes yet.</p>
                    )}
                  </div>

                  {/* Archive / Remove actions */}
                  {(onRemoveCandidate || onArchive) && (
                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-brand-700">
                      {onArchive && isArchivable(applicant) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={archivingId === applicant.id}
                          onClick={async () => {
                            if (!confirm(`Archive ${applicant.firstName} ${applicant.lastName}? All data is retained and they can be restored later.`)) return;
                            setArchivingId(applicant.id);
                            try {
                              await onArchive(applicant.id);
                            } finally {
                              setArchivingId(null);
                            }
                          }}
                          className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                        >
                          {archivingId === applicant.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Archive className="h-4 w-4 mr-1.5" />
                          )}
                          Archive
                        </Button>
                      )}
                      {onRemoveCandidate && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={removingId === applicant.id}
                          onClick={async () => {
                            if (!confirm(`Are you sure you want to remove ${applicant.firstName} ${applicant.lastName} from the pipeline?`)) return;
                            setRemovingId(applicant.id);
                            try {
                              await onRemoveCandidate(applicant.id);
                            } finally {
                              setRemovingId(null);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          {removingId === applicant.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-1.5" />
                          )}
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
