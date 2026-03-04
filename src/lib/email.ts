import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

  if (!adminEmail || !process.env.SMTP_HOST) {
    console.warn(
      `[Email] Skipping alert — ADMIN_ALERT_EMAIL or SMTP_HOST not configured. ` +
        `Overdue: ${applicantName} (${applicantEmail}) on "${formStep}" for ${elapsedTime}`
    );
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1B4D7A; padding: 20px; border-radius: 8px 8px 0 0;">
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
    await transporter.sendMail({
      from,
      to: adminEmail,
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

  if (!adminEmail || !process.env.SMTP_HOST) {
    console.warn(
      `[Email] Skipping step-completed email — ADMIN_ALERT_EMAIL or SMTP_HOST not configured. ` +
        `${applicantName} (${applicantEmail}) completed "${completedStep}"`
    );
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1B4D7A; padding: 20px; border-radius: 8px 8px 0 0;">
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
    await transporter.sendMail({
      from,
      to: adminEmail,
      subject: `Step Completed: ${applicantName} finished "${completedStep}"`,
      html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send step-completed email:", error);
    return false;
  }
}
