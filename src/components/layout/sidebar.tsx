"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { getTimeBucket } from "@/lib/time-buckets";

interface StaleCandidate {
  id: string;
  name: string;
  days: number;
}

interface SidebarSummary {
  total: number;
  staleCount: number;
  newCount: number;       // 0-10 days
  attentionCount: number; // 11-20 days
  overdueCount: number;   // 21+ days
  staleCandidates: StaleCandidate[];
}

interface SidebarProps {
  role?: string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [summary, setSummary] = useState<SidebarSummary | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await apiFetch("/api/pipeline");
        if (!res.ok) return;
        const data = await res.json();
        const applicants = data.applicants as { id: string; firstName: string; lastName: string; createdAt: string; currentStage: string; isStale?: boolean }[];
        const now = Date.now();
        let newCount = 0;
        let attentionCount = 0;
        let overdueCount = 0;
        const staleCandidates: StaleCandidate[] = [];
        for (const a of applicants) {
          if (a.currentStage === "COMPLETED") continue;
          const days = Math.floor((now - new Date(a.createdAt).getTime()) / 86_400_000);
          const bucket = getTimeBucket(a.createdAt);
          if (bucket === "new") newCount++;
          else if (bucket === "attention") attentionCount++;
          else overdueCount++;
          if (a.isStale) {
            staleCandidates.push({ id: a.id, name: `${a.firstName} ${a.lastName}`, days });
          }
        }
        staleCandidates.sort((a, b) => b.days - a.days);
        setSummary({
          total: data.summary.total,
          staleCount: data.summary.staleCount ?? 0,
          newCount,
          attentionCount,
          overdueCount,
          staleCandidates,
        });
      } catch {
        // Sidebar summary is non-critical
      }
    }
    loadSummary();
  }, []);

  return (
    <aside className="no-print w-60 bg-gray-200 dark:bg-brand-900 border-r border-gray-100 dark:border-brand-800 hidden md:flex flex-col">
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

      {summary && (
        <div className="px-3 pt-5 pb-2 space-y-5 flex-1 overflow-y-auto">
          {/* Total candidates */}
          <div className="text-center bg-gray-50 dark:bg-brand-800 rounded-xl p-4">
            <div className="text-4xl font-extrabold text-gray-800 dark:text-gray-100 leading-none">
              {summary.total}
            </div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
              Total Candidates
            </div>
          </div>

          {/* Time in process */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">
              Time in Process
            </p>
            <div className="space-y-2">
              <Link
                href="/pipeline/category/new"
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/40 transition-all hover:ring-2 hover:ring-green-400/50",
                  pathname === "/pipeline/category/new" && "ring-2 ring-green-500 shadow-sm"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">0 - 10 days</span>
                </div>
                <span className="text-lg font-bold text-green-700 dark:text-green-400">{summary.newCount}</span>
              </Link>
              <Link
                href="/pipeline/category/attention"
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200/60 dark:border-yellow-800/40 transition-all hover:ring-2 hover:ring-yellow-400/50",
                  pathname === "/pipeline/category/attention" && "ring-2 ring-yellow-500 shadow-sm"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">11 - 20 days</span>
                </div>
                <span className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{summary.attentionCount}</span>
              </Link>
              <Link
                href="/pipeline/category/overdue"
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 transition-all hover:ring-2 hover:ring-red-400/50",
                  pathname === "/pipeline/category/overdue" && "ring-2 ring-red-500 shadow-sm"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-300">21+ days</span>
                </div>
                <span className="text-lg font-bold text-red-700 dark:text-red-400">{summary.overdueCount}</span>
              </Link>
            </div>
          </div>

          {/* Follow-up dropdown */}
          {summary.staleCount > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 overflow-hidden">
              <button
                onClick={() => setFollowUpOpen(!followUpOpen)}
                className="flex items-center gap-2.5 px-3 py-3 w-full text-left cursor-pointer"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex-1">
                  {summary.staleCount} Need Follow-up
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 text-amber-600 dark:text-amber-400 transition-transform duration-200",
                  followUpOpen && "rotate-180"
                )} />
              </button>
              {followUpOpen && (
                <div className="px-2 pb-2 space-y-0.5">
                  {summary.staleCandidates.map((c) => (
                    <Link
                      key={c.id}
                      href={`/pipeline/${c.id}`}
                      className="flex items-center justify-between py-2 px-2.5 rounded-lg text-sm hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                    >
                      <span className="text-amber-900 dark:text-amber-200 truncate font-medium">{c.name}</span>
                      <span className="text-amber-600 dark:text-amber-400 shrink-0 ml-2 text-xs font-semibold">{c.days}d</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
