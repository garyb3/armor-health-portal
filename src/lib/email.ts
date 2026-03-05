import sgMail from "@sendgrid/mail";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
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
          An applicant has been on a step for longer than <strong>24 hours</strong>:
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
