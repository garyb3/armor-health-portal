"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  FileText,
  FileCheck,
  Fingerprint,
  Globe,
  LayoutDashboard,
  CheckCircle2,
  Circle,
  Clock,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FORM_STEPS } from "@/lib/constants";
import type { FormStatus } from "@/types";

const iconMap = {
  FlaskConical,
  FileText,
  FileCheck,
  Fingerprint,
  Globe,
};

function StatusIcon({ status }: { status: FormStatus }) {
  switch (status) {
    case "APPROVED":
    case "COMPLETED":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "DENIED":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "IN_PROGRESS":
      return <Clock className="h-4 w-4 text-amber-500" />;
    case "PENDING_REVIEW":
      return <Clock className="h-4 w-4 text-sky-500" />;
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
  const isStaff = role === "RECRUITER" || role === "HR" || role === "ADMIN" || role === "ADMIN_ASSISTANT";

  if (isStaff) {
    return (
      <aside className="no-print w-60 bg-white dark:bg-brand-900 border-r border-gray-100 dark:border-brand-800 hidden md:flex flex-col">
        <div className="p-3 pt-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
              pathname === "/dashboard"
                ? "bg-brand-900 text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-brand-800"
            )}
          >
            <LayoutDashboard className="h-4.5 w-4.5" />
            Dashboard
          </Link>
          {role === "ADMIN" && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 mt-0.5",
                pathname === "/admin"
                  ? "bg-brand-900 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-brand-800"
              )}
            >
              <Users className="h-4.5 w-4.5" />
              User Management
            </Link>
          )}
        </div>

        <div className="px-6 pt-4 pb-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Stages
          </p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 pb-4">
          {FORM_STEPS.map((step) => {
            const Icon = iconMap[step.icon];
            return (
              <Link
                key={step.key}
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-brand-800 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-150"
              >
                <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="flex-1 truncate">{step.title}</span>
              </Link>
            );
          })}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-brand-800 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-150"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="flex-1 truncate">Completed</span>
          </Link>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="no-print w-60 bg-white dark:bg-brand-900 border-r border-gray-100 dark:border-brand-800 hidden md:flex flex-col">
      <div className="p-3 pt-4">
        <Link
          href="/background-clearance"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
            pathname === "/background-clearance"
              ? "bg-brand-900 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-brand-800"
          )}
        >
          <LayoutDashboard className="h-4.5 w-4.5" />
          Background Clearance
        </Link>
      </div>

      <div className="px-6 pt-4 pb-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          Clearance Steps
        </p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 pb-4">
        {FORM_STEPS.map((step) => {
          const Icon = iconMap[step.icon];
          const status = progress[step.key] || "NOT_STARTED";
          const isActive = pathname === step.route;

          return (
            <Link
              key={step.key}
              href={step.route}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150",
                isActive
                  ? "bg-brand-900 text-white font-medium shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-brand-800 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white/70" : "text-gray-400")} />
              <span className="flex-1 truncate">{step.title}</span>
              {!isActive && <StatusIcon status={status} />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
