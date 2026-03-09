import sgMail from "@sendgrid/mail";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

interface VerificationEmailParams {
  userName: string;
  userEmail: string;
  verificationToken: string;
}

export async function sendVerificationEmail({
  userName,
  userEmail,
  verificationToken,
}: VerificationEmailParams): Promise<boolean> {
  const from = process.env.SMTP_FROM || "noreply@armorhealth.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!apiKey) {
    console.warn(
      `[Email] Skipping verification email — SENDGRID_API_KEY not configured. ` +
        `User: ${userName} (${userEmail})`
    );
    return false;
  }

  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${verificationToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4a4a4a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">
          Armor Health — Verify Your Email
        </h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
          Hi <strong>${userName}</strong>, thanks for registering! Please verify your email address by clicking the button below:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #2563eb; font-size: 12px; word-break: break-all; margin: 4px 0 0;">
          ${verifyUrl}
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 20px 0 0;">
          This is an automated email from the Franklin County Background Screening Portal.
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: userEmail,
      from,
      subject: "Verify your email — Armor Health",
      html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send verification email:", error);
    return false;
  }
}

interface OverdueAlertParams {
  applicantName: string;
  applicantEmail: string;
  formStep: string;
  elapsedTime: string;
}

export async function sendOverdueAlert({
  applicantName,
  applicantEmail,
  formStep,
  elapsedTime,
}: OverdueAlertParams): Promise<boolean> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  const from = process.env.SMTP_FROM || "noreply@armorhealth.com";

  if (!adminEmail || !apiKey) {
    console.warn(
      `[Email] Skipping alert — ADMIN_ALERT_EMAIL or SENDGRID_API_KEY not configured. ` +
        `Overdue: ${applicantName} (${applicantEmail}) on "${formStep}" for ${elapsedTime}`
    );
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4a4a4a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">
          Armor Health — Overdue Step Alert
        </h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
          An applicant has been on a step for longer than <strong>12 hours</strong>:
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Applicant</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${applicantName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Email</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${applicantEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Stuck On</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: 600;">${formStep}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Time Elapsed</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${elapsedTime}</td>
          </tr>
        </table>
        <p style="color: #6b7280; font-size: 12px; margin: 20px 0 0;">
          This is an automated alert from the Franklin County Background Screening Portal.
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: adminEmail,
      from,
      subject: `Overdue: ${applicantName} stuck on "${formStep}" (${elapsedTime})`,
      html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send overdue alert:", error);
    return false;
  }
}

interface StepCompletedParams {
  applicantName: string;
  applicantEmail: string;
  completedStep: string;
}

export async function sendStepCompletedEmail({
  applicantName,
  applicantEmail,
  completedStep,
}: StepCompletedParams): Promise<boolean> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  const from = process.env.SMTP_FROM || "noreply@armorhealth.com";

  if (!adminEmail || !apiKey) {
    console.warn(
      `[Email] Skipping step-completed email — ADMIN_ALERT_EMAIL or SENDGRID_API_KEY not configured. ` +
        `${applicantName} (${applicantEmail}) completed "${completedStep}"`
    );
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4a4a4a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">
          Armor Health — Step Completed
        </h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
          An applicant has <strong>completed</strong> a step:
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Applicant</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${applicantName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Email</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${applicantEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Completed Step</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #16a34a; font-weight: 600;">${completedStep}</td>
          </tr>
        </table>
        <p style="color: #6b7280; font-size: 12px; margin: 20px 0 0;">
          This is an automated notification from the Franklin County Background Screening Portal.
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: adminEmail,
      from,
      subject: `Step Completed: ${applicantName} finished "${completedStep}"`,
      html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send step-completed email:", error);
    return false;
  }
}

interface PendingApprovalParams {
  userName: string;
  userEmail: string;
  userRole: string;
}

export async function sendPendingApprovalEmail({
  userName,
  userEmail,
  userRole,
}: PendingApprovalParams): Promise<boolean> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  const from = process.env.SMTP_FROM || "noreply@armorhealth.com";

  if (!adminEmail || !apiKey) {
    console.warn(
      `[Email] Skipping pending-approval email — ADMIN_ALERT_EMAIL or SENDGRID_API_KEY not configured. ` +
        `New user: ${userName} (${userEmail}), role: ${userRole}`
    );
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4a4a4a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">
          Armor Health — New Pending Approval Request
        </h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
          A new user has registered and is <strong>waiting for your approval</strong>:
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Name</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${userName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Email</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${userEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Role</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #2563eb; font-weight: 600;">${userRole}</td>
          </tr>
        </table>
        <p style="color: #374151; font-size: 14px; margin: 20px 0 8px;">
          Please visit the <strong>Admin</strong> page to approve or deny this request.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 12px 0 0;">
          This is an automated notification from the Franklin County Background Screening Portal.
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: adminEmail,
      from,
      subject: `New Pending Approval: ${userName} (${userRole})`,
      html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send pending-approval email:", error);
    return false;
  }
}

export async function sendOverdueAlertToStaff({
  applicantName,
  applicantEmail,
  formStep,
  elapsedTime,
}: OverdueAlertParams): Promise<boolean> {
  const from = process.env.SMTP_FROM || "noreply@armorhealth.com";

  if (!apiKey) {
    console.warn(
      `[Email] Skipping staff overdue alert — SENDGRID_API_KEY not configured. ` +
        `Overdue: ${applicantName} (${applicantEmail}) on "${formStep}" for ${elapsedTime}`
    );
    return false;
  }

  // Find all approved HR and Recruiter users
  const staffUsers = await prisma.applicant.findMany({
    where: {
      role: { in: ["HR", "RECRUITER"] },
      approved: true,
    },
    select: { email: true },
  });

  if (staffUsers.length === 0) {
    console.warn("[Email] No approved HR/Recruiter users found — skipping staff overdue alert");
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4a4a4a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">
          Armor Health — Applicant Incomplete Form Reminder
        </h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
          An applicant has an incomplete form for <strong>${elapsedTime}</strong>:
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Applicant</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${applicantName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Email</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${applicantEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Incomplete Step</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: 600;">${formStep}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Time Elapsed</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${elapsedTime}</td>
          </tr>
        </table>
        <p style="color: #6b7280; font-size: 12px; margin: 20px 0 0;">
          This is an automated reminder from the Franklin County Background Screening Portal.
        </p>
      </div>
    </div>
  `;

  try {
    const recipients = staffUsers.map((u) => u.email);
    await sgMail.sendMultiple({
      to: recipients,
      from,
      subject: `Reminder: ${applicantName} incomplete on "${formStep}" (${elapsedTime})`,
      html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send staff overdue alert:", error);
    return false;
  }
}

interface BciReceiptParams {
  applicantName: string;
  applicantEmail: string;
  receiptFilePath: string; // relative path e.g. /uploads/receipts/xyz.pdf
}

export async function sendBciReceiptToCountyRep({
  applicantName,
  applicantEmail,
  receiptFilePath,
}: BciReceiptParams): Promise<boolean> {
  const from = process.env.SMTP_FROM || "noreply@armorhealth.com";

  if (!apiKey) {
    console.warn(
      `[Email] Skipping BCI receipt email — SENDGRID_API_KEY not configured. ` +
        `Applicant: ${applicantName} (${applicantEmail})`
    );
    return false;
  }

  // Find all county representatives in the database
  const countyReps = await prisma.applicant.findMany({
    where: { role: "COUNTY_REPRESENTATIVE" },
    select: { email: true },
  });

  if (countyReps.length === 0) {
    console.warn("[Email] No county representatives found in database — skipping BCI receipt email");
    return false;
  }

  // Read the receipt file and base64-encode it for SendGrid attachment
  const absolutePath = path.join(process.cwd(), "public", receiptFilePath);
  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(absolutePath);
  } catch (err) {
    console.error(`[Email] Failed to read receipt file at ${absolutePath}:`, err);
    return false;
  }

  const fileName = path.basename(receiptFilePath);
  const ext = path.extname(fileName).toLowerCase();
  const mimeType =
    ext === ".pdf"
      ? "application/pdf"
      : ext === ".png"
      ? "image/png"
      : "image/jpeg";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4a4a4a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">
          Armor Health — BCI Fingerprinting Receipt
        </h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
          An applicant has completed their BCI fingerprinting. The receipt is attached.
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Applicant</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${applicantName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Email</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${applicantEmail}</td>
          </tr>
        </table>
        <p style="color: #6b7280; font-size: 12px; margin: 20px 0 0;">
          This is an automated notification from the Franklin County Background Screening Portal.
        </p>
      </div>
    </div>
  `;

  try {
    const recipients = countyReps.map((r) => r.email);
    await sgMail.send({
      to: recipients,
      from,
      subject: `BCI Fingerprinting Receipt: ${applicantName}`,
      html,
      attachments: [
        {
          content: fileBuffer.toString("base64"),
          filename: fileName,
          type: mimeType,
          disposition: "attachment",
        },
      ],
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send BCI receipt to county rep:", error);
    return false;
  }
}

interface StepApprovedParams {
  applicantName: string;
  applicantEmail: string;
  approvedStep: string;
  nextStep?: string;
}

export async function sendStepApprovedEmail({
  applicantName,
  applicantEmail,
  approvedStep,
  nextStep,
}: StepApprovedParams): Promise<boolean> {
  const from = process.env.SMTP_FROM || "noreply@armorhealth.com";

  if (!apiKey) {
    console.warn(
      `[Email] Skipping step-approved email — SENDGRID_API_KEY not configured. ` +
        `${applicantName} (${applicantEmail}) approved "${approvedStep}"`
    );
    return false;
  }

  const nextStepText = nextStep
    ? `<p style="color: #374151; font-size: 14px; margin: 16px 0 0;">
        Your next step is: <strong>${nextStep}</strong>. Please log in to continue your background clearance process.
      </p>`
    : `<p style="color: #16a34a; font-size: 14px; font-weight: 600; margin: 16px 0 0;">
        Congratulations! All background clearance steps are now complete. Someone from our Employee Experience Team will contact you about your orientation and start date.
      </p>`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4a4a4a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">
          Armor Health — Step Approved
        </h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
          Hi <strong>${applicantName}</strong>, your <strong>${approvedStep}</strong> step has been <span style="color: #16a34a; font-weight: 600;">approved</span>.
        </p>
        ${nextStepText}
        <p style="color: #6b7280; font-size: 12px; margin: 20px 0 0;">
          This is an automated notification from the Franklin County Background Screening Portal.
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: applicantEmail,
      from,
      subject: `Step Approved: ${approvedStep} — Armor Health`,
      html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send step-approved email:", error);
    return false;
  }
}

interface StepDeniedParams {
  applicantName: string;
  applicantEmail: string;
  deniedStep: string;
  note?: string;
}

export async function sendStepDeniedEmail({
  applicantName,
  applicantEmail,
  deniedStep,
  note,
}: StepDeniedParams): Promise<boolean> {
  const from = process.env.SMTP_FROM || "noreply@armorhealth.com";

  if (!apiKey) {
    console.warn(
      `[Email] Skipping step-denied email — SENDGRID_API_KEY not configured. ` +
        `${applicantName} (${applicantEmail}) denied "${deniedStep}"`
    );
    return false;
  }

  const noteText = note
    ? `<p style="color: #374151; font-size: 14px; margin: 16px 0 0;">
        <strong>Note from reviewer:</strong> ${note}
      </p>`
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4a4a4a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">
          Armor Health — Step Requires Attention
        </h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
          Hi <strong>${applicantName}</strong>, your <strong>${deniedStep}</strong> step <span style="color: #dc2626; font-weight: 600;">requires attention</span>.
        </p>
        ${noteText}
        <p style="color: #374151; font-size: 14px; margin: 16px 0 0;">
          Please log in to the portal for more details and to address any issues.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 20px 0 0;">
          This is an automated notification from the Franklin County Background Screening Portal.
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: applicantEmail,
      from,
      subject: `Action Required: ${deniedStep} — Armor Health`,
      html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send step-denied email:", error);
    return false;
  }
}
