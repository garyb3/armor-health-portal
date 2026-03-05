"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { drugScreenSchema, type DrugScreenInput } from "@/schemas/drug-screen";
import { FormField } from "@/components/forms/form-field";
import { StateSelect } from "@/components/forms/state-select";
import { FormActions } from "@/components/forms/form-actions";
import {
  PrintableForm,
  PrintField,
} from "@/components/forms/printable-form";
import { useAutoSave } from "@/hooks/use-auto-save";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function DrugScreenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [submittedData, setSubmittedData] = useState<DrugScreenInput | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

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
          if (data.status === "COMPLETED") {
            setIsCompleted(true);
            setSubmittedData(data.formData);
            setSubmittedAt(data.submittedAt);
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
        window.location.href = "/onboarding";
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

  if (isCompleted && submittedData) {
    return (
      <PrintableForm
        title="LabCorp Drug Screen — Donor Authorization"
        applicantName={`${submittedData.donorFirstName} ${submittedData.donorLastName}`}
        submittedAt={submittedAt || undefined}
      >
        <div className="bg-gray-50 p-4 rounded-md mb-6 text-sm">
          <p className="font-semibold">LabCorp Account #: 034738-NON-DOT</p>
          <p>Account Name: ARMOR HEALTH OF OHIO</p>
          <p>Test: PROFILE 2 (1665870002) — Urine, Non-Federal</p>
          <p>Reason: Pre-Employment</p>
          <p>Contact: Heather Poarch, 786-714-0256</p>
        </div>
        <PrintField label="First Name" value={submittedData.donorFirstName} />
        <PrintField label="Last Name" value={submittedData.donorLastName} />
        <PrintField label="Middle Name" value={submittedData.donorMiddleName} />
        <PrintField label="Date of Birth" value={submittedData.dateOfBirth} />
        <PrintField label="Phone" value={submittedData.phoneNumber} />
        <PrintField label="Email" value={submittedData.email} />
        <PrintField label="Address" value={submittedData.address} />
        <PrintField
          label="City, State, ZIP"
          value={`${submittedData.city}, ${submittedData.state} ${submittedData.zipCode}`}
        />
        <PrintField
          label="Government ID"
          value={`${submittedData.governmentIdType?.replace("_", " ")} — ${submittedData.governmentIdNumber}`}
        />
        <PrintField label="Employer" value={submittedData.employerName} />
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
          <p className="font-medium">Instructions for Donor:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
            <li>Print this form and bring to any LabCorp collection site</li>
            <li>Bring a valid photo ID (driver&apos;s license, passport, etc.)</li>
            <li>No appointment needed — walk-in available</li>
          </ul>
        </div>
      </PrintableForm>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          LabCorp Drug Screen
        </h1>
        <p className="text-gray-500 mt-1">
          Complete your donor information for the pre-employment drug screening.
        </p>
      </div>

      {/* LabCorp info box */}
      <Card className="mb-6 border-gray-200 bg-gray-50">
        <CardContent className="p-4 text-sm">
          <p className="font-semibold text-brand-700">
            LabCorp Account #: 034738-NON-DOT
          </p>
          <p className="text-brand-600">
            Test: PROFILE 2 (1665870002) — Urine, Non-Federal | Pre-Employment
          </p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} onChange={debouncedSave}>
        <Card>
          <CardHeader>
            <CardTitle>Donor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                label="First Name"
                name="donorFirstName"
                required
                register={register}
                errors={errors}
              />
              <FormField
                label="Middle Name"
                name="donorMiddleName"
                register={register}
                errors={errors}
              />
              <FormField
                label="Last Name"
                name="donorLastName"
                required
                register={register}
                errors={errors}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                required
                register={register}
                errors={errors}
              />
              <FormField
                label="Phone Number"
                name="phoneNumber"
                type="tel"
                required
                register={register}
                errors={errors}
              />
            </div>
            <FormField
              label="Email"
              name="email"
              type="email"
              required
              register={register}
              errors={errors}
            />
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Street Address"
              name="address"
              required
              register={register}
              errors={errors}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                label="City"
                name="city"
                required
                register={register}
                errors={errors}
              />
              <StateSelect
                label="State"
                name="state"
                required
                register={register}
                errors={errors}
              />
              <FormField
                label="ZIP Code"
                name="zipCode"
                required
                placeholder="43215"
                register={register}
                errors={errors}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Identification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="governmentIdType" required>
                ID Type
              </Label>
              <select
                id="governmentIdType"
                {...register("governmentIdType")}
                className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="">Select ID type...</option>
                <option value="drivers_license">Driver&apos;s License</option>
                <option value="passport">Passport</option>
                <option value="state_id">State ID</option>
                <option value="military_id">Military ID</option>
              </select>
              {errors.governmentIdType && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.governmentIdType.message}
                </p>
              )}
            </div>
            <FormField
              label="ID Number"
              name="governmentIdNumber"
              required
              register={register}
              errors={errors}
            />
          </CardContent>
        </Card>

        <Card className="mt-4">
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
