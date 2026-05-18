import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp, enforceMaxBodySize, requireCountyAccess, assertApplicantInCounty, parseJsonBody } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// COUNTY_REP allowed: requireCountyAccess + assertApplicantInCounty enforce tenant scoping.
const STAFF_ROLES: string[] = ["HR", "ADMIN", "COUNTY_REP"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id } = await params;

  const ownership = await assertApplicantInCounty(id, county.id);
  if (ownership) return ownership;

  try {
    const notes = await prisma.note.findMany({
      where: { applicantId: id, countyId: county.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { comments: true } } },
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
        commentCount: n._count.comments,
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

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const oversized = enforceMaxBodySize(request, 256 * 1024);
  if (oversized) return oversized;

  const ip = getClientIp(request);
  const { limited, retryAfterMs } = await rateLimit(`notes:${ip}`, 30, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  const { id } = await params;

  const ownership = await assertApplicantInCounty(id, county.id);
  if (ownership) return ownership;

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

    const authorName = `${user.userFirstName} ${user.userLastName}`.trim() || user.userEmail;

    // Re-read archivedAt inside the tx so a concurrent archive can't slip
    // between the check and the create. Audit log lives in the same tx so a
    // process crash between commit and log can't drop the audit row.
    const txResult = await prisma.$transaction(async (tx) => {
      const applicant = await tx.applicant.findUnique({
        where: { id },
        select: { archivedAt: true },
      });
      if (applicant?.archivedAt) {
        return { error: "Cannot modify archived applicant", status: 409 } as const;
      }
      const created = await tx.note.create({
        data: {
          content,
          authorId: user.userId,
          authorName,
          applicantId: id,
          updatedAt: new Date(),
          countyId: county.id,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "NOTE_ADDED",
          targetId: id,
          ipAddress: ip,
          countyId: county.id,
          metadata: { contentLength: content.length, noteId: created.id },
        },
      });
      return { note: created } as const;
    });
    if ("error" in txResult) {
      return NextResponse.json({ error: txResult.error }, { status: txResult.status });
    }
    const note = txResult.note;

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
    console.error("Failed to create note:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
