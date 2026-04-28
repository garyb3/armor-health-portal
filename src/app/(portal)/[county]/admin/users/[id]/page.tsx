"use client";

import { useCallback, useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MapPin, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

interface CountyOption {
  id: string;
  slug: string;
  displayName: string;
}

interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  approved: boolean;
  emailVerified: boolean;
  denied: boolean;
  createdAt: string;
  counties: CountyOption[];
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ county: string; id: string }>;
}) {
  const { county, id } = use(params);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [allCounties, setAllCounties] = useState<CountyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCountyId, setPendingCountyId] = useState<string | null>(null);
  const { confirm } = useConfirm();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setAllCounties(data.allCounties);
      } else {
        toast.error("Failed to load user");
      }
    } catch (err) {
      toast.error(`Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function assign(countyId: string) {
    setPendingCountyId(countyId);
    try {
      const res = await apiFetch(`/api/admin/users/${id}/counties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countyId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(`Failed to assign: ${data.error || res.statusText}`);
        return;
      }
      await load();
      toast.success("County assigned");
    } catch (err) {
      toast.error(`Network error: ${err}`);
    } finally {
      setPendingCountyId(null);
    }
  }

  async function unassign(countyId: string, countyName: string) {
    const ok = await confirm({
      title: `Remove ${countyName}?`,
      description:
        "The user will lose access to this county and be signed out at their next request.",
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!ok) return;
    setPendingCountyId(countyId);
    try {
      const res = await apiFetch(`/api/admin/users/${id}/counties/${countyId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(`Failed to remove: ${data.error || res.statusText}`);
        return;
      }
      await load();
      toast.success("County removed");
    } catch (err) {
      toast.error(`Network error: ${err}`);
    } finally {
      setPendingCountyId(null);
    }
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
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-900 text-sm">User not found.</p>
            <Link
              href={`/${county}/admin`}
              className="inline-flex items-center text-sm text-accent-700 hover:underline mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to users
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assignedIds = new Set(user.counties.map((c) => c.id));
  const unassigned = allCounties.filter((c) => !assignedIds.has(c.id));
  const isCountyRep = user.role === "COUNTY_REP";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/${county}/admin`}
          className="inline-flex items-center text-sm text-accent-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to users
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-3">
          {user.firstName} {user.lastName}
        </h1>
        <p className="text-sm text-gray-900 mt-1">{user.email}</p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-50 text-accent-700">
              {user.role}
            </span>
            {user.approved && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                Approved
              </span>
            )}
            {user.emailVerified ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                Email Verified
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
                Unverified
              </span>
            )}
            {user.denied && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700">
                Denied
              </span>
            )}
          </div>
          <p className="text-xs text-gray-900">
            Registered {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      {isCountyRep && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Assigned counties
            </h2>
            <p className="text-xs text-gray-900 mt-0.5">
              Removing or adding a county signs the user out at their next request.
            </p>
          </div>

          {user.counties.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <MapPin className="h-8 w-8 text-gray-900 mx-auto mb-2" />
                <p className="text-gray-900 text-sm">No counties assigned yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {user.counties.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg p-2 bg-accent-50 text-accent-700">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{c.displayName}</p>
                        <p className="text-xs text-gray-900">{c.slug}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unassign(c.id, c.displayName)}
                      disabled={pendingCountyId === c.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {pendingCountyId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-1.5" />
                      )}
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {unassigned.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold text-gray-900">Add a county</h3>
              <div className="space-y-2">
                {unassigned.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg p-2 bg-gray-100 text-gray-900">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.displayName}</p>
                          <p className="text-xs text-gray-900">{c.slug}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => assign(c.id)}
                        disabled={pendingCountyId === c.id}
                      >
                        {pendingCountyId === c.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1.5" />
                        )}
                        Assign
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isCountyRep && (
        <Card>
          <CardContent className="py-6 px-5">
            <p className="text-sm text-gray-900">
              {user.role === "HR" || user.role === "ADMIN"
                ? "HR and ADMIN users have access to every county; no per-user assignment is needed."
                : "County assignments only apply to COUNTY_REP users."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
