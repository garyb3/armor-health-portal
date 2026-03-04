export const FORM_STEPS = [
  {
    key: "DRUG_SCREEN" as const,
    slug: "drug-screen",
    title: "LabCorp Drug Screen",
    description: "Complete donor information for your pre-employment drug screening",
    route: "/forms/drug-screen",
    icon: "FlaskConical" as const,
    order: 1,
  },
  {
    key: "BACKGROUND_CHECK" as const,
    slug: "background-check",
    title: "BCI Fingerprinting",
    description: "Complete fingerprinting at the Franklin County CCW Office and upload receipt",
    route: "/forms/background-check",
    icon: "Fingerprint" as const,
    order: 2,
  },
  {
    key: "WEB_CHECK" as const,
    slug: "web-check",
    title: "Web Check Form",
    description: "Complete the BCI Web Check background form",
    route: "/forms/web-check",
    icon: "Globe" as const,
    order: 3,
  },
] as const;

export const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  PENDING_REVIEW: "Pending Review",
};

export const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  PENDING_REVIEW: "bg-blue-100 text-blue-700",
};

export const PIPELINE_STAGES = [
  ...FORM_STEPS.map((step) => ({
    key: step.key,
    title: step.title,
    icon: step.icon,
  })),
  {
    key: "COMPLETED" as const,
    title: "Completed",
    icon: "CheckCircle2" as const,
  },
];

export const FORM_TYPE_MAP: Record<string, string> = {
  "drug-screen": "DRUG_SCREEN",
  "background-check": "BACKGROUND_CHECK",
  "web-check": "WEB_CHECK",
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
