import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp, requireCountyAccess } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const STAFF_ROLES: string[] = ["HR", "ADMIN", "COUNTY_REP"];

type Params = { params: Promise<{ id: string; noteId: string; commentId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id, noteId, commentId } = await params;

  try {
    const body = await request.json();
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Re-read note + applicant.archivedAt inside the tx so a concurrent
    // archive can't slip between the check and the update.
    const txResult = await prisma.$transaction(async (tx) => {
      const comment = await tx.noteComment.findUnique({ where: { id: commentId } });
      if (!comment || comment.noteId !== noteId) {
        return { error: "Comment not found", status: 404 } as const;
      }
      const note = await tx.note.findUnique({
        where: { id: noteId },
        include: { applicant: { select: { archivedAt: true } } },
      });
      if (!note || note.applicantId !== id || note.countyId !== county.id) {
        return { error: "Comment not found", status: 404 } as const;
      }
      if (note.applicant.archivedAt) {
        return { error: "Cannot modify archived applicant", status: 409 } as const;
      }
      if (comment.authorId !== user.userId) {
        return { error: "You can only edit your own comments", status: 403 } as const;
      }
      const fresh = await tx.noteComment.update({
        where: { id: commentId },
        data: { content, updatedAt: new Date() },
      });
      return { comment: fresh } as const;
    });
    if ("error" in txResult) {
      return NextResponse.json({ error: txResult.error }, { status: txResult.status });
    }
    const updated = txResult.comment;

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "NOTE_COMMENT_EDITED",
          targetId: id,
          ipAddress: getClientIp(request),
          metadata: { noteId, commentId, contentLength: content.length },
        },
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG_FAIL] NOTE_COMMENT_EDITED:", auditErr);
    }

    return NextResponse.json({
      id: updated.id,
      content: updated.content,
      authorId: updated.authorId,
      authorName: updated.authorName,
      noteId: updated.noteId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt?.toISOString() ?? updated.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to update comment:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id, noteId, commentId } = await params;

  try {
    // Re-read note + applicant.archivedAt inside the tx so a concurrent
    // archive can't slip between the check and the delete.
    const txResult = await prisma.$transaction(async (tx) => {
      const comment = await tx.noteComment.findUnique({ where: { id: commentId } });
      if (!comment || comment.noteId !== noteId) {
        return { error: "Comment not found", status: 404 } as const;
      }
      const note = await tx.note.findUnique({
        where: { id: noteId },
        include: { applicant: { select: { archivedAt: true } } },
      });
      if (!note || note.applicantId !== id || note.countyId !== county.id) {
        return { error: "Comment not found", status: 404 } as const;
      }
      if (note.applicant.archivedAt) {
        return { error: "Cannot modify archived applicant", status: 409 } as const;
      }
      if (comment.authorId !== user.userId) {
        return { error: "You can only delete your own comments", status: 403 } as const;
      }
      await tx.noteComment.delete({ where: { id: commentId } });
      return null;
    });
    if (txResult) {
      return NextResponse.json({ error: txResult.error }, { status: txResult.status });
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "NOTE_COMMENT_DELETED",
          targetId: id,
          ipAddress: getClientIp(request),
          metadata: { noteId, commentId },
        },
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG_FAIL] NOTE_COMMENT_DELETED:", auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
