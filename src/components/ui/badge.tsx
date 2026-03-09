import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-gray-50 text-gray-600 ring-gray-500/10",
        NOT_STARTED: "bg-gray-50 text-gray-600 ring-gray-500/10",
        IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-600/20",
        COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
        PENDING_REVIEW: "bg-sky-50 text-sky-700 ring-sky-600/20",
        APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
        DENIED: "bg-red-50 text-red-700 ring-red-600/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
