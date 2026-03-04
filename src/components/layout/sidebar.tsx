"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  FileText,
  Fingerprint,
  Globe,
  LayoutDashboard,
  CheckCircle2,
  Circle,
  Clock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FORM_STEPS } from "@/lib/constants";
import type { FormStatus } from "@/types";

const iconMap = {
  FlaskConical,
  FileText,
  Fingerprint,
  Globe,
};

function StatusIcon({ status }: { status: FormStatus }) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "IN_PROGRESS":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "PENDING_REVIEW":
      return <Clock className="h-4 w-4 text-blue-500" />;
    default:
      return <Circle className="h-4 w-4 text-gray-300" />;
  }
}

interface SidebarProps {
  progress?: Record<string, FormStatus>;
  role?: string;
}

export function Sidebar({ progress = {}, role }: SidebarProps) {
  const pathname = usePathname();
  const isStaff = role === "RECRUITER" || role === "HR";

  if (isStaff) {
    return (
      <aside className="no-print w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === "/dashboard"
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>
        </div>

        <div className="px-4 pb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
            Stages
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {FORM_STEPS.map((step) => {
            const Icon = iconMap[step.icon];
            return (
              <Link
                key={step.key}
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1 truncate">{step.title}</span>
              </Link>
            );
          })}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="flex-1 truncate">Completed</span>
          </Link>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="no-print w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
      <div className="p-4">
        <Link
          href="/onboarding"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/onboarding"
              ? "bg-brand-50 text-brand-700"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          Onboarding
        </Link>
      </div>

      <div className="px-4 pb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
          Onboarding Steps
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {FORM_STEPS.map((step) => {
          const Icon = iconMap[step.icon];
          const status = progress[step.key] || "NOT_STARTED";
          const isActive = pathname === step.route;

          return (
            <Link
              key={step.key}
              href={step.route}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 truncate">{step.title}</span>
              <StatusIcon status={status} />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
