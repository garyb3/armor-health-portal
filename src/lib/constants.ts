export const FORM_STEPS = [
  {
    key: "VOLUNTEER_APP" as const,
    title: "Complete & Return the Clearance Form",
    icon: "FileText" as const,
    order: 1,
    urgent: false,
  },
  {
    key: "PROFESSIONAL_LICENSE" as const,
    title: "Send a Copy of Your License",
    icon: "FileCheck" as const,
    order: 2,
    urgent: false,
  },
  {
    key: "BACKGROUND_CHECK" as const,
    title: "Schedule Fingerprinting",
    icon: "Fingerprint" as const,
    order: 3,
    urgent: true,
  },
  {
    key: "DRUG_SCREEN" as const,
    title: "Complete the UDS (Urine Drug Screen)",
    icon: "FlaskConical" as const,
    order: 4,
    urgent: false,
  },
] as const;

export const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  DENIED: "Denied",
};

export const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-red-600 text-white dark:bg-red-600 dark:text-white",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  PENDING_REVIEW: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  DENIED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const STAGE_SHORT_TITLES: Record<string, string> = {
  VOLUNTEER_APP: "Clearance Form",
  PROFESSIONAL_LICENSE: "License",
  DRUG_SCREEN: "Drug Screen",
  BACKGROUND_CHECK: "Fingerprinting",
};

export const PIPELINE_STAGES = [
  ...FORM_STEPS.map((step) => ({
    key: step.key,
    title: step.title,
    shortTitle: STAGE_SHORT_TITLES[step.key] || step.title,
    icon: step.icon,
  })),
  {
    key: "COMPLETED" as const,
    title: "Completed",
    shortTitle: "Completed",
    icon: "CheckCircle2" as const,
  },
];


