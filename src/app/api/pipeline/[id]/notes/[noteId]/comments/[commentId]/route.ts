import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp, requireCountyAccess, parseJsonBody } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const STAFF_ROLES: string[] = ["HR", "ADMIN", "COUNTY_REP"];

type Params = { params: Promise<{ id: string; noteId: string; commentId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { limited, retryAfterMs } = await rateLimit(`comment-edit:${user.userId}`, 30, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id, noteId, commentId } = await params;
  const ip = getClientIp(request);

  try {
    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    if (content.length > 10_000) {
      return NextResponse.json({ error: "Comment is too long" }, { status: 400 });
    }

    // Re-read note + applicant.archivedAt inside the tx so a concurrent archive
    // can't slip between the check and the update. Audit log lives in the same
    // tx so a crash between commit and log can't drop the audit row.
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
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "NOTE_COMMENT_EDITED",
          targetId: id,
          ipAddress: ip,
          countyId: county.id,
          metadata: { noteId, commentId, contentLength: content.length },
        },
      });
      return { comment: fresh } as const;
    });
    if ("error" in txResult) {
      return NextResponse.json({ error: txResult.error }, { status: txResult.status });
    }
    const updated = txResult.comment;

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

  const { limited, retryAfterMs } = await rateLimit(`comment-delete:${user.userId}`, 30, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id, noteId, commentId } = await params;
  const ip = getClientIp(request);

  try {
    // Re-read note + applicant.archivedAt inside the tx so a concurrent archive
    // can't slip between the check and the delete. Audit log lives in the same
    // tx so a crash between commit and log can't drop the audit row.
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
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "NOTE_COMMENT_DELETED",
          targetId: id,
          ipAddress: ip,
          countyId: county.id,
          metadata: { noteId, commentId },
        },
      });
      return null;
    });
    if (txResult) {
      return NextResponse.json({ error: txResult.error }, { status: txResult.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
