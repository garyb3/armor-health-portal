"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2 } from "lucide-react";
import {
  professionalLicenseSchema,
  type ProfessionalLicenseInput,
} from "@/schemas/professional-license";
import { FormActions } from "@/components/forms/form-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

export default function ProfessionalLicensePage() {
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
  } = useForm<ProfessionalLicenseInput>({
    resolver: zodResolver(professionalLicenseSchema),
  });

  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await apiFetch("/api/forms/professional-license");
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
      await apiFetch("/api/forms/professional-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: getValues(), action: "save_draft" }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data: ProfessionalLicenseInput) => {
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/forms/professional-license", {
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
              License Confirmation Submitted
            </h2>
            <p className="text-green-700 mt-2">
              You confirmed that your professional license has been sent to the
              Franklin County Sheriff&apos;s Office. This step is now pending
              admin review.
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
          Send a Copy of Your License
        </h1>
        <p className="text-gray-500 mt-1">
          Email a copy of your nursing or social worker license to the Franklin
          County Sheriff&apos;s Office.
        </p>
      </div>

      {/* Instructions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-3">
            Send a copy (scan or photo) of your valid professional license to
            the Franklin County Sheriff&apos;s Office via email. This is required
            so the county can verify your credentials.
          </p>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm text-gray-600">
              Accepted license types: Nursing license (RN, LPN), Social Worker
              license, or other applicable professional license.
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
                id="licenseSent"
                {...register("licenseSent")}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
              />
              <label htmlFor="licenseSent" className="text-sm text-gray-700">
                I have sent a copy of my professional license to the Franklin
                County Sheriff&apos;s Office.
              </label>
            </div>
            {errors.licenseSent && (
              <p className="mt-1 text-xs text-red-600">
                {errors.licenseSent.message}
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
