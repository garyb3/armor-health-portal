import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp, requireCountyAccess } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

// COUNTY_REP allowed: updateMany/deleteMany scope by authorId+countyId; non-author or wrong-county = 404.
const STAFF_ROLES: string[] = ["HR", "ADMIN", "COUNTY_REP"];

type Params = { params: Promise<{ id: string; noteId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id, noteId } = await params;

  try {
    const body = await request.json();
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    if (content.length > 10_000) {
      return NextResponse.json({ error: "Note is too long" }, { status: 400 });
    }

    // Fold ownership + applicant-scoping + tenant-scoping into a single atomic updateMany.
    // count=0 means "not found OR not yours OR wrong county" — return 404 either way (don't leak existence).
    const { count } = await prisma.note.updateMany({
      where: { id: noteId, applicantId: id, authorId: user.userId, countyId: county.id },
      data: { content, updatedAt: new Date() },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const updated = await prisma.note.findUniqueOrThrow({ where: { id: noteId } });

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
      console.error("[AUDIT_LOG_FAIL] NOTE_EDITED:", auditErr);
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

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id, noteId } = await params;

  try {
    // Fold ownership + applicant-scoping + tenant-scoping into a single atomic deleteMany.
    const { count } = await prisma.note.deleteMany({
      where: { id: noteId, applicantId: id, authorId: user.userId, countyId: county.id },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

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
      console.error("[AUDIT_LOG_FAIL] NOTE_DELETED:", auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete note:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
