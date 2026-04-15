"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

export default function PendingApprovalPage() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch("/api/auth/check-approval");
        const data = await res.json();
        if (data.approved) {
          router.push("/pipeline");
        }
      } catch {
        // Silently retry on next interval
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <Card className="w-full max-w-md shadow-xl shadow-gray-200/50 border-gray-200/60">
      <CardContent className="p-8 text-center space-y-6">
        <Image
          src="/armor-health-logo.jpg"
          alt="Armor Health"
          width={180}
          height={60}
          className="mx-auto"
          priority
        />

        <div className="flex items-center justify-center">
          <Clock className="h-12 w-12 text-amber-500" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Account Pending Approval
          </h1>
          <p className="text-sm text-gray-900 mt-3 leading-relaxed">
            Your account has been created but requires administrator approval
            before you can access the portal. Please check back later or contact
            your administrator.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
