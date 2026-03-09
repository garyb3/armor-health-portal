"use client";

import Link from "next/link";
import {
  FlaskConical,
  FileText,
  FileCheck,
  Fingerprint,
  Globe,
  ArrowRight,
  Eye,
  Lock,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/constants";
import { formatElapsed, isOverdue } from "@/lib/format-elapsed";
import type { FormStatus } from "@/types";

const iconMap = {
  FlaskConical,
  FileText,
  FileCheck,
  Fingerprint,
  Globe,
};

const statusBorderColor: Record<string, string> = {
  COMPLETED: "border-l-emerald-500",
  APPROVED: "border-l-emerald-500",
  IN_PROGRESS: "border-l-amber-500",
  PENDING_REVIEW: "border-l-sky-500",
  DENIED: "border-l-red-500",
  NOT_STARTED: "border-l-gray-200",
};

interface StepCardProps {
  title: string;
  description: string;
  icon: keyof typeof iconMap;
  status: FormStatus;
  route: string;
  order: number;
  statusChangedAt?: string;
  locked?: boolean;
  urgent?: boolean;
}

export function StepCard({
  title,
  description,
  icon,
  status,
  route,
  order,
  statusChangedAt,
  locked = false,
  urgent = false,
}: StepCardProps) {
  const Icon = iconMap[icon];

  const getButtonText = () => {
    if (locked) return "Locked";
    if (status === "APPROVED" || status === "COMPLETED") return "Approved";
    if (status === "DENIED") return "Resubmit";
    if (status === "PENDING_REVIEW") return "Pending Review";
    if (status === "IN_PROGRESS") return "Continue";
    return "Start";
  };

  const buttonText = getButtonText();

  const getButtonIcon = () => {
    if (locked) return Lock;
    if (status === "APPROVED" || status === "COMPLETED") return CheckCircle2;
    if (status === "DENIED") return ArrowRight;
    if (status === "PENDING_REVIEW") return Clock;
    return ArrowRight;
  };

  const ButtonIcon = getButtonIcon();

  const isDisabled =
    locked || status === "PENDING_REVIEW" || status === "APPROVED" || status === "COMPLETED";

  const borderClass = locked
    ? "border-l-gray-200 opacity-60"
    : statusBorderColor[status] || "border-l-gray-200";

  return (
    <Card
      className={`hover:shadow-md transition-all duration-200 border-l-[3px] ${borderClass}`}
    >
      <CardContent className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div
            className={`flex items-center justify-center h-11 w-11 rounded-xl shrink-0 ${
              locked
                ? "bg-gray-100 text-gray-400"
                : "bg-gradient-to-br from-accent-50 to-accent-100/50 text-accent-500"
            }`}
          >
            {locked ? (
              <Lock className="h-5 w-5" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Step {order}
              </span>
              {!locked && (
                <Badge
                  variant={
                    status as
                      | "NOT_STARTED"
                      | "IN_PROGRESS"
                      | "COMPLETED"
                      | "PENDING_REVIEW"
                  }
                >
                  {STATUS_LABELS[status]}
                </Badge>
              )}
              {urgent && !locked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                  <AlertTriangle className="h-3 w-3" />
                  URGENT
                </span>
              )}
              {statusChangedAt &&
                !locked &&
                status !== "COMPLETED" &&
                status !== "APPROVED" && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${
                      isOverdue(statusChangedAt, 24)
                        ? "bg-red-50 text-red-700 ring-red-600/20"
                        : isOverdue(statusChangedAt, 12)
                        ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                        : "bg-gray-50 text-gray-500 ring-gray-500/10"
                    }`}
                  >
                    {isOverdue(statusChangedAt, 24) ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {formatElapsed(statusChangedAt)}
                  </span>
                )}
            </div>
            <h3 className="text-base font-semibold text-gray-900 tracking-tight">
              {title}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          </div>
          {isDisabled ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="shrink-0"
            >
              {buttonText}
              <ButtonIcon className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              variant={status === "DENIED" ? "destructive" : "default"}
              size="sm"
              asChild
              className="shrink-0"
            >
              <Link href={route}>
                {buttonText}
                <ButtonIcon className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
