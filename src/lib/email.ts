import sgMail from "@sendgrid/mail";

/** Escape user-controlled strings before embedding in HTML email templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip newlines from email subjects to prevent SMTP header injection. */
function sanitizeSubject(s: string): string {
  return s.replace(/[\r\n]/g, " ").trim();
}

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
      `[Email] Skipping verification email — SENDGRID_API_KEY not configured.`
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
          Hi <strong>${escapeHtml(userName)}</strong>, thanks for registering! Please verify your email address by clicking the button below:
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
  applicantPhone?: string;
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
      `[Email] Skipping overdue alert — ADMIN_ALERT_EMAIL or SENDGRID_API_KEY not configured.`
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
          An applicant has been on a step for longer than <strong>7 days</strong>:
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Applicant</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${escapeHtml(applicantName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Email</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${escapeHtml(applicantEmail)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Stuck On</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: 600;">${escapeHtml(formStep)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Time Elapsed</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${escapeHtml(elapsedTime)}</td>
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
      subject: sanitizeSubject(`Overdue: ${applicantName} stuck on "${formStep}" (${elapsedTime})`),
      html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send overdue alert:", error);
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
      `[Email] Skipping pending-approval email — ADMIN_ALERT_EMAIL or SENDGRID_API_KEY not configured.`
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
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${escapeHtml(userName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Email</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${escapeHtml(userEmail)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Role</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #2563eb; font-weight: 600;">${escapeHtml(userRole)}</td>
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
      subject: sanitizeSubject(`New Pending Approval: ${userName} (${userRole})`),
      html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send pending-approval email:", error);
    return false;
  }
}

interface OverdueStaffAlertParams extends OverdueAlertParams {
  staffRecipients: Array<{ email: string; firstName: string }>;
}

export async function sendOverdueAlertToStaff({
  applicantName,
  applicantEmail,
  applicantPhone,
  staffRecipients,
}: OverdueStaffAlertParams): Promise<boolean> {
  const from = process.env.SMTP_FROM || "noreply@armorhealth.com";

  if (!apiKey) {
    console.warn(
      `[Email] Skipping staff overdue alert — SENDGRID_API_KEY not configured.`
    );
    return false;
  }

  if (staffRecipients.length === 0) {
    console.warn("[Email] No staff recipients provided — skipping staff overdue alert");
    return false;
  }

  const contactInfo = applicantPhone
    ? `${escapeHtml(applicantEmail)} or ${escapeHtml(applicantPhone)}`
    : escapeHtml(applicantEmail);

  try {
    await Promise.all(
      staffRecipients.map((staff) => {
        const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4a4a4a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">
          Armor Health — Incomplete Application Reminder
        </h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
          Hey ${escapeHtml(staff.firstName)}, we have noticed candidate <strong>${escapeHtml(applicantName)}</strong> has not finished their application. You should contact ${escapeHtml(applicantName)} at <strong>${contactInfo}</strong>.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 20px 0 0;">
          This is an automated reminder from the Franklin County Background Screening Portal.
        </p>
      </div>
    </div>
  `;
        return sgMail.send({
          to: staff.email,
          from,
          subject: sanitizeSubject(`Reminder: ${applicantName} has not finished their application`),
          html,
        });
      })
    );
    return true;
  } catch (error) {
    console.error("[Email] Failed to send staff overdue alert:", error);
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
      `[Email] Skipping step-approved email — SENDGRID_API_KEY not configured.`
    );
    return false;
  }

  const nextStepText = nextStep
    ? `<p style="color: #374151; font-size: 14px; margin: 16px 0 0;">
        Your next step is: <strong>${escapeHtml(nextStep)}</strong>.
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
          Hi <strong>${escapeHtml(applicantName)}</strong>, your <strong>${escapeHtml(approvedStep)}</strong> step has been <span style="color: #16a34a; font-weight: 600;">approved</span>.
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
      subject: sanitizeSubject(`Step Approved: ${approvedStep} — Armor Health`),
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
      `[Email] Skipping step-denied email — SENDGRID_API_KEY not configured.`
    );
    return false;
  }

  const noteText = note
    ? `<p style="color: #374151; font-size: 14px; margin: 16px 0 0;">
        <strong>Note from reviewer:</strong> ${escapeHtml(note)}
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
          Hi <strong>${escapeHtml(applicantName)}</strong>, your <strong>${escapeHtml(deniedStep)}</strong> step <span style="color: #dc2626; font-weight: 600;">requires attention</span>.
        </p>
        ${noteText}
        <p style="color: #374151; font-size: 14px; margin: 16px 0 0;">
          Please contact your recruiter for more details.
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
      subject: sanitizeSubject(`Action Required: ${deniedStep} — Armor Health`),
      html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send step-denied email:", error);
    return false;
  }
}

interface PasswordResetEmailParams {
  userName: string;
  userEmail: string;
  resetToken: string;
}

export async function sendPasswordResetEmail({
  userName,
  userEmail,
  resetToken,
}: PasswordResetEmailParams): Promise<boolean> {
  const from = process.env.SMTP_FROM || "noreply@armorhealth.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!apiKey) {
    console.warn(
      `[Email] Skipping password reset email — SENDGRID_API_KEY not configured.`
    );
    return false;
  }

  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4a4a4a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">
          Armor Health — Reset Your Password
        </h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
          Hi <strong>${escapeHtml(userName)}</strong>, we received a request to reset your password. Click the button below to choose a new password:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Reset Password
          </a>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #2563eb; font-size: 12px; word-break: break-all; margin: 4px 0 0;">
          ${resetUrl}
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 20px 0 0;">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0;">
          This is an automated email from the Franklin County Background Screening Portal.
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: userEmail,
      from,
      subject: "Reset your password — Armor Health",
      html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send password reset email:", error);
    return false;
  }
}
