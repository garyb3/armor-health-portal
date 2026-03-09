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
  const isStaff = role === "RECRUITER" || role === "HR" || role === "ADMIN";

  if (isStaff) {
    return (
      <aside className="no-print w-64 bg-white border-r border-gray-200/60 hidden md:flex flex-col">
        <div className="p-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              pathname === "/dashboard"
                ? "bg-accent-50 text-accent-700 border-l-[3px] border-accent-500"
                : "text-gray-600 hover:bg-gray-50 border-l-[3px] border-transparent"
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>
          {role === "ADMIN" && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 mt-0.5",
                pathname === "/admin"
                  ? "bg-accent-50 text-accent-700 border-l-[3px] border-accent-500"
                  : "text-gray-600 hover:bg-gray-50 border-l-[3px] border-transparent"
              )}
            >
              <Users className="h-5 w-5" />
              User Management
            </Link>
          )}
        </div>

        <div className="px-4 pb-2">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-3">
            Stages
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-0.5">
          {FORM_STEPS.map((step) => {
            const Icon = iconMap[step.icon];
            return (
              <Link
                key={step.key}
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all duration-150 border-l-[3px] border-transparent"
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="flex-1 truncate">{step.title}</span>
              </Link>
            );
          })}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all duration-150 border-l-[3px] border-transparent"
          >
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
            <span className="flex-1 truncate">Completed</span>
          </Link>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="no-print w-64 bg-white border-r border-gray-200/60 hidden md:flex flex-col">
      <div className="p-4">
        <Link
          href="/background-clearance"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            pathname === "/background-clearance"
              ? "bg-accent-50 text-accent-700 border-l-[3px] border-accent-500"
              : "text-gray-600 hover:bg-gray-50 border-l-[3px] border-transparent"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          Background Clearance
        </Link>
      </div>

      <div className="px-4 pb-2">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-3">
          Clearance Steps
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-0.5">
        {FORM_STEPS.map((step) => {
          const Icon = iconMap[step.icon];
          const status = progress[step.key] || "NOT_STARTED";
          const isActive = pathname === step.route;

          return (
            <Link
              key={step.key}
              href={step.route}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 border-l-[3px]",
                isActive
                  ? "bg-accent-50 text-accent-700 font-medium border-accent-500"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 border-transparent"
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="flex-1 truncate">{step.title}</span>
              <StatusIcon status={status} />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
