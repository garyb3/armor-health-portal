"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
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

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        // Will be handled by middleware redirect
      }
    }
    loadUser();
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar firstName={user?.firstName} lastName={user?.lastName} role={user?.role} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={user?.role} />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-gray-200 dark:bg-brand-900">
          {children}
        </main>
      </div>
    </div>
  );
}
