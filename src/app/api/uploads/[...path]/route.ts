import { NextRequest, NextResponse } from "next/server";
import { readFile, access } from "fs/promises";
import path from "path";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";

const STAFF_ROLES = ["ADMIN", "HR", "RECRUITER", "ADMIN_ASSISTANT"];

/** Map file extensions to MIME types for the Content-Type header. */
const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const segments = (await params).path;

    // Block path traversal: no segment may contain ".."
    if (segments.some((s) => s === ".." || s.includes("..") || s.includes("\0"))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Build the absolute path to the file inside the private uploads directory
    const filePath = path.join(process.cwd(), "uploads", ...segments);

    // Ensure the resolved path is still within the uploads directory (belt-and-suspenders)
    const uploadsRoot = path.resolve(process.cwd(), "uploads");
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(uploadsRoot + path.sep) && resolvedPath !== uploadsRoot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only staff can access uploaded files
    if (!STAFF_ROLES.includes(user.userRole)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check file exists
    try {
      await access(resolvedPath);
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const fileBuffer = await readFile(resolvedPath);

    // Determine content type from extension
    const filename = segments[segments.length - 1] || "";
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const contentType = EXT_TO_MIME[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("File serving error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
