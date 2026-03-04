"use client";

import Link from "next/link";
import {
  FlaskConical,
  FileText,
  Fingerprint,
  Globe,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/constants";
import { formatElapsed, isOverdue } from "@/lib/format-elapsed";
import { Clock, AlertTriangle } from "lucide-react";
import type { FormStatus } from "@/types";

const iconMap = {
  FlaskConical,
  FileText,
  Fingerprint,
  Globe,
};

interface StepCardProps {
  title: string;
  description: string;
  icon: keyof typeof iconMap;
  status: FormStatus;
  route: string;
  order: number;
  statusChangedAt?: string;
}

export function StepCard({
  title,
  description,
  icon,
  status,
  route,
  order,
  statusChangedAt,
}: StepCardProps) {
  const Icon = iconMap[icon];

  const buttonText =
    status === "COMPLETED"
      ? "View"
      : status === "IN_PROGRESS"
      ? "Continue"
      : status === "PENDING_REVIEW"
      ? "Pending Review"
      : "Start";

  const ButtonIcon = status === "COMPLETED" ? Eye : ArrowRight;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-brand-50 text-brand-500 shrink-0">
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-medium text-gray-400">
                Step {order}
              </span>
              <Badge variant={status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "PENDING_REVIEW"}>
                {STATUS_LABELS[status]}
              </Badge>
              {statusChangedAt && status !== "COMPLETED" && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    isOverdue(statusChangedAt, 24)
                      ? "bg-red-100 text-red-700"
                      : isOverdue(statusChangedAt, 12)
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-500"
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
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <Link href={route}>
            <Button
              variant={status === "COMPLETED" ? "outline" : "default"}
              size="sm"
              disabled={status === "PENDING_REVIEW"}
            >
              {buttonText}
              <ButtonIcon className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
