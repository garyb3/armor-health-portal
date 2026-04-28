import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp, enforceMaxBodySize, requireCountyAccess, assertApplicantInCounty } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

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

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id } = await params;

  const ownership = await assertApplicantInCounty(id, county.id);
  if (ownership) return ownership;

  try {
    const notes = await prisma.note.findMany({
      where: { applicantId: id },
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
        updatedAt: new Date(),
        countyId: county.id,
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
      console.error("[AUDIT_LOG_FAIL] NOTE_ADDED:", auditErr);
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
    console.error("Failed to create note:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
