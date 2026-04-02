"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ApplicantProfile } from "@/types";
import { apiFetch } from "@/lib/api-client";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<ApplicantProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Login failed");
          return false;
        }
        setUser(data.user);
        const dest = data.user.role === "COUNTY_REPRESENTATIVE"
          ? "/registration-complete"
          : data.user.role === "ADMIN"
          ? "/admin"
          : ["RECRUITER", "HR", "ADMIN_ASSISTANT"].includes(data.user.role) && !data.user.approved
          ? "/pending-approval"
          : ["RECRUITER", "HR", "ADMIN_ASSISTANT"].includes(data.user.role)
          ? "/pipeline"
          : "/background-clearance";
        router.push(dest);
        return true;
      } catch {
        setError("Network error. Please try again.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const register = useCallback(
    async (formData: {
      email: string;
      password: string;
      confirmPassword: string;
      firstName: string;
      lastName: string;
      role: string;
      phone?: string;
      inviteToken?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Registration failed");
          return false;
        }
        setUser(data.user);
        const dest = data.user.role === "COUNTY_REPRESENTATIVE"
          ? "/registration-complete"
          : data.user.role === "ADMIN"
          ? "/admin"
          : ["RECRUITER", "HR", "ADMIN_ASSISTANT"].includes(data.user.role) && !data.user.approved
          ? "/pending-approval"
          : ["RECRUITER", "HR", "ADMIN_ASSISTANT"].includes(data.user.role)
          ? "/pipeline"
          : "/background-clearance";
        router.push(dest);
        return true;
      } catch {
        setError("Network error. Please try again.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  }, [router]);

  return { user, loading, error, login, register, logout, setError };
}
