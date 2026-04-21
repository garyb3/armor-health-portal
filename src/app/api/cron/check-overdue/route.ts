import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOverdueAlert, sendOverdueAlertToStaff } from "@/lib/email";
import { formatElapsed } from "@/lib/format-elapsed";
import { FORM_STEPS } from "@/lib/constants";
import { isStepUnlocked } from "@/lib/pipeline-helpers";
import type { FormType as AppFormType, FormStatus as AppFormStatus } from "@/types";

const OVERDUE_DAYS = 7;

const STEP_TITLE_MAP: Record<string, string> = Object.fromEntries(
  FORM_STEPS.map((s) => [s.key, s.title])
);

export async function POST(request: NextRequest) {
  // Authenticate with CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - OVERDUE_DAYS * 24 * 60 * 60 * 1000);

    // Find all overdue form submissions (not completed, status changed > 7 days ago)
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
            phone: true,
          },
        },
      },
    });

    // Batch-fetch all submissions for affected applicants (avoids N+1 queries)
    const applicantIds = [...new Set(overdueSubmissions.map((s) => s.applicantId))];
    const allSiblingSubmissions = applicantIds.length > 0
      ? await prisma.formSubmission.findMany({
          where: { applicantId: { in: applicantIds } },
          select: { applicantId: true, formType: true, status: true },
        })
      : [];
    const submissionsByApplicant = new Map<string, typeof allSiblingSubmissions>();
    for (const s of allSiblingSubmissions) {
      const list = submissionsByApplicant.get(s.applicantId) || [];
      list.push(s);
      submissionsByApplicant.set(s.applicantId, list);
    }

    // Fetch all approved HR/Recruiter staff for personalized emails
    const staffUsers = await prisma.applicant.findMany({
      where: {
        role: { in: ["HR", "ADMIN"] },
        approved: true,
      },
      select: { email: true, firstName: true },
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
      // Only alert if this step is currently unlocked (previous step approved)
      const siblingSubmissions = submissionsByApplicant.get(sub.applicantId) || [];
      const unlocked = isStepUnlocked(
        sub.formType as unknown as AppFormType,
        siblingSubmissions.map((s) => ({
          formType: s.formType as unknown as AppFormType,
          status: s.status as unknown as AppFormStatus,
        }))
      );
      if (!unlocked) continue;

      const applicantName = `${sub.applicant.firstName} ${sub.applicant.lastName}`;
      const stepTitle = STEP_TITLE_MAP[sub.formType] || sub.formType;
      const elapsed = formatElapsed(sub.statusChangedAt.toISOString());

      const alertParams = {
        applicantName,
        applicantEmail: sub.applicant.email,
        applicantPhone: sub.applicant.phone || undefined,
        formStep: stepTitle,
        elapsedTime: elapsed,
      };

      const [adminSent, staffSent] = await Promise.all([
        sendOverdueAlert(alertParams),
        sendOverdueAlertToStaff({
          ...alertParams,
          staffRecipients: staffUsers.map((u) => ({ email: u.email, firstName: u.firstName })),
        }),
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
