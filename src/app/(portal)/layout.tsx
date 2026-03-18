"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { useBackButtonGuard } from "@/hooks/use-back-button-guard";
import { Button } from "@/components/ui/button";
import type { FormStatus } from "@/types";
import { apiFetch } from "@/lib/api-client";

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [progress, setProgress] = useState<Record<string, FormStatus>>({});
  const { showDialog, confirmLeave, cancelLeave } = useBackButtonGuard();

  useEffect(() => {
    // Fetch user info from a cookie-decoded endpoint or parse JWT client-side
    // For simplicity, we'll fetch the progress which implies auth
    async function loadUser() {
      try {
        // Decode user from the auth-token cookie via a simple API call
        const res = await apiFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);

          // Only fetch individual progress for applicant roles
          if (data.user.role !== "RECRUITER" && data.user.role !== "HR" && data.user.role !== "ADMIN" && data.user.role !== "ADMIN_ASSISTANT") {
            const progressRes = await apiFetch(
              `/api/applicants/${data.user.id}/progress`
            );
            if (progressRes.ok) {
              const progressData = await progressRes.json();
              const map: Record<string, FormStatus> = {};
              for (const p of progressData.progress) {
                map[p.formType] = p.status;
              }
              setProgress(map);
            }
          }
        }
      } catch {
        // Will be handled by middleware redirect
      }
    }
    loadUser();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Back-button confirmation dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-brand-800 rounded-xl shadow-2xl p-6 mx-4 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Are you sure you want to go back?
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Any unsaved progress on this page may be lost.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelLeave}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={confirmLeave}
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      )}

      <Sidebar progress={progress} role={user?.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar firstName={user?.firstName} lastName={user?.lastName} role={user?.role} />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-[#f8f9fa] dark:bg-brand-900">
          {children}
        </main>
      </div>
    </div>
  );
}
