export const FORM_STEPS = [
  {
    key: "VOLUNTEER_APP" as const,
    slug: "volunteer-app",
    title: "Complete & Return the Clearance Form",
    description:
      "Download, complete, and send the Volunteer & Professional Services Application to Franklin County",
    route: "/forms/volunteer-app",
    icon: "FileText" as const,
    order: 1,
    urgent: false,
  },
  {
    key: "PROFESSIONAL_LICENSE" as const,
    slug: "professional-license",
    title: "Send a Copy of Your License",
    description:
      "Email a copy of your nursing or social worker license to the Franklin County Sheriff's Office",
    route: "/forms/professional-license",
    icon: "FileCheck" as const,
    order: 2,
    urgent: false,
  },
  {
    key: "BACKGROUND_CHECK" as const,
    slug: "background-check",
    title: "Schedule Fingerprinting (BCI)",
    description:
      "Download instructions and the Web Check form, then complete BCI fingerprinting at the Franklin County CCW Office",
    route: "/forms/background-check",
    icon: "Fingerprint" as const,
    order: 3,
    urgent: true,
  },
  {
    key: "DRUG_SCREEN" as const,
    slug: "drug-screen",
    title: "Complete the UDS (Urine Drug Screen)",
    description:
      "Download the UDS form and take it to any LabCorp location to complete your drug screening",
    route: "/forms/drug-screen",
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
  NOT_STARTED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
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

export const FORM_TYPE_MAP: Record<string, string> = {
  "volunteer-app": "VOLUNTEER_APP",
  "professional-license": "PROFESSIONAL_LICENSE",
  "drug-screen": "DRUG_SCREEN",
  "background-check": "BACKGROUND_CHECK",
};

export const COMPANY = {
  name: "Armor Health of Ohio",
  fullName: "Armor Health of Ohio — Correctional Healthcare Staffing",
  location: "Franklin County Sheriff's Office, Columbus, OH",
  contactName: "Heather Poarch",
  contactPhone: "786-714-0256",
  contactEmail: "ginny.bick@armorhealthcare.com",
  brandColor: "#4a4a4a",
};
