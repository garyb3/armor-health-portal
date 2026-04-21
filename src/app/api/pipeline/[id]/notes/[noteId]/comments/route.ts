import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp, enforceMaxBodySize } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const STAFF_ROLES: string[] = ["HR", "ADMIN"];

type Params = { params: Promise<{ id: string; noteId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
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

    const comments = await prisma.noteComment.findMany({
      where: { noteId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      comments.map((c) => ({
        id: c.id,
        content: c.content,
        authorId: c.authorId,
        authorName: c.authorName,
        noteId: c.noteId,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt?.toISOString() ?? c.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const oversized = enforceMaxBodySize(request, 256 * 1024);
  if (oversized) return oversized;

  const ip = getClientIp(request);
  const { limited, retryAfterMs } = await rateLimit(`comments:${ip}`, 30, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  const { id, noteId } = await params;

  try {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.applicantId !== id) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const body = await request.json();
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const authorName = `${user.userFirstName} ${user.userLastName}`.trim() || user.userEmail;

    const comment = await prisma.noteComment.create({
      data: {
        content,
        authorId: user.userId,
        authorName,
        noteId,
        updatedAt: new Date(),
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "NOTE_COMMENT_ADDED",
          targetId: id,
          ipAddress: getClientIp(request),
          metadata: { noteId, commentId: comment.id, contentLength: content.length },
        },
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG_FAIL] NOTE_COMMENT_ADDED:", auditErr);
    }

    return NextResponse.json(
      {
        id: comment.id,
        content: comment.content,
        authorId: comment.authorId,
        authorName: comment.authorName,
        noteId: comment.noteId,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt?.toISOString() ?? comment.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
