export type FormType = "DRUG_SCREEN" | "VOLUNTEER_APPLICATION" | "BACKGROUND_CHECK" | "WEB_CHECK";
export type FormStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "PENDING_REVIEW";
export type Role = "RECRUITER" | "ADMIN_ASSISTANT" | "COUNTY_REPRESENTATIVE" | "HR";

export interface ApplicantProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone: string | null;
}

export interface FormProgress {
  formType: FormType;
  status: FormStatus;
  updatedAt: string;
  statusChangedAt: string;
}

export interface ProgressResponse {
  progress: FormProgress[];
  completedCount: number;
  totalCount: number;
}

export interface FormSubmissionResponse {
  id: string;
  formType: FormType;
  status: FormStatus;
  formData: Record<string, unknown> | null;
  receiptFile: string | null;
  submittedAt: string | null;
  updatedAt: string;
}

export interface SaveFormRequest {
  formData: Record<string, unknown>;
  action: "save_draft" | "submit";
}
