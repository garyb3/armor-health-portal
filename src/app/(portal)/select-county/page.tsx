"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Loader2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { COUNTIES, COUNTY_SLUGS, isValidCountySlug } from "@/lib/counties";

interface MeUser {
  role: string;
  countySlugs: string[];
}

export default function SelectCountyPage() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser({
            role: data.user.role,
            countySlugs: data.user.countySlugs ?? [],
          });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-900 text-sm">Unable to load your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // HR/ADMIN see every active county; COUNTY_REP sees only assigned ones.
  const isStaffGlobal = user.role === "HR" || user.role === "ADMIN";
  const visibleSlugs = isStaffGlobal
    ? [...COUNTY_SLUGS]
    : user.countySlugs.filter(isValidCountySlug);

  if (visibleSlugs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Select a county
          </h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Building2 className="h-12 w-12 text-gray-900 mx-auto" />
            <p className="text-gray-900 text-sm">
              No counties have been assigned to your account. Please contact your
              administrator to be granted access.
            </p>
            <Button variant="outline" size="sm" onClick={logout}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Select a county
        </h1>
        <p className="text-sm text-gray-900 mt-1">
          {isStaffGlobal
            ? "Choose the county you want to work in."
            : "Choose a county to continue."}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {visibleSlugs.map((slug) => {
          const cfg = COUNTIES[slug];
          return (
            <Link
              key={slug}
              href={`/${slug}/pipeline`}
              className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <Card className="hover:border-accent-300 hover:shadow-md transition">
                <CardContent className="p-5 flex items-start gap-3">
                  <div className="rounded-lg p-2 bg-accent-50 text-accent-700">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {cfg.displayName}
                    </p>
                    <p className="text-xs text-gray-900 mt-0.5 truncate">
                      {cfg.sheriffOfficeAddress}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
