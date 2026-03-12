"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Poll for verification status every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch("/api/auth/check-verification");
        if (res.ok) {
          const data = await res.json();
          if (data.emailVerified) {
            window.location.href = "/dashboard";
          }
        }
      } catch {
        // ignore errors, will retry
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResend = async () => {
    setResendStatus("sending");
    try {
      const res = await apiFetch("/api/auth/resend-verification", { method: "POST" });
      if (res.ok) {
        setResendStatus("sent");
      } else {
        setResendStatus("error");
      }
    } catch {
      setResendStatus("error");
    }
  };

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

        {error ? (
          <>
            <div className="flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Verification Failed
              </h1>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                {error === "invalid-token"
                  ? "This verification link is invalid or has already been used."
                  : error === "missing-token"
                  ? "No verification token was provided."
                  : "Something went wrong. Please try again."}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center">
              <Mail className="h-12 w-12 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Check Your Email
              </h1>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                We&apos;ve sent a verification link to your email address.
                Please click the link to verify your account.
              </p>
            </div>
          </>
        )}

        <div className="space-y-3">
          {resendStatus === "sent" ? (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Verification email resent!
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resendStatus === "sending"}
            >
              {resendStatus === "sending" ? "Sending..." : "Resend Verification Email"}
            </Button>
          )}
          {resendStatus === "error" && (
            <p className="text-xs text-red-500">
              Please wait a minute before requesting another email.
            </p>
          )}
          <Button
            variant="ghost"
            className="w-full text-gray-500"
            onClick={async () => {
              await apiFetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/";
            }}
          >
            Back to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
