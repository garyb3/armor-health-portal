"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, FileCheck, X } from "lucide-react";
import {
  volunteerApplicationSchema,
  type VolunteerApplicationInput,
} from "@/schemas/volunteer-application";
import { FormField } from "@/components/forms/form-field";
import { StateSelect } from "@/components/forms/state-select";
import { FormActions } from "@/components/forms/form-actions";
import {
  PrintableForm,
  PrintField,
} from "@/components/forms/printable-form";
import { SignaturePad } from "@/components/forms/signature-pad";
import { useAutoSave } from "@/hooks/use-auto-save";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function VolunteerApplicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [submittedData, setSubmittedData] =
    useState<VolunteerApplicationInput | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  // SSN stored only in client state for printing — NEVER sent to DB
  const [ssnForPrint, setSsnForPrint] = useState<string>("");
  const [certFile, setCertFile] = useState<string | null>(null);
  const [certUploading, setCertUploading] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VolunteerApplicationInput>({
    resolver: zodResolver(volunteerApplicationSchema),
  });

  const currentAddressDifferent = watch("currentAddressDifferent");

  const { debouncedSave } = useAutoSave({
    formType: "volunteer-application",
    getValues: useCallback(() => {
      const vals = getValues();
      const { ssn, ...rest } = vals;
      return rest;
    }, [getValues]),
    enabled: !isCompleted && !isSubmitting,
  });

  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch("/api/forms/volunteer-application");
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
      const { ssn, ...dataWithoutSSN } = getValues();
      await fetch("/api/forms/volunteer-application", {
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

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertError(null);

    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
      setCertError("Invalid file type. Please upload JPEG, PNG, or PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCertError("File too large. Maximum size is 5MB.");
      return;
    }

    setCertUploading(true);
    try {
      const formData = new FormData();
      formData.append("certification", file);
      const res = await fetch("/api/forms/volunteer-application/upload-certification", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setCertFile(data.filePath);
        setValue("certificationFile", data.filePath);
      } else {
        const err = await res.json();
        setCertError(err.error || "Upload failed");
      }
    } catch {
      setCertError("Upload failed. Please try again.");
    } finally {
      setCertUploading(false);
    }
  };

  const onSubmit = async (data: VolunteerApplicationInput) => {
    setIsSubmitting(true);
    try {
      // Store SSN in client state for printing only
      setSsnForPrint(data.ssn);
      const { ssn, ...dataWithoutSSN } = data;

      const res = await fetch("/api/forms/volunteer-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: dataWithoutSSN, action: "submit" }),
      });
      if (res.ok) {
        router.push("/onboarding");
        return;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isCompleted && submittedData) {
    return (
      <PrintableForm
        title="Volunteer & Professional Services Application"
        applicantName={`${submittedData.firstName} ${submittedData.lastName}`}
        submittedAt={submittedAt || undefined}
      >
        <p className="text-sm text-gray-500 mb-4">
          Franklin County Sheriff&apos;s Office
        </p>
        <PrintField label="Last Name" value={submittedData.lastName} />
        <PrintField label="First Name" value={submittedData.firstName} />
        <PrintField label="Middle Name" value={submittedData.middleName} />
        <PrintField label="Maiden/Alias" value={submittedData.maidenName} />
        <PrintField label="Date of Birth" value={submittedData.dateOfBirth} />
        <PrintField
          label="Place of Birth"
          value={`${submittedData.cityOfBirth}, ${submittedData.stateOfBirth}`}
        />
        {ssnForPrint && (
          <PrintField label="Social Security Number" value={ssnForPrint} />
        )}
        <PrintField label="Phone" value={submittedData.phone} />
        <PrintField
          label="Resident Alien #"
          value={submittedData.residentAlienNumber}
        />
        <PrintField label="Height" value={submittedData.height} />
        <PrintField label="Weight" value={submittedData.weight} />
        <PrintField label="Hair Color" value={submittedData.hairColor} />
        <PrintField label="Eye Color" value={submittedData.eyeColor} />
        <PrintField label="Race" value={submittedData.race} />
        <PrintField label="Sex" value={submittedData.sex} />
        <PrintField
          label="Primary Address"
          value={`${submittedData.primaryStreet}, ${submittedData.primaryCity}, ${submittedData.primaryState} ${submittedData.primaryZip}`}
        />
        {submittedData.currentAddressDifferent && (
          <PrintField
            label="Current Address"
            value={`${submittedData.currentStreet}, ${submittedData.currentCity}, ${submittedData.currentState} ${submittedData.currentZip}`}
          />
        )}
        <PrintField
          label="Professional License"
          value={
            submittedData.professionalLicenseType
              ? `${submittedData.professionalLicenseType} #${submittedData.professionalLicenseNumber} (${submittedData.professionalLicenseState})`
              : undefined
          }
        />
        <PrintField
          label="Incarcerated Acquaintances"
          value={submittedData.hasIncarceratedAcquaintances}
        />
        {submittedData.hasIncarceratedAcquaintances === "yes" && (
          <PrintField
            label="Details"
            value={submittedData.incarceratedAcquaintancesDetails}
          />
        )}
        <PrintField
          label="Signature Date"
          value={submittedData.signatureDate}
        />
      </PrintableForm>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Volunteer & Professional Services Application
        </h1>
        <p className="text-gray-500 mt-1">
          Franklin County Sheriff&apos;s Office — background/warrant check form.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} onChange={debouncedSave}>
        {/* Personal Information */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Last Name" name="lastName" required register={register} errors={errors} />
              <FormField label="First Name" name="firstName" required register={register} errors={errors} />
              <FormField label="Middle Name" name="middleName" register={register} errors={errors} />
            </div>
            <FormField label="Maiden Name / Aliases" name="maidenName" register={register} errors={errors} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Date of Birth" name="dateOfBirth" type="date" required register={register} errors={errors} />
              <FormField label="Phone" name="phone" type="tel" required register={register} errors={errors} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="City of Birth" name="cityOfBirth" required register={register} errors={errors} />
              <StateSelect label="State of Birth" name="stateOfBirth" required register={register} errors={errors} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.ssn && (
                  <p className="mt-1 text-xs text-red-600">{errors.ssn.message}</p>
                )}
              </div>
              <FormField label="Resident Alien Number" name="residentAlienNumber" register={register} errors={errors} />
            </div>
          </CardContent>
        </Card>

        {/* Physical Description */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Physical Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="Height" name="height" required placeholder='e.g. 5&apos;10"' register={register} errors={errors} />
              <FormField label="Weight" name="weight" required placeholder="e.g. 170 lbs" register={register} errors={errors} />
              <FormField label="Hair Color" name="hairColor" required register={register} errors={errors} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="Eye Color" name="eyeColor" required register={register} errors={errors} />
              <FormField label="Race" name="race" required register={register} errors={errors} />
              <div>
                <Label htmlFor="sex" required>Sex</Label>
                <select
                  id="sex"
                  {...register("sex")}
                  className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.sex && <p className="mt-1 text-xs text-red-600">{errors.sex.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary Address */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Primary Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Street Address" name="primaryStreet" required register={register} errors={errors} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="City" name="primaryCity" required register={register} errors={errors} />
              <StateSelect label="State" name="primaryState" required register={register} errors={errors} />
              <FormField label="ZIP Code" name="primaryZip" required register={register} errors={errors} />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="currentAddressDifferent" {...register("currentAddressDifferent")} className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
              <label htmlFor="currentAddressDifferent" className="text-sm text-gray-700">
                My current address is different from my primary address
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Current Address (conditional) */}
        {currentAddressDifferent && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Current Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Street Address" name="currentStreet" register={register} errors={errors} />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField label="City" name="currentCity" register={register} errors={errors} />
                <StateSelect label="State" name="currentState" register={register} errors={errors} />
                <FormField label="ZIP Code" name="currentZip" register={register} errors={errors} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Professional License */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Professional License Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Please provide a copy of your professional license/wall certificate if applicable.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="License Type" name="professionalLicenseType" placeholder="e.g. RN, LPN" register={register} errors={errors} />
              <FormField label="License Number" name="professionalLicenseNumber" register={register} errors={errors} />
              <StateSelect label="State" name="professionalLicenseState" register={register} errors={errors} />
            </div>
            <div>
              <Label>Upload License / Certificate</Label>
              {certFile ? (
                <div className="mt-1 flex items-center gap-3 p-3 bg-green-50 rounded-md border border-green-200">
                  <FileCheck className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-700 flex-1">
                    Uploaded: {certFile.split("/").pop()}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCertFile(null);
                      setValue("certificationFile", "");
                      if (certInputRef.current) certInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="mt-1">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-brand-400 transition-colors"
                    onClick={() => certInputRef.current?.click()}
                  >
                    {certUploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-brand-500 mx-auto" />
                    ) : (
                      <Upload className="h-6 w-6 text-gray-400 mx-auto" />
                    )}
                    <p className="text-sm text-gray-600 mt-2">
                      {certUploading ? "Uploading..." : "Click to upload your license or certificate"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">JPEG, PNG, or PDF — Max 5MB</p>
                  </div>
                  <input
                    ref={certInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleCertUpload}
                    className="hidden"
                  />
                </div>
              )}
              {certError && <p className="mt-1 text-xs text-red-600">{certError}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Incarcerated Acquaintances */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Background Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label required>
                Do you have any acquaintances who are currently incarcerated?
              </Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" value="no" {...register("hasIncarceratedAcquaintances")} className="text-brand-500 focus:ring-brand-500" />
                  No
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" value="yes" {...register("hasIncarceratedAcquaintances")} className="text-brand-500 focus:ring-brand-500" />
                  Yes
                </label>
              </div>
              {errors.hasIncarceratedAcquaintances && (
                <p className="mt-1 text-xs text-red-600">{errors.hasIncarceratedAcquaintances.message}</p>
              )}
            </div>
            {watch("hasIncarceratedAcquaintances") === "yes" && (
              <FormField
                label="If yes, please provide their name, the facility where they are housed, and your relationship to them."
                name="incarceratedAcquaintancesDetails"
                type="textarea"
                register={register}
                errors={errors}
              />
            )}
          </CardContent>
        </Card>

        {/* Signature */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Signature & Consent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignaturePad
              label="Electronic Signature"
              required
              value={watch("signature")}
              onChange={(sig) => setValue("signature", sig)}
              disabled={isCompleted}
            />
            <FormField label="Signature Date" name="signatureDate" type="date" required register={register} errors={errors} />
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="electronicSignatureConsent"
                {...register("electronicSignatureConsent")}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <label htmlFor="electronicSignatureConsent" className="text-sm text-gray-700">
                I certify that all information provided is true and correct. I consent to electronic signature for this application and authorize the Franklin County Sheriff&apos;s Office to conduct a background and warrant check.
              </label>
            </div>
            {errors.electronicSignatureConsent && (
              <p className="mt-1 text-xs text-red-600">{errors.electronicSignatureConsent.message}</p>
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
