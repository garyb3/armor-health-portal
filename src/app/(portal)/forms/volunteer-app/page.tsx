"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, FileText, Download, CheckCircle2 } from "lucide-react";
import {
  volunteerAppSchema,
  type VolunteerAppInput,
} from "@/schemas/volunteer-app";
import { FormActions } from "@/components/forms/form-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VolunteerAppPage() {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<VolunteerAppInput>({
    resolver: zodResolver(volunteerAppSchema),
  });

  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch("/api/forms/volunteer-app");
        if (res.ok) {
          const data = await res.json();
          if (data.formData) {
            reset(data.formData);
          }
          if (
            data.status === "COMPLETED" ||
            data.status === "PENDING_REVIEW" ||
            data.status === "APPROVED"
          ) {
            setIsCompleted(true);
          }
        }
      } catch (err) {
        console.error("Failed to load form:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSaved();
  }, [reset]);

  const saveDraft = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/forms/volunteer-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: getValues(), action: "save_draft" }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data: VolunteerAppInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/forms/volunteer-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: data, action: "submit" }),
      });
      if (res.ok) {
        window.location.href = "/background-clearance";
        return;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-800">
              Application Submitted
            </h2>
            <p className="text-green-700 mt-2">
              You confirmed that the Volunteer & Professional Services
              Application has been sent to the Franklin County Sheriff&apos;s
              Office. This step is now pending admin review.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Complete & Return the Clearance Form
        </h1>
        <p className="text-gray-500 mt-1">
          Download the Volunteer & Professional Services Application, complete
          it, and send it directly to the Franklin County Sheriff&apos;s Office.
        </p>
      </div>

      {/* Download Section */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Download Application Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700 mb-4">
            Download, print, and complete the application below. If you are
            signing electronically,{" "}
            <strong>check the small box below your signature.</strong>
          </p>
          <Button asChild variant="outline" className="gap-2">
            <a
              href="/forms/VOLUNTEER_AND_PROFESSIONAL_SERVICES_APPLICATION__REV_2025-12_.pdf"
              download
            >
              <Download className="h-4 w-4" />
              Download Application (PDF)
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Download and complete the application form above.</li>
            <li>
              If signing electronically, check the small box below your
              signature.
            </li>
            <li>
              Email the completed form to the{" "}
              <strong>Franklin County Sheriff&apos;s Office</strong>.
            </li>
          </ol>
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>Important:</strong> Do not send this form to Armor Health.
              Send it directly to Franklin County. We do not store Social
              Security information.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Confirmation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="confirmationSent"
                {...register("confirmationSent")}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
              />
              <label
                htmlFor="confirmationSent"
                className="text-sm text-gray-700"
              >
                I have downloaded, completed, and sent the Volunteer &
                Professional Services Application to the Franklin County
                Sheriff&apos;s Office.
              </label>
            </div>
            {errors.confirmationSent && (
              <p className="mt-1 text-xs text-red-600">
                {errors.confirmationSent.message}
              </p>
            )}
          </CardContent>
        </Card>

        <FormActions
          onSaveDraft={saveDraft}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
        />
      </form>
    </div>
  );
}
