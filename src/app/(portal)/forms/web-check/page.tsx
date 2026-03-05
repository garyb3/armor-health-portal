"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { webCheckSchema, type WebCheckInput } from "@/schemas/web-check";
import { FormField } from "@/components/forms/form-field";
import { StateSelect } from "@/components/forms/state-select";
import { FormActions } from "@/components/forms/form-actions";
import { SignaturePad } from "@/components/forms/signature-pad";
import {
  PrintableForm,
  PrintField,
} from "@/components/forms/printable-form";
import { useAutoSave } from "@/hooks/use-auto-save";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function WebCheckPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [submittedData, setSubmittedData] = useState<WebCheckInput | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  // SSN stored only in client state for printing — NEVER sent to DB
  const [ssnForPrint, setSsnForPrint] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WebCheckInput>({
    resolver: zodResolver(webCheckSchema),
  });

  const { debouncedSave } = useAutoSave({
    formType: "web-check",
    getValues: useCallback(() => {
      const vals = getValues();
      const { ssn: _ssn, ...rest } = vals;
      return rest;
    }, [getValues]),
    enabled: !isCompleted && !isSubmitting,
  });

  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch("/api/forms/web-check");
        if (res.ok) {
          const data = await res.json();
          if (data.formData) {
            reset(data.formData);
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
      const { ssn: _ssn, ...dataWithoutSSN } = getValues();
      await fetch("/api/forms/web-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: dataWithoutSSN,
          action: "save_draft",
        }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data: WebCheckInput) => {
    setIsSubmitting(true);
    try {
      // Store SSN in client state for printing only
      setSsnForPrint(data.ssn);
      const { ssn: _ssn, ...dataWithoutSSN } = data;

      const res = await fetch("/api/forms/web-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: dataWithoutSSN, action: "submit" }),
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
        title="Nurses Jail — BCI Web Check Form"
        applicantName={`${submittedData.firstName} ${submittedData.lastName}`}
        submittedAt={submittedAt || undefined}
      >
        <div className="bg-gray-50 p-4 rounded-md mb-6 text-sm">
          <p className="font-semibold">Agency: 3MU387 Franklin County Sheriff&apos;s Office</p>
          <p>Fee: $35.00</p>
          <p>Department/Agency: ARMOR Staff</p>
          <p>Run Under: Other (Employment Armor)</p>
          <p>
            Results sent to: Stacie Williamson (614-525-7527) or Janine
            Gillispie (614-525-7149)
          </p>
        </div>
        <PrintField label="Last Name" value={submittedData.lastName} />
        <PrintField label="First Name" value={submittedData.firstName} />
        <PrintField label="Date of Birth" value={submittedData.dateOfBirth} />
        {ssnForPrint && (
          <PrintField label="Social Security Number" value={ssnForPrint} />
        )}
        <PrintField
          label="Address"
          value={`${submittedData.street}, ${submittedData.city}, ${submittedData.state} ${submittedData.zipCode}`}
        />
        <PrintField label="Phone" value={submittedData.phone} />
        <PrintField
          label="Acknowledgment Initials"
          value={submittedData.acknowledgmentInitials}
        />
        <PrintField label="Signature Date" value={submittedData.signatureDate} />
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-600">
          <p className="font-medium mb-1">FBI Privacy Rights Notice:</p>
          <p>
            According to the FBI CJIS Division, the subject of a criminal
            history record has the right to challenge the accuracy and
            completeness of his/her record. The procedure to obtain a change,
            correction, or update of an FBI criminal history record is set forth
            in Title 28, Code of Federal Regulations (CFR), Section 16.34.
          </p>
        </div>
      </PrintableForm>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Web Check Form
        </h1>
        <p className="text-gray-500 mt-1">
          BCI Web Check — Nurses Jail background check form.
        </p>
      </div>

      {/* Agency info */}
      <Card className="mb-6 border-gray-200 bg-gray-50">
        <CardContent className="p-4 text-sm">
          <p className="font-semibold text-brand-700">
            Agency: 3MU387 Franklin County Sheriff&apos;s Office
          </p>
          <p className="text-brand-600">
            Department: ARMOR Staff | Fee: $35.00 | Run Under: Employment Armor
          </p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} onChange={debouncedSave}>
        {/* Personal Info */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Last Name" name="lastName" required register={register} errors={errors} />
              <FormField label="First Name" name="firstName" required register={register} errors={errors} />
            </div>
            <FormField label="Date of Birth" name="dateOfBirth" type="date" required register={register} errors={errors} />
            <div>
              <Label htmlFor="ssn" required>
                Social Security Number
              </Label>
              <p className="text-xs text-amber-600 mb-1">
                For form/PDF only — NOT stored in our database
              </p>
              <input
                id="ssn"
                type="password"
                placeholder="XXX-XX-XXXX"
                {...register("ssn")}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
              {errors.ssn && (
                <p className="mt-1 text-xs text-red-600">{errors.ssn.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Street Address" name="street" required register={register} errors={errors} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="City" name="city" required register={register} errors={errors} />
              <StateSelect label="State" name="state" required register={register} errors={errors} />
              <FormField label="ZIP Code" name="zipCode" required register={register} errors={errors} />
            </div>
            <FormField label="Phone" name="phone" type="tel" required register={register} errors={errors} />
          </CardContent>
        </Card>

        {/* Acknowledgment */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Acknowledgment & Consent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-600">
              <p className="font-medium mb-1">FBI Privacy Rights Notice:</p>
              <p>
                According to the FBI CJIS Division, the subject of a criminal
                history record has the right to challenge the accuracy and
                completeness of his/her record. The procedure to obtain a
                change, correction, or update of an FBI criminal history record
                is set forth in Title 28, Code of Federal Regulations (CFR),
                Section 16.34.
              </p>
            </div>

            <FormField
              label="Acknowledgment Initials"
              name="acknowledgmentInitials"
              required
              placeholder="Your initials"
              register={register}
              errors={errors}
            />

            <SignaturePad
              label="Electronic Signature"
              required
              value={watch("signature")}
              onChange={(sig) => setValue("signature", sig)}
              disabled={isCompleted}
            />

            <FormField
              label="Signature Date"
              name="signatureDate"
              type="date"
              required
              register={register}
              errors={errors}
            />

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consentAcknowledged"
                {...register("consentAcknowledged")}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
              />
              <label htmlFor="consentAcknowledged" className="text-sm text-gray-700">
                I acknowledge and consent to the BCI Web Check background
                screening. I understand the results will be sent to the Franklin
                County Sheriff&apos;s Office and used for employment verification
                with Armor Health.
              </label>
            </div>
            {errors.consentAcknowledged && (
              <p className="text-xs text-red-600">{errors.consentAcknowledged.message}</p>
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
