import type { PipelineApplicant } from "@/types";

export type TimeBucket = "new" | "attention" | "overdue";

export const BUCKET_CONFIG: Record<
  TimeBucket,
  { label: string; dotColor: string; bgClass: string; borderClass: string; textClass: string; boldClass: string }
> = {
  new: {
    label: "0 - 10 days",
    dotColor: "bg-green-500",
    bgClass: "bg-green-50 dark:bg-green-950/30",
    borderClass: "border-green-200/60 dark:border-green-800/40",
    textClass: "text-green-800 dark:text-green-300",
    boldClass: "text-green-700 dark:text-green-400",
  },
  attention: {
    label: "11 - 20 days",
    dotColor: "bg-yellow-500",
    bgClass: "bg-yellow-50 dark:bg-yellow-950/30",
    borderClass: "border-yellow-200/60 dark:border-yellow-800/40",
    textClass: "text-yellow-800 dark:text-yellow-300",
    boldClass: "text-yellow-700 dark:text-yellow-400",
  },
  overdue: {
    label: "21+ days",
    dotColor: "bg-red-500",
    bgClass: "bg-red-50 dark:bg-red-950/30",
    borderClass: "border-red-200/60 dark:border-red-800/40",
    textClass: "text-red-800 dark:text-red-300",
    boldClass: "text-red-700 dark:text-red-400",
  },
};

export function getDaysInProcess(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

export function getTimeBucket(createdAt: string): TimeBucket {
  const days = getDaysInProcess(createdAt);
  if (days <= 10) return "new";
  if (days <= 20) return "attention";
  return "overdue";
}

export function isValidBucket(slug: string): slug is TimeBucket {
  return slug === "new" || slug === "attention" || slug === "overdue";
}

export function filterByBucket(
  applicants: PipelineApplicant[],
  bucket: TimeBucket
): PipelineApplicant[] {
  return applicants.filter(
    (a) => a.currentStage !== "COMPLETED" && getTimeBucket(a.createdAt) === bucket
  );
}
