import { FORM_STEPS } from "@/lib/constants";
import type { FormType, FormStatus } from "@/types";

interface SubmissionLike {
  formType: FormType;
  status: FormStatus;
}

/**
 * Treat legacy COMPLETED the same as APPROVED for backward compatibility.
 */
export function isApprovedOrCompleted(status: FormStatus): boolean {
  return status === "APPROVED" || status === "COMPLETED";
}

/**
 * Returns true if the given step is unlocked for the applicant.
 * Step 1 (order 1) is always unlocked. Others require the previous step to be APPROVED.
 */
export function isStepUnlocked(
  formType: FormType,
  submissions: SubmissionLike[]
): boolean {
  const step = FORM_STEPS.find((s) => s.key === formType);
  if (!step) return false;

  // First step is always unlocked
  if (step.order === 1) return true;

  // Find the previous step by order
  const prevStep = FORM_STEPS.find((s) => s.order === step.order - 1);
  if (!prevStep) return false;

  const prevSubmission = submissions.find((s) => s.formType === prevStep.key);
  if (!prevSubmission) return false;

  return isApprovedOrCompleted(prevSubmission.status);
}

/**
 * Returns the current step the applicant should be working on,
 * or "COMPLETED" if all steps are approved.
 */
export function getCurrentStep(
  submissions: SubmissionLike[]
): FormType | "COMPLETED" {
  for (const step of FORM_STEPS) {
    const submission = submissions.find((s) => s.formType === step.key);
    if (!submission || !isApprovedOrCompleted(submission.status)) {
      return step.key as FormType;
    }
  }
  return "COMPLETED";
}

/**
 * Returns the next step after the given formType, or null if it's the last step.
 */
export function getNextStep(
  formType: FormType
): (typeof FORM_STEPS)[number] | null {
  const currentStep = FORM_STEPS.find((s) => s.key === formType);
  if (!currentStep) return null;

  const nextStep = FORM_STEPS.find((s) => s.order === currentStep.order + 1);
  return nextStep ?? null;
}

/**
 * Count how many steps have been approved (or legacy completed).
 */
export function countApproved(submissions: SubmissionLike[]): number {
  return submissions.filter((s) => isApprovedOrCompleted(s.status)).length;
}
