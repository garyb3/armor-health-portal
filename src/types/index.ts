export type FormType = "VOLUNTEER_APP" | "PROFESSIONAL_LICENSE" | "DRUG_SCREEN" | "BACKGROUND_CHECK";
export type FormStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "PENDING_REVIEW" | "APPROVED" | "DENIED";
export type Role = "APPLICANT" | "RECRUITER" | "ADMIN_ASSISTANT" | "COUNTY_REPRESENTATIVE" | "HR" | "ADMIN";

export interface ApplicantProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone: string | null;
  approved?: boolean;
}

export interface FormProgress {
  formType: FormType;
  status: FormStatus;
  updatedAt: string;
  statusChangedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
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

export interface PipelineApplicant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  currentStage: string;
  completedCount: number;
  totalCount: number;
  progress: FormProgress[];
}

export interface StageSummary {
  count: number;
  names: string[];
}

export interface PipelineSummary {
  total: number;
  byStage: Record<string, StageSummary>;
  completedByStage: Record<string, StageSummary>;
}

export interface PipelineResponse {
  applicants: PipelineApplicant[];
  summary: PipelineSummary;
}
