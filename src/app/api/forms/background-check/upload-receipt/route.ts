import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorizedResponse, getExtensionFromMime } from "@/lib/api-helpers";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const formData = await request.formData();
    const file = formData.get("receipt") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Accepted: JPEG, PNG, PDF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Derive extension from validated MIME type, not the user-supplied filename
    const ext = getExtensionFromMime(file.type);
    if (!ext) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "uploads", "receipts");
    await mkdir(uploadDir, { recursive: true });

    const sanitizedName = `${user.userId}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, sanitizedName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const relativePath = `receipts/${sanitizedName}`;

    await prisma.formSubmission.update({
      where: {
        applicantId_formType: {
          applicantId: user.userId,
          formType: "BACKGROUND_CHECK",
        },
      },
      data: { receiptFile: relativePath },
    });

    return NextResponse.json({ success: true, filePath: `/api/uploads/${relativePath}` });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
