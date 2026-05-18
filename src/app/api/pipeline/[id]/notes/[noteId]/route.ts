import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp, requireCountyAccess, parseJsonBody } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// COUNTY_REP allowed: updateMany/deleteMany scope by authorId+countyId; non-author or wrong-county = 404.
const STAFF_ROLES: string[] = ["HR", "ADMIN", "COUNTY_REP"];

type Params = { params: Promise<{ id: string; noteId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { limited, retryAfterMs } = await rateLimit(`note-edit:${user.userId}`, 30, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id, noteId } = await params;
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
      return NextResponse.json({ error: "Note is too long" }, { status: 400 });
    }

    // Re-read archivedAt inside the tx so a concurrent archive can't slip
    // between the check and the update. updateMany still folds
    // ownership + applicant + tenant scoping into the write itself.
    // Audit log lives in the same tx — a crash between commit and log would
    // otherwise drop the audit row.
    const txResult = await prisma.$transaction(async (tx) => {
      const applicant = await tx.applicant.findUnique({
        where: { id },
        select: { archivedAt: true },
      });
      if (applicant?.archivedAt) {
        return { error: "Cannot modify archived applicant", status: 409 } as const;
      }
      const { count } = await tx.note.updateMany({
        where: { id: noteId, applicantId: id, authorId: user.userId, countyId: county.id },
        data: { content, updatedAt: new Date() },
      });
      if (count === 0) {
        return { error: "Note not found", status: 404 } as const;
      }
      const fresh = await tx.note.findUniqueOrThrow({ where: { id: noteId } });
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "NOTE_EDITED",
          targetId: id,
          ipAddress: ip,
          countyId: county.id,
          metadata: { noteId, contentLength: content.length },
        },
      });
      return { note: fresh } as const;
    });
    if ("error" in txResult) {
      return NextResponse.json({ error: txResult.error }, { status: txResult.status });
    }
    const updated = txResult.note;

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

  const { limited, retryAfterMs } = await rateLimit(`note-delete:${user.userId}`, 30, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id, noteId } = await params;
  const ip = getClientIp(request);

  try {
    // Re-read archivedAt inside the tx so a concurrent archive can't slip
    // between the check and the delete. deleteMany still folds
    // ownership + applicant + tenant scoping into the write itself.
    // Audit log lives in the same tx so a crash between commit and log can't
    // drop the audit row.
    const txResult = await prisma.$transaction(async (tx) => {
      const applicant = await tx.applicant.findUnique({
        where: { id },
        select: { archivedAt: true },
      });
      if (applicant?.archivedAt) {
        return { error: "Cannot modify archived applicant", status: 409 } as const;
      }
      const { count } = await tx.note.deleteMany({
        where: { id: noteId, applicantId: id, authorId: user.userId, countyId: county.id },
      });
      if (count === 0) {
        return { error: "Note not found", status: 404 } as const;
      }
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "NOTE_DELETED",
          targetId: id,
          ipAddress: ip,
          countyId: county.id,
          metadata: { noteId },
        },
      });
      return null;
    });
    if (txResult) {
      return NextResponse.json({ error: txResult.error }, { status: txResult.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete note:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
