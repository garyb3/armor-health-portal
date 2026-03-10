"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Download } from "lucide-react";
import { drugScreenSchema, type DrugScreenInput } from "@/schemas/drug-screen";
import { FormField } from "@/components/forms/form-field";
import { FormActions } from "@/components/forms/form-actions";
import { useAutoSave } from "@/hooks/use-auto-save";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LABCORP_PDF_URL = "/Labcorp. New hire drug screen (4) (5).pdf";

export default function DrugScreenPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<DrugScreenInput>({
    resolver: zodResolver(drugScreenSchema),
    defaultValues: {
      employerName: "Armor Health of Ohio",
    },
  });

  const { debouncedSave } = useAutoSave({
    formType: "drug-screen",
    getValues: useCallback(() => getValues(), [getValues]),
    enabled: !isCompleted && !isSubmitting,
  });

  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch("/api/forms/drug-screen");
        if (res.ok) {
          const data = await res.json();
          if (data.formData) {
            reset({ ...data.formData, employerName: "Armor Health of Ohio" });
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
      await fetch("/api/forms/drug-screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: getValues(), action: "save_draft" }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data: DrugScreenInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/forms/drug-screen", {
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            LabCorp Drug Screen
          </h1>
          <p className="text-gray-500 mt-1">
            This form has been submitted.
          </p>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-green-600 font-semibold mb-4">
              Your drug screen acknowledgment has been submitted successfully.
            </p>
            <a
              href={LABCORP_PDF_URL}
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-md hover:bg-accent-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download LabCorp Drug Screen Form
            </a>
          </CardContent>
        </Card>
        <FormActions
          onSaveDraft={saveDraft}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          isCompleted={true}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          LabCorp Drug Screen
        </h1>
        <p className="text-gray-500 mt-1">
          Download the LabCorp drug screen form and acknowledge completion below.
        </p>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Drug Screen Form</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Download the LabCorp drug screen form below. Print it and bring it to any LabCorp collection site along with a valid photo ID.
          </p>
          <a
            href={LABCORP_PDF_URL}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-md hover:bg-accent-600 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download LabCorp Drug Screen Form
          </a>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} onChange={debouncedSave}>
        <Card>
          <CardHeader>
            <CardTitle>Employer</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              label="Employer Name"
              name="employerName"
              register={register}
              errors={errors}
              disabled
            />
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consentAcknowledged"
                {...register("consentAcknowledged")}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
              />
              <label
                htmlFor="consentAcknowledged"
                className="text-sm text-gray-700"
              >
                I acknowledge that I will bring this printed form and a valid
                photo ID to a LabCorp collection site for my pre-employment
                drug screening.
              </label>
            </div>
            {errors.consentAcknowledged && (
              <p className="mt-1 text-xs text-red-600">
                {errors.consentAcknowledged.message}
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
