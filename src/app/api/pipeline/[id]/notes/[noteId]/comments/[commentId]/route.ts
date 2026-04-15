import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const STAFF_ROLES: string[] = ["HR", "ADMIN"];

type Params = { params: Promise<{ id: string; noteId: string; commentId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, noteId, commentId } = await params;

  try {
    const comment = await prisma.noteComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.noteId !== noteId) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.applicantId !== id) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    if (comment.authorId !== user.userId) {
      return NextResponse.json({ error: "You can only edit your own comments" }, { status: 403 });
    }

    const body = await request.json();
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const updated = await prisma.noteComment.update({
      where: { id: commentId },
      data: { content, updatedAt: new Date() },
    });

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
      console.error("Audit log failed for NOTE_COMMENT_EDITED:", auditErr);
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

  const { id, noteId, commentId } = await params;

  try {
    const comment = await prisma.noteComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.noteId !== noteId) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.applicantId !== id) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    if (comment.authorId !== user.userId) {
      return NextResponse.json({ error: "You can only delete your own comments" }, { status: 403 });
    }

    await prisma.noteComment.delete({ where: { id: commentId } });

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
      console.error("Audit log failed for NOTE_COMMENT_DELETED:", auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
