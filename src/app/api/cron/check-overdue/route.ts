import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOverdueAlert, sendOverdueAlertToStaff } from "@/lib/email";
import { formatElapsed } from "@/lib/format-elapsed";
import { FORM_STEPS } from "@/lib/constants";

const OVERDUE_HOURS = 12;

const STEP_TITLE_MAP: Record<string, string> = Object.fromEntries(
  FORM_STEPS.map((s) => [s.key, s.title])
);

export async function GET(request: NextRequest) {
  // Authenticate with CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - OVERDUE_HOURS * 60 * 60 * 1000);

    // Find all overdue form submissions (not completed, status changed > 12h ago)
    const overdueSubmissions = await prisma.formSubmission.findMany({
      where: {
        status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
        statusChangedAt: { lt: cutoff },
        OR: [
          { lastAlertSentAt: null },
          { lastAlertSentAt: { lt: cutoff } },
        ],
      },
      include: {
        applicant: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const results: Array<{
      applicant: string;
      email: string;
      step: string;
      elapsed: string;
      adminAlertSent: boolean;
      staffAlertSent: boolean;
    }> = [];

    for (const sub of overdueSubmissions) {
      const applicantName = `${sub.applicant.firstName} ${sub.applicant.lastName}`;
      const stepTitle = STEP_TITLE_MAP[sub.formType] || sub.formType;
      const elapsed = formatElapsed(sub.statusChangedAt.toISOString());

      const alertParams = {
        applicantName,
        applicantEmail: sub.applicant.email,
        formStep: stepTitle,
        elapsedTime: elapsed,
      };

      const [adminSent, staffSent] = await Promise.all([
        sendOverdueAlert(alertParams),
        sendOverdueAlertToStaff(alertParams),
      ]);

      // Update lastAlertSentAt regardless of email success (to prevent retrying every second)
      await prisma.formSubmission.update({
        where: { id: sub.id },
        data: { lastAlertSentAt: new Date() },
      });

      results.push({
        applicant: applicantName,
        email: sub.applicant.email,
        step: stepTitle,
        elapsed,
        adminAlertSent: adminSent,
        staffAlertSent: staffSent,
      });
    }

    return NextResponse.json({
      checked: new Date().toISOString(),
      overdueCount: results.length,
      alerts: results,
    });
  } catch (error) {
    console.error("Cron check-overdue error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
