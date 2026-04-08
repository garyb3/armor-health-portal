export type FormType = "VOLUNTEER_APP" | "PROFESSIONAL_LICENSE" | "DRUG_SCREEN" | "BACKGROUND_CHECK";
export type FormStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "PENDING_REVIEW" | "APPROVED" | "DENIED";
export type Role = "APPLICANT" | "HR" | "ADMIN";

export interface ApplicantProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone: string | null;
  approved?: boolean;
  denied?: boolean;
  emailVerified?: boolean;
  offerAcceptedAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormProgress {
  formType: FormType;
  status: FormStatus;
  formData?: Record<string, unknown> | null;
  updatedAt: string;
  statusChangedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  lastAlertSentAt?: string | null;
  stepStartedAt?: string | null;
  stepCompletedAt?: string | null;
  hasReceipt?: boolean;
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
  offerAcceptedAt?: string | null;
  notes?: string | null;
  currentStage: string;
  completedCount: number;
  totalCount: number;
  progress: FormProgress[];
  isStale?: boolean;
  lastAlertSentAt?: string | null;
  hasAnyReceipt?: boolean;
}

export interface StageApplicant {
  id: string;
  name: string;
  since: string; // ISO date – when they entered this status
}

export interface StageSummary {
  count: number;
  names: string[];
  applicants: StageApplicant[];
}

export interface PipelineSummary {
  total: number;
  byStage: Record<string, StageSummary>;
  completedByStage: Record<string, StageSummary>;
  avgTimePerStage?: Record<string, number>;
  bottleneckStage?: string | null;
  staleCount?: number;
}

export interface PipelineResponse {
  applicants: PipelineApplicant[];
  summary: PipelineSummary;
}
