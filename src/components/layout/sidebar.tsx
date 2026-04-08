"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

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
    </aside>
  );
}
