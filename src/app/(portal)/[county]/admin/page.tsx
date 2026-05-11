"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { XCircle, Loader2, Users, Clock, Trash2, MailCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  approved: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const routeParams = useParams<{ county: string }>();
  const county = routeParams?.county ?? "";
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { confirm } = useConfirm();
  const toast = useToast();

  async function loadUsers(f: string) {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/users?filter=${f}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Rapid filter toggles can have responses land out of order. Drop late responses.
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch(`/api/admin/users?filter=${filter}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setUsers(data.users);
        }
      } catch (err) {
        if (!cancelled) console.error("Failed to load users:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  async function approve(id: string) {
    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/admin/users/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(`Failed to approve: ${data.error || res.statusText}`);
        return;
      }
      await loadUsers(filter);
      toast.success("User approved");
    } catch (err) {
      toast.error(`Network error: ${err}`);
    } finally {
      setActionLoading(null);
    }
  }

  async function deny(id: string) {
    const ok = await confirm({
      title: "Deny this user?",
      description: "The user will be denied access and removed from the staff list.",
      confirmLabel: "Deny",
      variant: "destructive",
    });
    if (!ok) return;
    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/admin/users/${id}/deny`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(`Failed to deny: ${data.error || res.statusText}`);
        return;
      }
      await loadUsers(filter);
      toast.success("User denied");
    } catch (err) {
      toast.error(`Network error: ${err}`);
    } finally {
      setActionLoading(null);
    }
  }

  async function removeUser(id: string) {
    const ok = await confirm({
      title: "Permanently remove user?",
      description: "This cannot be undone. The user's account will be deleted.",
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!ok) return;
    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/admin/users/${id}/delete`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(`Failed to remove: ${data.error || res.statusText}`);
        return;
      }
      await loadUsers(filter);
      toast.success("User removed");
    } catch (err) {
      toast.error(`Network error: ${err}`);
    } finally {
      setActionLoading(null);
    }
  }

  async function verifyEmail(id: string) {
    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/admin/users/${id}/verify-email`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(`Failed to verify email: ${data.error || res.statusText}`);
        return;
      }
      await loadUsers(filter);
      toast.success("Email marked verified");
    } catch (err) {
      toast.error(`Network error: ${err}`);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          User Management
        </h1>
        <p className="text-sm text-gray-900 mt-1">
          Manage user accounts and approval requests
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          <Clock className="h-4 w-4 mr-1.5" />
          Pending
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          <Users className="h-4 w-4 mr-1.5" />
          All Users
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-900 mx-auto mb-3" />
            <p className="text-gray-900 text-sm">
              {filter === "pending"
                ? "No pending approval requests"
                : "No user accounts found"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${county}/admin/users/${u.id}`}
                      className="font-medium text-gray-900 truncate hover:text-accent-700 hover:underline"
                    >
                      {u.firstName} {u.lastName}
                    </Link>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-50 text-accent-700">
                      {u.role}
                    </span>
                    {u.approved && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                        Approved
                      </span>
                    )}
                    {u.emailVerified ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                        Email Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
                        Unverified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 truncate">{u.email}</p>
                  <p className="text-xs text-gray-900 mt-0.5">
                    Registered {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  {!u.emailVerified && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => verifyEmail(u.id)}
                      disabled={actionLoading === u.id}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      {actionLoading === u.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MailCheck className="h-4 w-4 mr-1.5" />
                      )}
                      Verify Email
                    </Button>
                  )}
                  {!u.approved && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => approve(u.id)}
                        disabled={actionLoading === u.id}
                      >
                        {actionLoading === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deny(u.id)}
                        disabled={actionLoading === u.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Deny
                      </Button>
                    </>
                  )}
                  {u.approved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeUser(u.id)}
                      disabled={actionLoading === u.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {actionLoading === u.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1.5" />
                      )}
                      Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
