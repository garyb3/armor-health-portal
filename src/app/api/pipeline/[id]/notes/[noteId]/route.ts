import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const STAFF_ROLES: string[] = ["HR", "ADMIN"];

type Params = { params: Promise<{ id: string; noteId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, noteId } = await params;

  try {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.applicantId !== id) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    if (note.authorId !== user.userId) {
      return NextResponse.json({ error: "You can only edit your own notes" }, { status: 403 });
    }

    const body = await request.json();
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const updated = await prisma.note.update({
      where: { id: noteId },
      data: { content, updatedAt: new Date() },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "NOTE_EDITED",
          targetId: id,
          ipAddress: getClientIp(request),
          metadata: { noteId, contentLength: content.length },
        },
      });
    } catch (auditErr) {
      console.error("Audit log failed for NOTE_EDITED:", auditErr);
    }

    return NextResponse.json({
      id: updated.id,
      content: updated.content,
      authorId: updated.authorId,
      authorName: updated.authorName,
      applicantId: updated.applicantId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt?.toISOString() ?? updated.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to update note:", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, noteId } = await params;

  try {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.applicantId !== id) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    if (note.authorId !== user.userId) {
      return NextResponse.json({ error: "You can only delete your own notes" }, { status: 403 });
    }

    await prisma.note.delete({ where: { id: noteId } });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "NOTE_DELETED",
          targetId: id,
          ipAddress: getClientIp(request),
          metadata: { noteId },
        },
      });
    } catch (auditErr) {
      console.error("Audit log failed for NOTE_DELETED:", auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete note:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
