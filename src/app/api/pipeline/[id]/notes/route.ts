import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const STAFF_ROLES: string[] = ["HR", "ADMIN"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const notes = await prisma.note.findMany({
      where: { applicantId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      notes.map((n) => ({
        id: n.id,
        content: n.content,
        authorId: n.authorId,
        authorName: n.authorName,
        applicantId: n.applicantId,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt?.toISOString() ?? n.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Failed to fetch notes:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const authorName = `${user.userFirstName} ${user.userLastName}`.trim() || user.userEmail;

    const note = await prisma.note.create({
      data: {
        content,
        authorId: user.userId,
        authorName,
        applicantId: id,
      },
    });

    // Audit log is best-effort — don't let it block note creation
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "NOTE_ADDED",
          targetId: id,
          ipAddress: getClientIp(request),
          metadata: { contentLength: content.length },
        },
      });
    } catch (auditErr) {
      console.error("Audit log failed for NOTE_ADDED:", auditErr);
    }

    return NextResponse.json(
      {
        id: note.id,
        content: note.content,
        authorId: note.authorId,
        authorName: note.authorName,
        applicantId: note.applicantId,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt?.toISOString() ?? note.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create note:", error instanceof Error ? error.message : error);
    console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error as object)));
    return NextResponse.json({ error: "Failed to create note", detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
