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
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FORM_STEPS } from "@/lib/constants";

const iconMap = {
  FlaskConical,
  FileText,
  FileCheck,
  Fingerprint,
  Globe,
};

interface SidebarProps {
  role?: string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="no-print w-60 bg-white dark:bg-brand-900 border-r border-gray-100 dark:border-brand-800 hidden md:flex flex-col">
      <div className="p-3 pt-4">
        <Link
          href="/pipeline"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
            pathname === "/pipeline"
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
              href="/pipeline"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-brand-800 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-150"
            >
              <Icon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="flex-1 truncate">{step.title}</span>
            </Link>
          );
        })}
        <Link
          href="/pipeline"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-brand-800 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-150"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="flex-1 truncate">Completed</span>
        </Link>
      </nav>
    </aside>
  );
}
